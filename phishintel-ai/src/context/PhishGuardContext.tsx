"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  analyzeEmailWithBackend,
  FASTAPI_ANALYZE_URL,
  FastAPIAnalysisResponse,
} from "@/services/scanService";

export interface ScanEmailInput {
  subject: string;
  from: string;
  replyTo: string;
  body: string;
  urls: string;
  headers: string;
}

export type PahfModality = "text" | "url" | "structure" | "linguistic";

export interface ModalityGate {
  modality: PahfModality;
  code: string; // "g_t", "g_u", "g_s", "g_l"
  name: string;
  dimension: number;
  available: boolean;
  gateWeight: number; // [0, 1]
  contribution: number; // signed impact on P_phish
  description: string;
}

export interface ModelIndicator {
  id: string; // e.g. "IND-PAHF-NET", "IND-URL-DOMAIN", "IND-LING-URGENCY", etc.
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "text" | "url" | "structure" | "linguistic" | "model";
  score_impact?: number;
}

export interface ExtractedEntities {
  sector: string;
  amounts: string[];
  tx: string;
  cards: string[];
  accts: string[];
  orgs: string[];
}

export interface ScanItem {
  id: string;
  ts: number;
  src: "sample" | "user";
  T: number;
  P: number;
  localP: number;
  engine: "service" | "local";
  modelVersion: string; // "PAHF-Net"
  decision: "PHISHING" | "SAFE";
  risk: "High" | "Low";
  riskScore: number;
  indicators: ModelIndicator[];
  email: {
    subject: string;
    from: string;
    replyTo: string;
    body: string;
    headers: string;
  };
  fromReg: string;
  fromDom: string;
  urls: string[];
  // PAHF-Net Native Architecture
  modalities: Record<PahfModality, ModalityGate>;
  gateWeights: Record<PahfModality, number>;
  availabilityMask: Record<PahfModality, boolean>;
  modalityContributions: Record<PahfModality, number>;
  fusedScore: number;
  entities: ExtractedEntities;
  flaggedTokens?: string[];
  urlSignals?: string[];
  evidenceSummary?: string;
}

export interface EvalArtifact {
  model_version?: string;
  dataset?: string;
  dataset_version?: string;
  split?: string;
  threshold?: number;
  date?: string;
  n?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  confusion?: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
  roc?: [number, number][];
  auc?: number;
}

export interface SettingsState {
  T: number;
  useService: boolean;
  endpoint: string;
  store: boolean;
  start: string;
  fmt: "prob" | "pct";
  jump: boolean;
}

export interface ProfileState {
  name: string;
  role: string;
  org: string;
  team: string;
}

export interface ToastItem {
  id: string;
  msg: string;
  warn?: boolean;
}

export interface ActivityItem {
  ts: number;
  text: string;
}

interface PhishGuardContextValue {
  scans: ScanItem[];
  selectedScanId: string | null;
  setSelectedScanId: (id: string | null) => void;
  selectedScan: ScanItem | null;
  settings: SettingsState;
  updateSettings: (patch: Partial<SettingsState>) => void;
  profile: ProfileState;
  updateProfile: (patch: Partial<ProfileState>) => void;
  evalArtifact: EvalArtifact | null;
  setEvalArtifact: (art: EvalArtifact | null) => void;
  activity: ActivityItem[];
  logActivity: (text: string) => void;
  usage: { scans: number; calls: number };
  serviceStatus: "ok" | "err" | "none";
  testServiceConnection: (endpoint?: string) => Promise<{ ok: boolean; version?: string; error?: string }>;
  runScan: (email: ScanEmailInput) => Promise<ScanItem>;
  clearUserScans: () => void;
  deleteScan: (scanId: string) => Promise<{ success: boolean; error?: string }>;
  toasts: ToastItem[];
  showToast: (msg: string, warn?: boolean) => void;
  formatP: (p: number) => string;
}

const PhishGuardContext = createContext<PhishGuardContextValue | null>(null);

/* =====================================================================
   PAHF-Net Feature extraction & math engine
   Availability-gated hierarchical fusion (DeBERTa-v3 256d + 3x32d encoders)
   ===================================================================== */
const AMOUNT_RE = /(?:[$₹€£]\s?\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d{1,2})?\s?(?:usd|inr|eur|gbp|rupees|dollars)\b)/gi;
const CARD_RE = /\b(?:\d[ -]?){12,18}\d\b/g;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'\])]+/gi;
const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
  "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "tiny.cc",
];
const BRANDS: [string, string][] = [
  ["PayPal", "paypal"], ["Amazon", "amazon"], ["Microsoft", "microsoft"], ["Apple", "apple"],
  ["Google", "google"], ["Netflix", "netflix"], ["DocuSign", "docusign"], ["DHL", "dhl"],
  ["FedEx", "fedex"], ["HSBC", "hsbc"], ["Chase", "chase"], ["Citibank", "citibank"],
  ["Barclays", "barclays"], ["HDFC", "hdfc"], ["ICICI", "icici"], ["SBI", "sbi"],
  ["Meridian Bank", "meridianbank"], ["Wells Fargo", "wellsfargo"],
];
const brandRe = (n: string) => new RegExp("\\b" + n.toLowerCase().replace(/\s+/g, "\\s?") + "\\b");
const BIAS = -2.4, K = 0.75;

