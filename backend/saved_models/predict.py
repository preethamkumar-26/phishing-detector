#!/usr/bin/env python3
"""PAHF-Net Standalone Inference Script (predict.py) — Supports .eml files or raw text."""
import os, re, json, math, string, argparse, email
from pathlib import Path
from email import policy
import numpy as np, joblib, torch, torch.nn as nn, torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel, AutoConfig

MASK_RULES = [
    (re.compile(r"\[(SENDER|RECEIVER)\]"), "[NAME]"),
    (re.compile(r"\[ACTION_LINK\]"), "[URL]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[EMAIL_ADDRESS]"),
    (re.compile(r"https?://\S+|www\.\S+"), "[URL]"),
    (re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"), "[IP_ADDRESS]"),
    (re.compile(r"\b(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b"), "[PHONE_NUMBER]"),
    (re.compile(r"[$€£]\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:USD|EUR|GBP|dollars?)\b", re.I), "[FINANCIAL_INFO]"),
    (re.compile(r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b", re.I), "[DATE]"),
    (re.compile(r"\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm|UTC|EST|PST|CST)?\b"), "[TIME]"),
]
URL_EXTRACT = re.compile(r"https?://([^\s/$.?#].[^\s]*)|www\.([^\s/$.?#].[^\s]*)", re.I)
PH_PAT = re.compile(r"\[[A-Z_]+\]|<[A-Z_]+>")
FIN_PAT = re.compile(r"\b(payment|invoice|transfer|bank|account|billing|wire|fund)\b", re.I)
CRED_PAT = re.compile(r"\b(login|password|verify|credential|signin|authenticate|suspended)\b", re.I)
URG_PAT = re.compile(r"\b(urgent|immediately|24 hours|expire|action required|asap|deadline)\b", re.I)
ACT_PAT = re.compile(r"\b(click|follow|open|confirm|update|submit|download|review)\b", re.I)
PUNCT_SET = set(string.punctuation)

def mask_text(s):
    s = str(s)
    for pat, repl in MASK_RULES: s = pat.sub(repl, s)
    return s

class BranchMLP(nn.Module):
    def __init__(self, d_in, d_mid=64, d_out=32, dropout=0.2):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(d_in, d_mid), nn.LayerNorm(d_mid), nn.GELU(), nn.Dropout(dropout), nn.Linear(d_mid, d_out), nn.GELU())
    def forward(self, x): return self.net(x)

class AvailabilityGatedFusion(nn.Module):
    def __init__(self, d_text=256, d_branch=32, d_fuse=128, dropout=0.2):
        super().__init__()
        self.p_text = nn.Sequential(nn.Linear(d_text, d_fuse), nn.LayerNorm(d_fuse), nn.GELU())
        self.p_url = nn.Sequential(nn.Linear(d_branch, d_fuse), nn.LayerNorm(d_fuse), nn.GELU())
        self.p_struct = nn.Sequential(nn.Linear(d_branch, d_fuse), nn.LayerNorm(d_fuse), nn.GELU())
        self.p_ling = nn.Sequential(nn.Linear(d_branch, d_fuse), nn.LayerNorm(d_fuse), nn.GELU())
        self.gate_scorers = nn.ModuleList([nn.Sequential(nn.Linear(d_fuse + d_fuse + 4, 32), nn.GELU(), nn.Dropout(dropout), nn.Linear(32, 1)) for _ in range(4)])
    def forward(self, h_text, h_url, h_struct, h_ling, m_avail):
        Z = torch.stack([self.p_text(h_text), self.p_url(h_url), self.p_struct(h_struct), self.p_ling(h_ling)], dim=1)
        m = m_avail.clone(); m[:, 0] = 1.0; Z = Z * m.unsqueeze(-1)
        z_ctx = Z.sum(dim=1) / m.sum(dim=1, keepdim=True).clamp(min=1.0)
        gate_logits = torch.cat([self.gate_scorers[i](torch.cat([Z[:, i, :], z_ctx, m], dim=-1)) for i in range(4)], dim=1)
        gate_logits = gate_logits.masked_fill(m <= 0.0, -1e4)
        gates = F.softmax(gate_logits.float(), dim=-1).to(Z.dtype) * m
        gates = gates / gates.sum(dim=-1, keepdim=True).clamp(min=1e-6)
        return (Z * gates.unsqueeze(-1)).sum(dim=1), gates

class PAHFNetInference(nn.Module):
    def __init__(self, cfg, encoder_config=None):
        super().__init__()
        hc = encoder_config or AutoConfig.from_pretrained(cfg["encoder"])
        self.encoder = AutoModel.from_config(hc)
        self.text_proj = nn.Sequential(nn.Linear(hc.hidden_size, 256), nn.LayerNorm(256), nn.GELU(), nn.Dropout(0.2))
        dims = cfg["dims"]
        self.url_enc = BranchMLP(dims["url"], 64, 32, 0.2)
        self.struct_enc = BranchMLP(dims["struct"], 64, 32, 0.2)
        self.ling_enc = BranchMLP(dims["ling"], 64, 32, 0.2)
        self.gated_fusion = AvailabilityGatedFusion(256, 32, 128, 0.2)
        self.classifier = nn.Sequential(nn.Linear(128, 64), nn.GELU(), nn.Dropout(0.2), nn.Linear(64, 1))
        self.disc_benign = nn.Sequential(nn.Linear(128, 64), nn.GELU(), nn.Dropout(0.2), nn.Linear(64, cfg["n_benign_sources"]))
        self.disc_mal = nn.Sequential(nn.Linear(128, 64), nn.GELU(), nn.Dropout(0.2), nn.Linear(64, cfg["n_mal_sources"]))
    def forward(self, input_ids, attention_mask, x_url, x_struct, x_ling, m_avail):
        out = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        mask_f = attention_mask.unsqueeze(-1).float()
        pooled = (out.last_hidden_state.float() * mask_f).sum(dim=1) / mask_f.sum(dim=1).clamp(min=1e-6)
        h_text = self.text_proj(pooled)
        h_u, h_s, h_l = self.url_enc(x_url) * m_avail[:, 1:2], self.struct_enc(x_struct) * m_avail[:, 2:3], self.ling_enc(x_ling) * m_avail[:, 3:4]
        h_fused, gates = self.gated_fusion(h_text, h_u, h_s, h_l, m_avail)
        return self.classifier(h_fused).squeeze(-1), gates

def parse_raw_email(raw_input):
    input_path = None
    if isinstance(raw_input, os.PathLike):
        input_path = Path(raw_input)
    elif isinstance(raw_input, str) and "\n" not in raw_input and len(raw_input) < 4096:
        input_path = Path(raw_input)

    if input_path is not None and input_path.is_file():
        with input_path.open("rb") as input_file:
            msg = email.message_from_bytes(input_file.read(), policy=policy.default)
    elif (
        isinstance(raw_input, str)
        and "\n\n" in raw_input
        and re.search(r"(?im)^(subject|from|content-type|mime-version):", raw_input)
    ):
        msg = email.message_from_string(raw_input, policy=policy.default)
    else:
        msg = None

    if msg is not None:
        subj = str(msg.get("Subject", ""))
        ctypes, att_cnt, body_parts = [], 0, []
        for part in msg.walk():
            ct = part.get_content_type()
            ctypes.append(ct)
            if part.get_content_disposition() == "attachment": att_cnt += 1
            elif ct in ("text/plain", "text/html"):
                try:
                    body_parts.append(part.get_content())
                except (LookupError, TypeError, UnicodeDecodeError):
                    continue
        body = "\n".join(body_parts)
    else:
        lines = str(raw_input).splitlines()
        if lines and lines[0].lower().startswith("subject:"):
            subj = lines[0].split(":", 1)[1].strip(); body = "\n".join(lines[1:]).strip()
        else:
            subj, body = "", str(raw_input)
        ctypes, att_cnt = ["text/plain"], 0
    full_unmasked = subj + " " + body
    urls = [m[0] or ("http://www." + m[1]) for m in URL_EXTRACT.findall(full_unmasked)]
    u_lens = [len(u) for u in urls]
    u_subs = [max(0, u.split("//")[-1].split("/")[0].count(".") - 1) for u in urls]
    return {
        "subject": mask_text(subj), "body": mask_text(body),
        "url_count": len(urls), "url_length_max": max(u_lens) if u_lens else 0.0,
        "url_length_avg": float(np.mean(u_lens)) if u_lens else 0.0,
        "url_subdom_max": max(u_subs) if u_subs else 0.0, "url_subdom_avg": float(np.mean(u_subs)) if u_subs else 0.0,
        "attachment_count": att_cnt, "has_attachments": int(att_cnt > 0), "content_types": ctypes, "language": "en"
    }

def build_feature_vectors(rec, fdict):
    u_raw = np.log1p(np.array([[
        rec["url_count"],
        rec["url_length_max"],
        rec["url_length_avg"],
        rec["url_subdom_max"],
        rec["url_subdom_avg"],
    ]], dtype=np.float32))
    x_url = np.clip(
        fdict["scaler_url"].transform(
            np.hstack([u_raw, [[float(rec["url_count"] > 0)]]])
        ),
        -10,
        10,
    ).astype(np.float32)

    mime_vocab, lang_top = fdict["mime_vocab"], fdict["lang_top"]
    mime_mh = np.array(
        [[1.0 if mime_type in rec["content_types"] else 0.0 for mime_type in mime_vocab]],
        dtype=np.float32,
    )
    lang_oh = np.eye(len(lang_top) + 1, dtype=np.float32)[
        [lang_top.get(rec["language"], len(lang_top))]
    ]
    x_struct = np.clip(
        fdict["scaler_struct"].transform(
            np.hstack((
                [[
                    np.log1p(rec["attachment_count"]),
                    float(rec["has_attachments"]),
                ]],
                mime_mh,
                lang_oh,
            ))
        ),
        -10,
        10,
    ).astype(np.float32)

    text = (rec["subject"] + " " + rec["body"]).strip()
    length = max(len(text), 1)
    ling_raw = np.array([[
        np.log1p(len(FIN_PAT.findall(text))),
        np.log1p(len(CRED_PAT.findall(text))),
        np.log1p(len(URG_PAT.findall(text))),
        np.log1p(len(ACT_PAT.findall(text))),
        np.log1p(len(PH_PAT.findall(text))),
        np.log1p(length),
        sum(char in PUNCT_SET for char in text) / length,
        sum(char.isupper() for char in text) / length,
        length / max(1, len(re.findall(r"[.!?]+", text))),
    ]], dtype=np.float32)
    x_ling = np.clip(fdict["scaler_ling"].transform(ling_raw), -10, 10).astype(np.float32)
    return x_url, x_struct, x_ling

def build_token_ids(rec, cfg, tok):
    text = f"[SUBJECT] {rec['subject']}\n[BODY] {rec['body']}"
    ids = tok(text, add_special_tokens=False, truncation=False)["input_ids"]
    if len(ids) > cfg["head_tokens"] + cfg["tail_tokens"]:
        ids = ids[:cfg["head_tokens"]] + ids[-cfg["tail_tokens"]:]
    return [tok.cls_token_id] + ids[:cfg["max_len"] - 2] + [tok.sep_token_id]

def predict_email(raw_input, model_dir=None):
    if model_dir is None:
        model_dir = Path(__file__).resolve().parent
    else:
        model_dir = Path(model_dir)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with (model_dir / "config.json").open(encoding="utf-8") as config_file:
        cfg = json.load(config_file)
    fdict = joblib.load(model_dir / "features.joblib")
    tok = AutoTokenizer.from_pretrained(str(model_dir / "tokenizer"))
    rec = parse_raw_email(raw_input)

    x_url, x_struct, x_ling = build_feature_vectors(rec, fdict)
    m_avail = np.array([[1.0, 1.0, 1.0, 1.0]], dtype=np.float32)

    seq = build_token_ids(rec, cfg, tok)

    model = PAHFNetInference(cfg).to(device).eval()
    ckpt = torch.load(model_dir / "pahf_net.pt", map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model"])

    with torch.no_grad():
        lg, gt = model(torch.tensor([seq], dtype=torch.long, device=device),
                       torch.ones((1, len(seq)), dtype=torch.long, device=device),
                       torch.from_numpy(x_url).to(device), torch.from_numpy(x_struct).to(device),
                       torch.from_numpy(x_ling).to(device), torch.from_numpy(m_avail).to(device))
    prob = float(1.0 / (1.0 + math.exp(-np.clip(float(lg.item()) / cfg["temperature"], -30.0, 30.0))))
    g = gt[0].cpu().numpy()
    if prob >= cfg["thr_high"]: verdict = "Phishing / Malicious"
    elif prob < cfg["thr_low"]: verdict = "Not phishing (Benign)"
    else: verdict = f"Uncertain (Review Band; binary_verdict={'Phishing' if prob >= cfg['thr_opt_f1'] else 'Not phishing'})"
    return {"verdict": verdict, "calibrated_probability": round(prob, 4),
            "gate_weights": {"text": round(float(g[0]), 4), "url": round(float(g[1]), 4), "structure": round(float(g[2]), 4), "linguistic": round(float(g[3]), 4)}}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("input", help="Path to an email file or raw email text string")
    ap.add_argument("--model_dir", default=None, help="Model directory (defaults to this script's directory)")
    args = ap.parse_args()
    print(json.dumps(predict_email(args.input, args.model_dir), indent=2))
