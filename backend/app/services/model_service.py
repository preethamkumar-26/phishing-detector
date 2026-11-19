import json
import os
import uuid
from pathlib import Path
from typing import Any

import joblib
import torch
from transformers import AutoTokenizer, DebertaV2Config

from app.core.config import settings
from app.core.logging import logger
from app.services.domain_reputation import LocalDomainReputation, default_reputation
from app.services.preprocessing import EmailPreprocessor
from app.services.verification import fuse_risk, verify_email
from saved_models.predict import (
    PAHFNetInference,
    build_feature_vectors,
    build_token_ids,
    parse_raw_email,
)


class ModelService:
    def __init__(self) -> None:
        self.is_ready = False
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.engine_type = "PAHF-Net"
        self.model_name = "pahf_net.pt"
        self.model: PAHFNetInference | None = None
        self.regime_t: dict[str, torch.Tensor] | None = None
        self.regime_f: dict[str, torch.Tensor] | None = None
        self.tokenizer: Any = None
        self.features_base: dict[str, Any] | None = None
        self.features_t: dict[str, Any] | None = None
        self.features_f: dict[str, Any] | None = None
        self.config: dict[str, Any] | None = None
        self.encoder_config: DebertaV2Config | None = None
        self.reputation: LocalDomainReputation = default_reputation

    def load_model(self) -> None:
        self.is_ready = False
        torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
        model_dir = settings.model_dir_path
        required_assets = (
            settings.MODEL_FILENAME,
            "pahf_net_regime_T.pt",
            "pahf_net_regime_F.pt",
            "features.joblib",
            "features_regime_T.joblib",
            "features_regime_F.joblib",
            "config.json",
        )
        missing_assets = [name for name in required_assets if not (model_dir / name).is_file()]
        if not (model_dir / "tokenizer").is_dir():
            missing_assets.append("tokenizer/")
        if missing_assets:
            raise FileNotFoundError(
                f"PAHF-Net assets are missing from {model_dir}: {', '.join(missing_assets)}"
            )

        with (model_dir / "config.json").open(encoding="utf-8") as config_file:
            config = json.load(config_file)

        features_base: dict[str, Any] = joblib.load(model_dir / "features.joblib")
        features_t: dict[str, Any] = joblib.load(model_dir / "features_regime_T.joblib")
        features_f: dict[str, Any] = joblib.load(model_dir / "features_regime_F.joblib")
        self._validate_feature_assets(config, features_base, features_t, features_f)
        self.features_base = features_base
        self.features_t = features_t
        self.features_f = features_f

        self.tokenizer = AutoTokenizer.from_pretrained(
            str(model_dir / "tokenizer"),
            local_files_only=True,
        )
        if self.tokenizer.cls_token_id is None or self.tokenizer.sep_token_id is None:
            raise ValueError("The local PAHF-Net tokenizer must define CLS and SEP tokens.")

        self.encoder_config = self._create_encoder_config()
        model_config = self._model_config(config, features_base)
        model = PAHFNetInference(model_config, encoder_config=self.encoder_config).to(self.device)
        checkpoint = self._load_checkpoint(model_dir / settings.MODEL_FILENAME)
        model.load_state_dict(checkpoint["model"], strict=True)
        model.eval()
        self.model = model
        del checkpoint

        self.regime_t = self._load_regime_weights(
            model_dir / "pahf_net_regime_T.pt",
            features_t,
            config,
        )
        self.regime_f = self._load_regime_weights(
            model_dir / "pahf_net_regime_F.pt",
            features_f,
            config,
        )

        # Load strictly offline domain reputation snapshot (Tranco Top-1M + optional blocklist)
        default_reputation.max_rank = int(getattr(settings, "TRANCO_MAX_RANK", 1_000_000))
        default_reputation.load_from_directory(
            model_dir=model_dir,
            tranco_filename=str(getattr(settings, "TRANCO_SNAPSHOT_FILENAME", "tranco_top1m.csv.gz")),
            blocklist_filename=str(getattr(settings, "OFFLINE_PHISH_LIST_FILENAME", "offline_phish_domains.txt")),
        )
        self.reputation = default_reputation

        self.config = config
        self.model_name = str(config["model_name"])
        self.is_ready = True
        logger.info(
            "Loaded PAHF-Net base and T/F regime weights, feature assets, local tokenizer, "
            f"and offline reputation store ({self.reputation.tranco_count:,} domains) on {self.device}."
        )

    def load_models(self) -> None:
        self.load_model()

    @staticmethod
    def _create_encoder_config() -> DebertaV2Config:
        config = DebertaV2Config(
            vocab_size=128100,
            hidden_size=768,
            num_hidden_layers=12,
            num_attention_heads=12,
            intermediate_size=3072,
            max_position_embeddings=512,
            relative_attention=True,
            max_relative_positions=256,
            pos_att_type="p2c|c2p",
            position_biased_input=False,
            type_vocab_size=0,
            layer_norm_eps=1e-7,
        )
        setattr(config, "position_buckets", 256)
        setattr(config, "norm_rel_ebd", "layer_norm")
        setattr(config, "share_att_key", True)
        return config

    def _model_config(
        self,
        config: dict[str, Any],
        feature_data: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            **config,
            "n_benign_sources": len(feature_data["benign_sources"]),
            "n_mal_sources": len(feature_data["mal_sources"]),
        }

    def _validate_feature_assets(
        self,
        config: dict[str, Any],
        features_base: dict[str, Any],
        features_t: dict[str, Any],
        features_f: dict[str, Any],
    ) -> None:
        expected_dims = config["dims"]
        for name, feature_data in (
            ("base", features_base),
            ("regime T", features_t),
            ("regime F", features_f),
        ):
            if feature_data is None or feature_data.get("dims") != expected_dims:
                raise ValueError(f"PAHF-Net {name} feature dimensions do not match config.json.")
            for branch in ("url", "struct", "ling"):
                scaler = feature_data.get(f"scaler_{branch}")
                if scaler is None or getattr(scaler, "n_features_in_", None) != expected_dims[branch]:
                    raise ValueError(f"PAHF-Net {name} {branch} feature scaler has incompatible dimensions.")

    @staticmethod
    def _load_checkpoint(path: Path) -> dict[str, Any]:
        checkpoint = torch.load(
            path,
            map_location="cpu",
            weights_only=True,
            mmap=True,
        )
        if not isinstance(checkpoint, dict) or not isinstance(checkpoint.get("model"), dict):
            raise ValueError(f"PAHF-Net checkpoint does not contain a model state dict: {path.name}")
        return checkpoint

    def _load_regime_weights(
        self,
        path: Path,
        feature_data: dict[str, Any],
        config: dict[str, Any],
    ) -> dict[str, torch.Tensor]:
        if self.encoder_config is None:
            raise RuntimeError("PAHF-Net regime feature or encoder configuration is not initialized.")

        checkpoint = self._load_checkpoint(path)
        state = checkpoint["model"]
        model_config = self._model_config(config, feature_data)
        with torch.device("meta"):
            template = PAHFNetInference(model_config, encoder_config=self.encoder_config)
        expected = template.state_dict()
        if state.keys() != expected.keys():
            raise ValueError(f"PAHF-Net checkpoint state keys do not match {path.name}.")
        incompatible_shapes = [
            name
            for name, tensor in state.items()
            if tensor.shape != expected[name].shape
        ]
        if incompatible_shapes:
            raise ValueError(
                f"PAHF-Net checkpoint tensors do not match {path.name}: "
                f"{', '.join(incompatible_shapes[:5])}"
            )

        del checkpoint, template, expected
        return state

    @staticmethod
    def _headers_text(headers: dict[str, Any] | str | None) -> str:
        if isinstance(headers, str):
            return headers.strip()
        if isinstance(headers, dict):
            return "\n".join(f"{key}: {value}" for key, value in headers.items())
        return ""

    @staticmethod
    def _urls_text(urls: list[str] | str | None) -> str:
        if isinstance(urls, str):
            return urls.strip()
        if isinstance(urls, list):
            return "\n".join(url.strip() for url in urls if url.strip())
        return ""

    @classmethod
    def _urls_list(cls, urls: list[str] | str | None) -> list[str]:
        raw = cls._urls_text(urls)
        if not raw:
            return []
        extracted = EmailPreprocessor.extract_urls(raw)
        if extracted:
            return extracted
        return [line.strip() for line in raw.splitlines() if line.strip()]

    @classmethod
    def _email_text(
        cls, text: str, subject: str, urls: list[str] | str | None
    ) -> str:
        body = text.strip()
        existing_urls = set(EmailPreprocessor.extract_urls(f"{subject}\n{body}"))
        additional_urls = []
        for url in EmailPreprocessor.extract_urls(cls._urls_text(urls)):
            if url not in existing_urls:
                additional_urls.append(url)
                existing_urls.add(url)
        return "\n".join(part for part in (body, "\n".join(additional_urls)) if part)

    def predict(
        self,
        text: str,
        subject: str = "",
        sender: str = "",
        reply_to: str = "",
        urls: list[str] | str | None = None,
        headers: dict[str, Any] | str | None = None,
    ) -> dict[str, Any]:
        if not self.is_ready or self.model is None or self.tokenizer is None:
            raise RuntimeError("PAHF-Net is not loaded or initialized.")
        if (
            self.config is None
            or self.features_base is None
            or self.encoder_config is None
        ):
            raise RuntimeError("PAHF-Net inference assets are not initialized.")

        header_text = self._headers_text(headers)
        email_text = self._email_text(text, subject, urls)
        explicit_urls = self._urls_list(urls)

        raw_email = (
            f"Subject: {subject.strip()}\n"
            f"From: {sender.strip()}\n"
            f"Reply-To: {reply_to.strip()}\n"
            f"{header_text}\n\n"
            f"{email_text}"
        )
        record = parse_raw_email(raw_email)
        x_url, x_struct, x_ling = build_feature_vectors(record, self.features_base)
        token_ids = build_token_ids(record, self.config, self.tokenizer)

        input_ids = torch.tensor([token_ids], dtype=torch.long, device=self.device)
        attention_mask = torch.ones_like(input_ids)
        availability = torch.ones((1, 4), dtype=torch.float32, device=self.device)
        with torch.inference_mode():
            logits, gates = self.model(
                input_ids,
                attention_mask,
                torch.from_numpy(x_url).to(self.device),
                torch.from_numpy(x_struct).to(self.device),
                torch.from_numpy(x_ling).to(self.device),
                availability,
            )

        # Layer 1: Calibrated neural content probability from PAHF-Net
        temperature = float(self.config["temperature"])
        p_content = float(torch.sigmoid(logits.float() / temperature).item())
        threshold_low = float(self.config["thr_low"])
        threshold_high = float(self.config["thr_high"])

        # Layer 2: Strictly offline sender, destination, header, and coercion verification
        verification = verify_email(
            subject=subject,
            body=email_text,
            sender=sender,
            reply_to=reply_to,
            urls=explicit_urls,
            headers=headers,
            reputation=self.reputation,
        )

        # Layer 3: Calibrated risk fusion (never dampens when any hard red flag exists)
        decision = fuse_risk(
            p_content=p_content,
            verification=verification,
            threshold_low=threshold_low,
            threshold_high=threshold_high,
        )

        p_phish = decision.p_final
        verdict = decision.verdict
        is_phishing = decision.is_phishing
        risk_score = round(p_phish * 100, 2)

        evidence = EmailPreprocessor.extract_all_features(
            content=email_text,
            subject=subject,
            sender=f"{sender}\n{reply_to}",
        )
        gate_values = gates[0].detach().cpu().tolist()
        feature_contributions = {
            name: round(float(value), 4)
            for name, value in zip(("text", "url", "structure", "linguistic"), gate_values)
        }
        severity = "critical" if risk_score >= 70 else "high" if risk_score >= 40 else "low"

        indicators: list[dict[str, Any]] = []
        seen_ids: set[str] = set()
        for item in (
            list(verification.hard_red_flags)
            + list(verification.soft_warnings)
            + list(evidence["indicators"])
            + list(verification.positive_signals)
        ):
            item_id = str(item.get("id", ""))
            if item_id and item_id in seen_ids:
                continue
            if item_id:
                seen_ids.add(item_id)
            indicators.append(item)

        indicators.append(
            {
                "id": "IND-PAHF-NET",
                "title": "PAHF-Net classification",
                "description": (
                    f"Fused phishing probability: {p_phish:.4f} "
                    f"(PAHF-Net content score: {p_content:.4f})"
                ),
                "severity": severity,
                "category": "model",
                "score_impact": risk_score,
            }
        )

        if decision.decision_basis == "offline_verified_aligned_commercial_or_transactional":
            summary = (
                f"Classified as Safe ({risk_score:.1f}% risk). PAHF-Net flagged promotional or "
                f"financial wording ({p_content:.1%}), but sender '{verification.sender_domain}' "
                f"and link destinations are verified via offline reputation with zero spoofing flags."
            )
        elif decision.decision_basis == "aligned_unranked_needs_header_check":
            summary = (
                f"Classified as Suspicious ({risk_score:.1f}% risk). Promotional or financial wording "
                f"was detected from unranked domain '{verification.sender_domain}'. Links align with the "
                f"sender; verify SPF/DKIM/DMARC headers before acting."
            )
        elif decision.decision_basis == "missing_sender_context":
            summary = (
                f"Classified as Suspicious ({risk_score:.1f}% risk). Content phrasing resembles common "
                f"phishing lures, but no sender or headers were provided to verify authenticity."
            )
        else:
            summary = (
                f"PAHF-Net classified this email as {verdict} with "
                f"{p_phish:.1%} phishing probability."
            )

        return {
            "success": True,
            "scan_id": f"SCN-{uuid.uuid4().hex[:8].upper()}",
            "is_phishing": is_phishing,
            "verdict": verdict,
            "confidence_score": p_phish,
            "risk_score": risk_score,
            "p_phish": p_phish,
            "indicators": indicators,
            "explainability": {
                "summary": summary,
                "flagged_tokens": evidence["flagged_tokens"],
                "url_signals": evidence["url_signals"],
                "feature_contributions": feature_contributions,
                "raw_model_probability": round(p_content, 6),
                "decision_basis": decision.decision_basis,
                "verification": verification.to_dict(),
            },
        }


model_service = ModelService()