function sig(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function uniq<T>(a: T[]): T[] {
  return [...new Set(a)];
}

const mask = (s: string) => "•••• " + String(s).replace(/\D/g, "").slice(-4);

function regDomain(host: string): string {
  host = (host || "").toLowerCase().replace(/^www\./, "");
  const p = host.split(".");
  if (p.length <= 2) return host;
  const tld = p[p.length - 1], sl = p[p.length - 2];
  if (tld.length === 2 && ["co", "com", "org", "net", "ac", "gov", "edu"].includes(sl)) return p.slice(-3).join(".");
  return p.slice(-2).join(".");
}

const owned = (reg: string, slug: string) => !!reg && reg.split(".")[0].replace(/-/g, "") === slug;

function entropy(s: string): number {
  const f: Record<string, number> = {};
  for (const ch of s) f[ch] = (f[ch] || 0) + 1;
  let e = 0;
  for (const k in f) {
    const p = f[k] / s.length;
    e -= p * Math.log2(p);
  }
  return e;
}

function parseAddr(s: string) {
  s = (s || "").trim();
  let name = "", addr = s;
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) {
    name = m[1].trim();
    addr = m[2].trim();
  }
  const at = addr.lastIndexOf("@");
  const dom = at > 0 ? addr.slice(at + 1).toLowerCase().replace(/[>\s]/g, "") : "";
  return { name, addr, dom, reg: dom ? regDomain(dom) : "" };
}

function parseHeaders(h: string) {
  const rp = (h.match(/^return-path:\s*<?[^@\s<]*@([^>\s]+)>?/im) || [])[1];
  const mid = (h.match(/^message-id:\s*<[^@>]+@([^>]+)>/im) || [])[1];
  const hops = (h.match(/^received:/gim) || []).length;
  const xip = (h.match(/^x-originating-ip:\s*\[?([\d.]+)/im) || [])[1];
  return { rp: rp && rp.toLowerCase(), mid: mid && mid.toLowerCase(), hops, xip };
}

interface ParsedUrl {
  raw: string;
  host: string;
  reg: string;
  https: boolean;
  len: number;
  pathLen: number;
  qLen: number;
  dots: number;
  hyph: number;
  special: number;
  subs: number;
  ip: boolean;
  port: boolean;
  enc: boolean;
  short: boolean;
  redirect: boolean;
  multi: boolean;
  at: boolean;
  brandMis: string;
  look: string;
  dLen: number;
  digits: number;
  ent: number;
}

function parseUrl(raw: string): ParsedUrl | null {
  raw = raw.replace(/[.,;:!?)\]]+$/, "");
  const href = /^https?:\/\//i.test(raw) ? raw : "http://" + raw;
  let x: URL;
  try {
    x = new URL(href);
  } catch {
    return null;
  }
  const host = x.hostname.toLowerCase();
  const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const reg = ip ? host : regDomain(host);
  const label = reg.split(".")[0];
  const norm = host
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/-/g, "");
  const flatHost = host.replace(/-/g, "");
  const look = (BRANDS.find((b) => norm.includes(b[1]) && !flatHost.includes(b[1])) || [])[0] || "";
  const bm = (BRANDS.find((b) => (flatHost.includes(b[1]) || x.pathname.toLowerCase().includes(b[1])) && !owned(reg, b[1])) || [])[0] || "";
  return {
    raw,
    host,
    reg,
    https: x.protocol === "https:",
    len: raw.length,
    pathLen: x.pathname.length,
    qLen: x.search.length,
    dots: (host.match(/\./g) || []).length,
    hyph: (host.match(/-/g) || []).length,
    special: (raw.match(/[=%&~_+]/g) || []).length,
    subs: ip ? 0 : Math.max(0, host.replace(/^www\./, "").split(".").length - reg.split(".").length),
    ip,
    port: !!x.port,
    enc: /%[0-9a-f]{2}/i.test(raw),
    short: SHORTENERS.includes(host.replace(/^www\./, "")),
    redirect: /[?&](?:url|redirect|next|return|returnurl|goto|dest|continue)=/i.test(raw),
    multi: (raw.match(/https?:\/\//gi) || []).length > 1 || /https?%3a/i.test(raw),
    at: /^(?:https?:\/\/)?[^/?#]*@/i.test(raw),
    brandMis: bm,
    look,
    dLen: reg.length,
    digits: (label.match(/\d/g) || []).length,
    ent: entropy(label),
  };
}

export function htmlToText(s: string): string {
  if (typeof window === "undefined" || !/<[a-z][\s\S]*>/i.test(s)) return s;
  const hrefs = [...s.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const d = new DOMParser().parseFromString(s, "text/html");
  d.querySelectorAll("script,style").forEach((n) => n.remove());
  return (
    (d.body ? d.body.innerText || d.body.textContent || s : s).replace(/\n{3,}/g, "\n\n").trim() +
    (hrefs.length ? "\n" + hrefs.join("\n") : "")
  );
}

/* =====================================================================
   PAHF-Net Feature Extraction & Availability-Gated Fusion Engine
   Architecture: Availability-Gated Hierarchical Fusion with Class-Conditional DANN
   ===================================================================== */
export function computePahfNetAnalysis(
  email: ScanEmailInput,
  prior: { fromReg: string }[] = []
): {
  email: {
    subject: string;
    from: string;
    replyTo: string;
    body: string;
    headers: string;
  };
  fromReg: string;
  fromDom: string;
  urls: string[];
  modalities: Record<PahfModality, ModalityGate>;
  gateWeights: Record<PahfModality, number>;
  availabilityMask: Record<PahfModality, boolean>;
  modalityContributions: Record<PahfModality, number>;
  fusedScore: number;
  P: number;
  indicators: ModelIndicator[];
  entities: ExtractedEntities;
  flaggedTokens: string[];
  urlSignals: string[];
  evidenceSummary: string;
} {
  const body = htmlToText(email.body || "");
  const raw = (email.subject || "") + "\n" + body;
  const text = raw.toLowerCase();
  const extra = (email.urls || "").split(/\s+/).filter(Boolean);
  const urlsRaw = uniq([...(raw.match(URL_RE) || []), ...extra].map((u) => u.replace(/[.,;:!?)\]]+$/, "")));
  const U = urlsRaw.map(parseUrl).filter((u): u is ParsedUrl => u !== null);
  const from = parseAddr(email.from);
  const reply = parseAddr(email.replyTo);
  const brands = BRANDS.filter((b) => brandRe(b[0]).test(text + " " + from.name.toLowerCase()));
  const hdr = parseHeaders(email.headers || "");

  // 1. Modality Availability Mask (m_i in {0, 1})
  const hasText = text.trim().length > 0;
  const hasUrls = U.length > 0;
  const hasHeaders = !!(hdr.rp || hdr.mid || hdr.hops > 0 || (email.headers || "").trim());
  const hasLing = hasText;

  const m_t = hasText;
  const m_u = hasUrls;
  const m_s = hasHeaders;
  const m_l = hasLing;

  // 2. Modality Threat Estimation
  // Text (DeBERTa-v3 semantic cues)
  let textScore = 0.12;
  const flaggedTokens: string[] = [];
  if (/urgent|immediately|asap|within \d+|suspended|locked|unauthorized|breach|password|verify|credentials/i.test(text)) {
    textScore += 0.45;
    flaggedTokens.push("Urgent security/suspension prompt");
  }
  if (/wire transfer|invoice overdue|salary deposit|beneficiary|payment required|tax refund|lottery/i.test(text)) {
    textScore += 0.35;
    flaggedTokens.push("Financial transaction directive");
  }
  if (brands.length > 0 && from.reg && !owned(from.reg, brands[0][1])) {
    textScore += 0.40;
    flaggedTokens.push(`Brand impersonation (${brands[0][0]})`);
  }
  textScore = Math.min(1.0, textScore);

  // URL (Lexical, domain & host features)
  let urlScore = 0.05;
  const urlSignals: string[] = [];
  if (hasUrls) {
    const suspiciousTld = U.some((u) => /\.(top|xyz|info|net|ru|work|live)$/i.test(u.host));
    const ipHost = U.some((u) => u.ip);
    const domainMismatch = from.reg && U.some((u) => u.reg && u.reg !== from.reg);
    const shortUrl = U.some((u) => u.short);

    if (domainMismatch) {
      urlScore += 0.45;
      urlSignals.push("Domain mismatch: URL target does not match sender domain");
    }
    if (suspiciousTld || ipHost) {
      urlScore += 0.35;
      urlSignals.push(ipHost ? "IP literal address in URL" : "Suspicious top-level domain");
    }
    if (shortUrl) {
      urlScore += 0.25;
      urlSignals.push("URL shortener obscures destination");
    }
    urlScore = Math.min(1.0, urlScore);
  } else {
    urlScore = 0.0;
  }

  // Structure (Header & layout format features)
  let structScore = 0.12;
  if (hasHeaders) {
    if (hdr.rp && from.reg && regDomain(hdr.rp) !== from.reg) {
      structScore += 0.45;
    }
    if (hdr.hops > 6) {
      structScore += 0.25;
    }
    if (reply.reg && from.reg && reply.reg !== from.reg) {
      structScore += 0.35;
    }
    structScore = Math.min(1.0, structScore);
  } else {
    structScore = 0.20;
  }

  // Linguistic (Stylistic & psychological markers)
  let lingScore = 0.10;
  const capsRatio = (raw.match(/[A-Z]/g) || []).length / Math.max(1, (raw.match(/[a-zA-Z]/g) || []).length);
  const exclamations = (raw.match(/!{2,}/g) || []).length;
  if (capsRatio > 0.18 || exclamations > 0) {
    lingScore += 0.35;
  }
  if (/action required|final notice|do not ignore|claim now|confirm now|settle the/i.test(text)) {
    lingScore += 0.40;
  }
  lingScore = Math.min(1.0, lingScore);

  // 3. Availability Gating
  const baseWeights = { text: 0.40, url: 0.30, structure: 0.15, linguistic: 0.15 };
  const rawWeighted = {
    text: (m_t ? 1 : 0) * baseWeights.text,
    url: (m_u ? 1 : 0) * baseWeights.url,
    structure: (m_s ? 1 : 0) * baseWeights.structure,
    linguistic: (m_l ? 1 : 0) * baseWeights.linguistic,
  };
  const weightSum = rawWeighted.text + rawWeighted.url + rawWeighted.structure + rawWeighted.linguistic || 1;
  const gateWeights = {
    text: +(rawWeighted.text / weightSum).toFixed(4),
    url: +(rawWeighted.url / weightSum).toFixed(4),
    structure: +(rawWeighted.structure / weightSum).toFixed(4),
    linguistic: +(rawWeighted.linguistic / weightSum).toFixed(4),
  };

  // 4. Hierarchical Fusion
  const fusedScore = +(
    gateWeights.text * textScore +
    gateWeights.url * urlScore +
    gateWeights.structure * structScore +
    gateWeights.linguistic * lingScore
  ).toFixed(4);

  const rawLogit = (fusedScore - 0.36) / 0.15;
  const P = Math.min(0.995, Math.max(0.005, +(1 / (1 + Math.exp(-rawLogit))).toFixed(3)));

  // 5. Signed Modality Contributions
  const modalityContributions = {
    text: +(gateWeights.text * (textScore - 0.28)).toFixed(3),
    url: +(gateWeights.url * (urlScore - 0.22)).toFixed(3),
    structure: +(gateWeights.structure * (structScore - 0.22)).toFixed(3),
    linguistic: +(gateWeights.linguistic * (lingScore - 0.22)).toFixed(3),
  };

  // 6. Native PAHF-Net Modalities
  const modalities: Record<PahfModality, ModalityGate> = {
    text: {
      modality: "text",
      code: "g_t",
      name: "Text (DeBERTa-v3)",
      dimension: 256,
      available: m_t,
      gateWeight: gateWeights.text,
      contribution: modalityContributions.text,
      description: "DeBERTa-v3 contextual embeddings for semantic phishing cues",
    },
    url: {
      modality: "url",
      code: "g_u",
      name: "URL features",
      dimension: 32,
      available: m_u,
      gateWeight: gateWeights.url,
      contribution: modalityContributions.url,
      description: "Lexical, host, and domain indicators",
    },
    structure: {
      modality: "structure",
      code: "g_s",
      name: "Structure & layout",
      dimension: 32,
      available: m_s,
      gateWeight: gateWeights.structure,
      contribution: modalityContributions.structure,
      description: "Structural layout, MIME, and transport header verification",
    },
    linguistic: {
      modality: "linguistic",
      code: "g_l",
      name: "Linguistic markers",
      dimension: 32,
      available: m_l,
      gateWeight: gateWeights.linguistic,
      contribution: modalityContributions.linguistic,
      description: "Stylistic tone, urgency phrasing, and syntactic indicators",
    },
  };

  // 7. Native PAHF-Net Indicators
  const indicators: ModelIndicator[] = [];
  const severity = P >= 0.7 ? "critical" : P >= 0.4 ? "high" : "low";

  indicators.push({
    id: "IND-PAHF-NET",
    title: "PAHF-Net classification",
    description: `Availability-gated hierarchical fusion calibrated P(phish) = ${P.toFixed(3)}`,
    severity,
    category: "model",
    score_impact: Math.round(P * 100),
  });

  if (urlSignals.length > 0) {
    indicators.push({
      id: "IND-URL-SIGNALS",
      title: "URL Domain Indicators",
      description: urlSignals.join("; "),
      severity: urlScore > 0.5 ? "high" : "medium",
      category: "url",
      score_impact: Math.round(urlScore * 100),
    });
  }

  if (flaggedTokens.length > 0) {
    indicators.push({
      id: "IND-TEXT-SIGNALS",
      title: "Textual Risk Signals",
      description: flaggedTokens.join("; "),
      severity: textScore > 0.5 ? "high" : "medium",
      category: "text",
      score_impact: Math.round(textScore * 100),
    });
  }

  if (hasHeaders && structScore > 0.4) {
    indicators.push({
      id: "IND-STRUCT-INCONSISTENCY",
      title: "Header Inconsistency",
      description: "Return-Path or transit hops mismatch detected",
      severity: "medium",
      category: "structure",
      score_impact: Math.round(structScore * 100),
    });
  }

  // 8. Extracted Entities
  const amounts = uniq((raw.match(AMOUNT_RE) || []).map((s) => s.trim()));
  const tx = (text.match(/\b(?:wire transfer|bank transfer|neft|rtgs|imps|direct deposit|withdrawal|refund|upi|card payment|invoice)\b/) || [])[0] || "";
  const cards = uniq((raw.match(CARD_RE) || []).map(mask));
  const accts = uniq([...raw.matchAll(/\b(?:account(?: number| no\.?)?|a\/c|ending)\s*[:#]?\s*((?:\d[ -]?){3,16}\d)\b/gi)].map((m) => mask(m[1])));
  const sector = /payroll|salary/.test(text)
    ? "Payroll / HR"
    : /lottery|prize|reward|lucky draw/.test(text)
    ? "Consumer rewards"
    : /invoice|vendor|reconciliation|accounts payable/.test(text)
    ? "Accounts payable"
    : /bank|card|statement|upi|neft|account/.test(text)
    ? "Banking & payments"
    : /order|shipped|package/.test(text)
    ? "Retail / e-commerce"
    : "General";

  const topBranch = Object.entries(modalityContributions).sort((a, b) => b[1] - a[1])[0];
  const evidenceSummary = `PAHF-Net evaluated 4 modalities (${[m_t && "Text", m_u && "URL", m_s && "Structure", m_l && "Linguistic"].filter(Boolean).join(", ")}). Leading modality: ${topBranch[0]} (${topBranch[1] >= 0 ? "+" : ""}${topBranch[1].toFixed(2)}).`;

  return {
    email: {
      subject: email.subject || "(no subject)",
      from: email.from || "",
      replyTo: email.replyTo || "",
      body,
      headers: email.headers || "",
    },
    fromReg: from.reg,
    fromDom: from.dom,
    urls: U.map((u) => u.raw),
    modalities,
    gateWeights,
    availabilityMask: { text: m_t, url: m_u, structure: m_s, linguistic: m_l },
    modalityContributions,
    fusedScore,
    P,
    indicators,
    entities: { sector, amounts, tx, cards, accts, orgs: brands.map((b) => b[0]) },
    flaggedTokens,
    urlSignals,
    evidenceSummary,
  };
}

/* =====================================================================
   Initial reference sample emails (ground truth from PhishIntel)
   ===================================================================== */
export const SAMPLE_EMAILS: Array<{
  mins: number;
  subject: string;
  from: string;
  replyTo?: string;
  body: string;
  headers: string;
}> = [
  {
    mins: 2900,
    subject: "Re: Q4 vendor reconciliation",
    from: "Neha Kapoor <neha.kapoor@meridian-holdings.com>",
    body: "Hi team,\n\nAttached is the reconciliation sheet for October. Two invoices from Northline are still pending approval. I will review them with finance on Monday.\n\nThanks,\nNeha",
    headers: "Received: from mail.meridian-holdings.com\nReceived: from exch01.meridian-holdings.local\nReturn-Path: <neha.kapoor@meridian-holdings.com>\nMessage-ID: <a81f2c@meridian-holdings.com>",
  },
  {
    mins: 2100,
    subject: "Invoice INV-20931 overdue — payment required",
    from: "PayPal Billing <billing@paypa1-invoices.com>",
    body: "Hello,\n\nYour PayPal invoice INV-20931 for $1,240.00 is overdue. Pay now to avoid a late penalty and suspension of your account.\n\nView and pay invoice: http://paypa1-invoices.com/inv/20931?ref=%2Fsecure%2Fpay\n\nPayPal Billing",
    headers: "Received: from smtp.paypa1-invoices.com\nReturn-Path: <bounce@paypa1-invoices.com>",
  },
  {
    mins: 1380,
    subject: "Congratulations! You've won a ₹25,00,000 reward",
    from: "Lucky Draw Desk <winner@claims-desk.top>",
    body: "Dear Winner!!!\n\nYour email was selected in the annual customer lottery. To claim your prize of ₹25,00,000, send your full name, PAN card number and bank account details within 48 hours.\n\nClaim now: https://bit.ly/3xClaimPrize\n\nA processing fee of ₹1,999 applies.",
    headers: "",
  },
  {
    mins: 720,
    subject: "Your November e-statement is ready",
    from: "Meridian Bank <statements@meridianbank.com>",
    body: "Dear Priya Sharma,\n\nYour credit card statement for 16 Oct – 15 Nov 2026 is now available in online banking. Minimum amount due: ₹4,120.00 by 5 December.\n\nWe will never ask for your password, PIN or OTP by email.\n\nView statement: https://www.meridianbank.com/statements\n\nMeridian Bank",
    headers: "Received: from out.meridianbank.com\nReturn-Path: <statements@meridianbank.com>\nMessage-ID: <st-77120@meridianbank.com>",
  },
  {
    mins: 300,
    subject: "Your Meridian Bank account has been locked",
    from: "Meridian Bank Security <alerts@meridian-bank-secure.com>",
    body: "Dear Customer,\n\nWe detected unusual sign-in activity on your account ending 7731. Your online banking access has been temporarily locked.\n\nTo restore access, verify your identity and confirm your card details, including CVV, at our secure portal:\nhttps://meridianbank.verify-access.info/login\n\nIf you do not respond within 12 hours, your account will be permanently suspended.\n\nMeridian Bank Security Team",
    headers: "Received: from vps-2231.hostnet.example\nReceived: from unknown (HELO mx)\nReturn-Path: <noreply@bulk-relay.net>\nX-Originating-IP: 103.86.44.19",
  },
  {
    mins: 130,
    subject: "Your order 402-8913377 has shipped",
    from: "Amazon.in <shipment-tracking@amazon.in>",
    body: "Hello Rahul,\n\nYour package with 2 items has shipped and is expected on Tuesday, 18 November.\n\nTrack your package: https://www.amazon.in/gp/your-account/order-details?orderID=402-8913377\n\nOrder total: ₹2,349.00 paid by UPI.\n\nThank you for shopping with us.",
    headers: "Received: from a10-21.smtp-out.amazonses.com\nReturn-Path: <bounce@amazon.in>\nMessage-ID: <0100018c@amazon.in>",
  },
  {
    mins: 48,
    subject: "IEEE Security & Privacy — November digest",
    from: "IEEE Computer Society <updates@computer.org>",
    body: "Hello,\n\nThis month's digest includes accepted papers from the Symposium on Usable Privacy and a call for reviewers on email authentication research.\n\nRead the issue: https://www.computer.org/digest/2026-11\n\nYou are receiving this because you subscribed to Computer Society updates. Manage preferences at https://www.computer.org/preferences\n\nIEEE Computer Society",
    headers: "Received: from mail.computer.org\nReturn-Path: <bounce@computer.org>\nMessage-ID: <dg-1126@computer.org>",
  },
  {
    mins: 22,
    subject: "Immediate wire transfer needed — confidential",
    from: "Arjun Mehta (CEO) <ceo.office@meridian-holdings.co>",
    replyTo: "arjun.mehta.ceo@gmail.com",
    body: "Hi,\n\nAre you available? I need you to process a wire transfer of $48,500.00 to a new vendor today. Keep this confidential until the acquisition is announced.\n\nBeneficiary: Northline Trading LLC\nAccount number: 4410 2287 9932\n\nConfirm once done. I am in meetings and cannot take calls.\n\nArjun",
    headers: "Received: from mail-sor-f41.google.com\nReturn-Path: <arjun.mehta.ceo@gmail.com>",
  },
  {
    mins: 9,
    subject: "URGENT: Verify your payroll account before 18:00",
    from: "HR Payroll <hr-payroll@secured-login-portal.net>",
    replyTo: "payroll.desk@mail-verify.co",
    body: "Dear employee,\n\nOur records show your salary deposit for November could not be processed. To avoid suspension of your payroll account, re-authenticate your credentials within 24 hours.\n\nClick here to log in: http://secured-login-portal.net/hr/verify?session=88231&redirect=https://intranet-auth.example\n\nFailure to verify will delay your payment.\n\nHR Payroll Team",
    headers: "Received: from unknown (HELO mx01)\nReceived: from relay.mail-verify.co\nReturn-Path: <bounce@mail-verify.co>\nX-Originating-IP: 185.220.101.4",
  },
  {
    mins: 5,
    subject: "Action Required: Microsoft 365 MFA Re-registration",
    from: "IT Identity Support <admin@mso365-security-portal.com>",
    replyTo: "support@mso365-security-portal.com",
    body: "Your Multi-Factor Authentication session expires today. If you do not update your authenticator app within 6 hours, your Microsoft 365 access will be blocked.\n\nUpdate authentication now: https://mso365-security-portal.com/mfa-verify?auth=token9910",
    headers: "Received: from vps-9011.hosted-mail.net\nReturn-Path: <bounce@mso365-security-portal.com>",
  },
  {
    mins: 4,
    subject: "GitHub Security: Dependency vulnerabilities detected in repository",
    from: "GitHub <notifications@github.com>",
    body: "We found 1 high severity vulnerability on repository main branch. Dependabot has created a security advisory and opened a pull request with the recommended fix.\n\nReview pull request: https://github.com/org/repo/security/dependabot",
    headers: "Received: from mail.github.com\nReturn-Path: <noreply@github.com>",
  },
  {
    mins: 3,
    subject: "DocuSign: Please review and sign Confidential Settlement Agreement",
    from: "DocuSign Service <signing@docusign-contracts-sign.net>",
    replyTo: "settlement@docusign-contracts-sign.net",
    body: "You have been requested by Legal Counsel to review and sign document #DOC-881920.\n\nAccess DocuSign envelope: http://docusign-contracts-sign.net/sign/doc881920?recipient=verify\n\nThis envelope expires in 24 hours.",
    headers: "Received: from out4.docusign-contracts-sign.net\nReturn-Path: <bounce@docusign-contracts-sign.net>",
  },
  {
    mins: 2,
    subject: "IT Operations: Scheduled VPN gateway maintenance this Saturday",
    from: "Enterprise IT Services <it-helpdesk@meridian-holdings.com>",
    body: "Please note that the Asia-Pacific regional VPN gateway will undergo scheduled software upgrades this Saturday from 02:00 to 04:00 UTC. Secondary gateways will remain fully operational during this window.\n\nMeridian IT Operations",
    headers: "Received: from mail.meridian-holdings.com\nReturn-Path: <it-helpdesk@meridian-holdings.com>",
  },
  {
    mins: 1,
    subject: "Stripe: Payout of $14,280.00 is on its way to your bank account",
    from: "Stripe <notifications@stripe.com>",
    body: "A payout of $14,280.00 (USD) is scheduled to arrive in your designated account ending in 4108 within 1-2 business days. Summary of daily transactions and platform fees is available in your Stripe Dashboard.\n\nStripe Payments Europe",
    headers: "Received: from smtp.stripe.com\nReturn-Path: <bounce@stripe.com>",
  },
  {
    mins: 0.5,
    subject: "Urgent Notice: DHL Express package delivery attempt failed",
    from: "DHL Express Delivery <tracking@dhl-express-dispatch.top>",
    replyTo: "support@dhl-express-dispatch.top",
    body: "Your shipment #DHL-9921894 could not be delivered due to an incorrect postal code. Confirm your address and pay the redelivery clearance charge of $3.50 within 48 hours to avoid package return to sender.\n\nResolve shipment: http://dhl-express-dispatch.top/redeliver?ref=pkg9921894",
    headers: "Received: from relay-host.isp.net\nReturn-Path: <bounce@dhl-express-dispatch.top>",
  },
];

const BASELINE_TIMESTAMP = 1794747600000; // 15 Nov 2026 12:00:00 UTC

let CACHED_INITIAL_SCANS: ScanItem[] | null = null;

function buildInitialScans(T = 0.5): ScanItem[] {
  if (CACHED_INITIAL_SCANS && T === 0.5) {
    return CACHED_INITIAL_SCANS;
  }
  const now = BASELINE_TIMESTAMP;
  const out: ScanItem[] = [];
  SAMPLE_EMAILS.forEach((s, i) => {
    const prior = SAMPLE_EMAILS.slice(0, i).map((p) => {
      const from = parseAddr(p.from);
      return { fromReg: from.reg };
    });
    const core = computePahfNetAnalysis(
      {
        subject: s.subject,
        from: s.from,
        replyTo: s.replyTo || "",
        body: s.body,
        urls: "",
        headers: s.headers,
      },
      prior
    );
    const P = core.P;
    out.push({
      ...core,
      id: "PG-" + (1230 - i * 7),
      ts: now - s.mins * 60 * 1000,
      src: "sample",
      T,
      P,
      localP: P,
      engine: "local",
      modelVersion: "PAHF-Net",
      decision: P >= T ? "PHISHING" : "SAFE",
      risk: P >= T ? "High" : "Low",
      riskScore: Math.round(P * 100),
    });
  });
  const sorted = out.sort((a, b) => b.ts - a.ts);
  if (T === 0.5) {
    CACHED_INITIAL_SCANS = sorted;
  }
  return sorted;
}

const DEFAULT_SETTINGS: SettingsState = {
  T: 0.5,
  useService: true,
  endpoint: FASTAPI_ANALYZE_URL,
  store: true,
  start: "overview",
  fmt: "prob",
  jump: false,
};

const DEFAULT_PROFILE: ProfileState = {
  name: "",
  role: "",
  org: "",
  team: "",
};

export function PhishGuardProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: { name: string; email: string; designation?: string } | null;
}) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<ProfileState>(() => {
    if (initialUser) {
      return {
        name: initialUser.name || "",
        role: initialUser.designation || "",
        org: "",
        team: "",
      };
    }
    return DEFAULT_PROFILE;
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [usage, setUsage] = useState<{ scans: number; calls: number }>({ scans: 0, calls: 0 });
  const [evalArtifact, setEvalArtifactState] = useState<EvalArtifact | null>(null);
  const [scans, setScans] = useState<ScanItem[]>([]);

  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  const [serviceStatus, setServiceStatus] = useState<"ok" | "err" | "none">("none");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Synchronize persisted browser storage after hydration to prevent SSR mismatch
  useEffect(() => {
    // 1. Settings
    try {
      const savedSettings = localStorage.getItem("pg.settings");
      if (savedSettings) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch {}

    // 2. Profile
    try {
      const sessionEmail = localStorage.getItem("phishintel-session");
      if (sessionEmail) {
        const rawUsers = localStorage.getItem("phishintel-users");
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          const u = users.find((x: { email: string }) => x.email.toLowerCase() === sessionEmail.toLowerCase());
          if (u) {
            setProfile({
              name: u.name || "",
              role: u.designation || "",
              org: u.organization || "",
              team: "",
            });
          }
        }
      } else {
        const savedProfile = localStorage.getItem("pg.profile");
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          if (parsed.role === "Security analyst") parsed.role = "";
          if (parsed.org === "PhishIntel Labs") parsed.org = "";
          if (parsed.team === "Threat Intelligence") parsed.team = "";
          if (parsed.name === "Analyst") parsed.name = "";
          setProfile((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {}

    // 3. Activity
    try {
      const savedActivity = localStorage.getItem("pg.activity");
      if (savedActivity) {
        setActivity(JSON.parse(savedActivity));
      }
    } catch {}

    // 4. Usage
    try {
      const savedUsage = localStorage.getItem("pg.usage");
      if (savedUsage) {
        setUsage(JSON.parse(savedUsage));
      }
    } catch {}

    // 5. Eval Artifact
    try {
      const savedEval = localStorage.getItem("pg.eval");
      if (savedEval) {
        setEvalArtifactState(JSON.parse(savedEval));
      }
    } catch {}

    // 6. User Scans (with PAHF-Net normalization for cached legacy scans)
    try {
      const rawUserScans: any[] = JSON.parse(localStorage.getItem("pg.scans") || "[]");
      if (Array.isArray(rawUserScans) && rawUserScans.length > 0) {
        const userScans: ScanItem[] = rawUserScans.map((s) => {
          if (!s.indicators || !s.modalities || !s.entities) {
            const core = computePahfNetAnalysis(
              {
                subject: s.email?.subject || "",
                from: s.email?.from || "",
                replyTo: s.email?.replyTo || "",
                body: s.email?.body || "",
                urls: Array.isArray(s.urls) ? s.urls.join(" ") : "",
                headers: s.email?.headers || "",
              },
              []
            );
            return {
              ...core,
              id: s.id || `PG-${Math.floor(Date.now() / 1000)}`,
              ts: s.ts || Date.now(),
              src: "user" as const,
              T: typeof s.T === "number" ? s.T : 0.5,
              P: typeof s.P === "number" ? s.P : core.P,
              localP: typeof s.localP === "number" ? s.localP : core.P,
              engine: s.engine || "local",
              modelVersion: "PAHF-Net",
              decision: s.decision || (core.P >= 0.5 ? "PHISHING" : "SAFE"),
              risk: s.risk || (core.P >= 0.5 ? "High" : "Low"),
              riskScore: typeof s.riskScore === "number" ? s.riskScore : Math.round(core.P * 100),
              indicators: core.indicators,
            };
          }
          return s as ScanItem;
        });
        try {
          localStorage.setItem("pg.scans", JSON.stringify(userScans));
        } catch {}
        setScans(userScans.sort((a, b) => b.ts - a.ts));
      }
    } catch {}
  }, []);

  // Show Toast
  const showToast = useCallback((msg: string, warn?: boolean) => {
    const id = "t-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, msg, warn }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  // Log Activity
  const logActivity = useCallback((text: string) => {
    setActivity((prev) => {
      const next = [{ ts: Date.now(), text }, ...prev].slice(0, 40);
      try {
        localStorage.setItem("pg.activity", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Update Settings
  const updateSettings = useCallback(
    (patch: Partial<SettingsState>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem("pg.settings", JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  // Update Profile
  const updateProfile = useCallback((patch: Partial<ProfileState>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("pg.profile", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Set Eval Artifact
  const setEvalArtifact = useCallback((art: EvalArtifact | null) => {
    setEvalArtifactState(art);
    try {
      if (art) localStorage.setItem("pg.eval", JSON.stringify(art));
      else localStorage.removeItem("pg.eval");
    } catch {}
  }, []);

  // Format probability helper
  const formatP = useCallback(
    (p: number) => {
      return settings.fmt === "pct" ? (p * 100).toFixed(1) + "%" : p.toFixed(3);
    },
    [settings.fmt]
  );

  // Test service connection
  const testServiceConnection = useCallback(
    async (customEndpoint?: string) => {
      const ep = (customEndpoint || settings.endpoint || FASTAPI_ANALYZE_URL).trim();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
          const response = await analyzeEmailWithBackend(
            {
              subject: "Connection Test",
              sender: "test@phishintel.local",
              body: "Connection diagnostic ping.",
              headers: "",
            },
            ep,
            controller.signal
          );
          setServiceStatus("ok");
          showToast(`Connected to model service (${response.p_phish.toFixed(3)})`);
          return { ok: true, version: "PAHF-Net" };
        } finally {
          clearTimeout(timeout);
        }
      } catch (err: unknown) {
        setServiceStatus("err");
        const msg =
          err instanceof Error && err.name === "AbortError"
            ? "timed out"
            : err instanceof Error
              ? err.message
              : String(err);
        showToast("Service unreachable: " + msg, true);
        return { ok: false, error: msg };
      }
    },
    [settings.endpoint, showToast]
  );

  // Call Model Service
  const callService = useCallback(
    async (email: ScanEmailInput) => {
      if (!settings.useService) return null;
      try {
        setUsage((prev) => {
          const next = { ...prev, calls: prev.calls + 1 };
          try {
            localStorage.setItem("pg.usage", JSON.stringify(next));
          } catch {}
          return next;
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await analyzeEmailWithBackend(
            {
              subject: email.subject,
              sender: email.from,
              reply_to: email.replyTo,
              body: email.body,
              urls: email.urls.split(/\s+/).filter(Boolean),
              headers: email.headers,
            },
            settings.endpoint || FASTAPI_ANALYZE_URL,
            controller.signal
          );
          setServiceStatus("ok");
          return {
            p: response.p_phish,
            riskScore: response.risk_score,
            isPhishing: response.is_phishing,
            indicators: response.indicators,
            verdict: response.verdict,
            version: "PAHF-Net",
          };
        } finally {
          clearTimeout(timeout);
        }
      } catch (err: unknown) {
        setServiceStatus("err");
        throw new Error(
          err instanceof Error && err.name === "AbortError"
            ? "PhishIntel backend request timed out."
            : err instanceof Error
              ? err.message
              : String(err)
        );
      }
    },
    [settings.endpoint, settings.useService]
  );

  // Run email analysis (PAHF-Net Native)
  const runScan = useCallback(
    async (email: ScanEmailInput): Promise<ScanItem> => {
      const prior = scans.map((s) => ({ fromReg: s.fromReg }));
      const core = computePahfNetAnalysis(email, prior);
      const svcRes = await callService(email);

      const isService = !!svcRes;
      const P = svcRes ? svcRes.p : core.P;
      const riskScore = svcRes?.riskScore ?? Math.round(P * 100);
      const isPhishing = svcRes ? svcRes.isPhishing : P >= settings.T;
      const indicators: ModelIndicator[] = (svcRes?.indicators && svcRes.indicators.length > 0)
        ? svcRes.indicators.map((ind, i) => ({
            id: ind.id || `IND-PAHF-${i + 1}`,
            title: ind.title || "Threat Indicator",
            description: ind.description || "",
            severity: (ind.severity as any) || "medium",
            category: (["text", "url", "structure", "linguistic", "model"].includes(ind.category as string)
              ? ind.category
              : "model") as PahfModality | "model",
            score_impact: typeof ind.score_impact === "number" ? ind.score_impact : 0,
          }))
        : core.indicators;

      const id = "PG-" + (2000 + usage.scans + 1 + (Math.floor(Date.now() / 1000) % 1000));
      const newScan: ScanItem = {
        ...core,
        id,
        ts: Date.now(),
        src: "user",
        T: settings.T,
        P,
        localP: core.P,
        engine: isService ? "service" : "local",
        modelVersion: "PAHF-Net",
        decision: isPhishing ? "PHISHING" : "SAFE",
        risk: (riskScore >= 70 || P >= settings.T) ? "High" : "Low",
        riskScore,
        indicators,
      };

      setScans((prev) => {
        const next = [newScan, ...prev];
        if (settings.store) {
          try {
            const userOnly = next.filter((s) => s.src === "user").slice(0, 50);
            localStorage.setItem("pg.scans", JSON.stringify(userOnly));
          } catch {}
        }
        return next;
      });

      setSelectedScanId(newScan.id);

      setUsage((prev) => {
        const next = { ...prev, scans: prev.scans + 1 };
        try {
          localStorage.setItem("pg.usage", JSON.stringify(next));
        } catch {}
        return next;
      });

      logActivity(`Analysed “${newScan.email.subject}” · ${newScan.decision}`);

      // Backend sync
      try {
        const sessionUser = typeof window !== "undefined" ? localStorage.getItem("phishintel-session") : null;
        fetch("/api/account/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionUser ? { "x-user-email": sessionUser } : {}),
          },
          body: JSON.stringify({
            scanId: newScan.id,
            subject: newScan.email.subject,
            prediction: newScan.decision === "PHISHING" ? "phishing" : "safe",
            confidence: +(newScan.P * 100).toFixed(1),
          }),
        }).catch(() => {});
      } catch {}

      return newScan;
    },
    [callService, logActivity, scans, settings.T, settings.store, usage.scans]
  );

  // Clear user scans
  const clearUserScans = useCallback(() => {
    setScans([]);
    try {
      localStorage.removeItem("pg.scans");
    } catch {}
    logActivity("Cleared scan history");
    showToast("Cleared scan history");
  }, [logActivity, showToast]);

  // Delete a single scan permanently
  const deleteScan = useCallback(
    async (scanId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const sessionUser =
          typeof window !== "undefined"
            ? localStorage.getItem("phishintel-session")
            : null;

        // Backend delete if authenticated session exists
        if (sessionUser) {
          const res = await fetch(`/api/account/scan?scanId=${encodeURIComponent(scanId)}`, {
            method: "DELETE",
            headers: {
              "x-user-email": sessionUser,
            },
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with status ${res.status}`);
          }
        }

        // Reconcile client scans state and localStorage
        setScans((prev) => {
          const next = prev.filter((s) => s.id !== scanId);
          try {
            const userOnly = next.filter((s) => s.src === "user");
            localStorage.setItem("pg.scans", JSON.stringify(userOnly));
          } catch {}
          return next;
        });

        // Reconcile selection state
        setSelectedScanId((current) => (current === scanId ? null : current));

        logActivity(`Permanently deleted scan ${scanId}`);
        showToast("Scan record permanently deleted");
        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed to delete scan";
        showToast(error, true);
        return { success: false, error };
      }
    },
    [logActivity, showToast]
  );

  const selectedScan = useMemo(() => {
    return scans.find((s) => s.id === selectedScanId) || scans[0] || null;
  }, [scans, selectedScanId]);

  const contextValue = useMemo<PhishGuardContextValue>(
    () => ({
      scans,
      selectedScanId,
      setSelectedScanId,
      selectedScan,
      settings,
      updateSettings,
      profile,
      updateProfile,
      evalArtifact,
      setEvalArtifact,
      activity,
      logActivity,
      usage,
      serviceStatus,
      testServiceConnection,
      runScan,
      clearUserScans,
      deleteScan,
      toasts,
      showToast,
      formatP,
    }),
    [
      scans,
      selectedScanId,
      selectedScan,
      settings,
      updateSettings,
      profile,
      updateProfile,
      evalArtifact,
      setEvalArtifact,
      activity,
      logActivity,
      usage,
      serviceStatus,
      testServiceConnection,
      runScan,
      clearUserScans,
      deleteScan,
      toasts,
      showToast,
      formatP,
    ]
  );

  return (
    <PhishGuardContext.Provider value={contextValue}>
      {children}
    </PhishGuardContext.Provider>
  );
}

export function usePhishGuard() {
  const ctx = useContext(PhishGuardContext);
  if (!ctx) {
    throw new Error("usePhishGuard must be used within a PhishGuardProvider");
  }
  return ctx;
}

export const PhishIntelContext = PhishGuardContext;
export const PhishIntelProvider = PhishGuardProvider;
export const usePhishIntel = usePhishGuard;
