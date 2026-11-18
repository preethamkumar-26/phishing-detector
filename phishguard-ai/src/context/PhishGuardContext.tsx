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

export interface FeatureRow {
  id: string;
  b: "financial" | "security" | "url" | "metadata";
  name: string;
  w: number;
  disp: string | number;
  hit: string;
  contrib: number;
}

export interface TextSpan {
  s: number;
  e: number;
  ids: string[];
  names: string[];
  b: string;
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
  modelVersion: string;
  decision: "PHISHING" | "SAFE";
  risk: "High" | "Low";
  riskScore?: number;
  indicators?: FastAPIAnalysisResponse["indicators"];
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
  rows: FeatureRow[];
  sum: {
    financial: number;
    security: number;
    url: number;
    metadata: number;
  };
  abl: {
    financial: number;
    security: number;
    url: number;
    metadata: number;
  };
  spans: TextSpan[];
  entities: ExtractedEntities;
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
   Feature extraction & math engine (from phishguard-ai.html reference)
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

interface FeatureContext {
  raw: string;
  text: string;
  bodyLower: string;
  U: ParsedUrl[];
  from: ReturnType<typeof parseAddr>;
  reply: ReturnType<typeof parseAddr>;
  brands: [string, string][];
  freq: number;
  hdr: ReturnType<typeof parseHeaders>;
}

interface FeatureDef {
  id?: string;
  b: "financial" | "security" | "url" | "metadata";
  name: string;
  w: number;
  re?: RegExp;
  fn: (c: FeatureContext) => { disp: string | number; hit?: string; n?: number } | null;
}

const rx = (re: RegExp) => ({
  re,
  fn: (c: FeatureContext) => {
    const m = c.text.match(re);
    return m ? { disp: "yes", hit: m[0] } : null;
  },
});

const F = (b: FeatureDef["b"], name: string, w: number, def: any): FeatureDef =>
  Object.assign({ b, name, w }, typeof def === "function" ? { fn: def } : def);

const UF = (name: string, w: number, pred: (u: ParsedUrl) => any, fmt?: (u: ParsedUrl) => any): FeatureDef =>
  F("url", name, w, (c: FeatureContext) => {
    const u = c.U.find(pred);
    return u
      ? { disp: fmt ? fmt(u) : "yes", hit: u.raw }
      : c.U.length
      ? { disp: "no", n: 0 }
      : null;
  });

const RAW_FEATURES: FeatureDef[] = [
  // Financial (18)
  F("financial", "Amount count", 0.22, (c: FeatureContext) => {
    const m = c.raw.match(AMOUNT_RE) || [];
    return m.length ? { disp: m.length, hit: m[0], n: Math.min(m.length, 3) } : null;
  }),
  F("financial", "Currency reference", 0.1, rx(/(?:[$₹€£]|\b(?:usd|inr|eur|gbp|rupees|dollars)\b)/)),
  F("financial", "Monetary-value reference", 0.3, rx(/\b(?:balance|funds|refund|deposit|withdrawals?|charges?|salary)\b/)),
  F("financial", "Payment amount", 0.2, rx(/\b(?:amount due|payment of|outstanding (?:amount|balance)|total due|processing fee)\b/)),
  F("financial", "Bank name", 0.2, rx(/\b(?:bank|hsbc|chase|citibank|barclays|sbi|hdfc|icici|wells fargo)\b/)),
  F("financial", "Financial brand mention", 0.3, rx(/\b(?:paypal|visa|mastercard|amex|stripe|venmo|zelle|paytm|google pay|phonepe)\b/)),
  F("financial", "Transaction type", 0.3, rx(/\b(?:wire transfer|bank transfer|neft|rtgs|imps|ach|direct deposit|withdrawal|transaction)\b/)),
  F("financial", "Transfer request", 0.9, rx(/\b(?:(?:process|make|send|initiate|complete)\s+(?:a|the)\s+(?:wire|transfer|payment)|transfer\s+(?:the\s+)?(?:funds|amount|money)|wire\s+(?:the\s+)?(?:funds|amount|money))\b/)),
  F("financial", "Payment method", 0.3, rx(/\b(?:credit card|debit card|bank account|upi|gift cards?|bitcoin|crypto(?:currency)?|card details)\b/)),
  F("financial", "Beneficiary", 0.6, rx(/\b(?:beneficiary|payee|new vendor|recipient account|new account details)\b/)),
  F("financial", "Billing reference", 0.1, rx(/\b(?:billing|statement|bill)\b/)),
  F("financial", "Invoice reference", 0.3, rx(/\binvoices?\b/)),
  F("financial", "Loan reference", 0.2, rx(/\b(?:loan|emi|mortgage|credit limit)\b/)),
  F("financial", "Card number", 0.6, (c: FeatureContext) => {
    const m = c.raw.match(CARD_RE);
    return m ? { disp: "yes", hit: mask(m[0]) } : null;
  }),
  F("financial", "Password / credential request", 1.3, rx(/\b(?:password|passcode|pin|otp|one[- ]time (?:code|password)|credentials?|login details|cvv)\b/)),
  F("financial", "Identity verification", 1.0, rx(/\b(?:verify (?:your )?(?:identity|account)|confirm (?:your )?(?:identity|account|card details|details)|re-?verify|validate your)\b/)),
  F("financial", "Personal-ID request", 1.0, rx(/\b(?:ssn|social security|pan card|pan number|aadhaar|passport number|date of birth|national id)\b/)),
  F("financial", "Payment request", 0.7, rx(/\b(?:pay now|make (?:a )?payment|pay (?:immediately|today)|settle (?:the|your)|remit|view and pay)\b/)),

  // Security / phishing (19)
  F("security", "Urgency / pressure", 0.9, rx(/\b(?:urgent(?:ly)?|immediate(?:ly)?|asap|right away|act now|as soon as possible)\b/)),
  F("security", "Pressure language", 0.7, rx(/\b(?:final notice|last chance|failure to|do not ignore|action required|overdue|permanently)\b/)),
  F("security", "Deadline present", 0.8, rx(/(?:\bwithin \d+ ?(?:hours?|hrs|days?|minutes?)\b|\bbefore \d{1,2}[:.]\d{2}|\bby (?:today|tomorrow|tonight|end of day|eod)\b|\btoday\b|\bexpires? (?:today|soon)\b)/)),
  F("security", "Fear language", 0.8, rx(/\b(?:suspend(?:ed|sion)?|locked|unauthori[sz]ed|compromised|breach|fraud(?:ulent)?|unusual (?:sign-?in|activity))\b/)),
  F("security", "Legal consequence", 0.6, rx(/\b(?:legal action|lawsuit|penalt(?:y|ies)|court|police|prosecut\w*)\b/)),
  F("security", "Verification request", 0.4, rx(/\b(?:verify|verification|confirm(?:ation)?)\b/)),
  F("security", "Login instruction", 0.6, rx(/\b(?:log ?in|sign ?in|re-?authenticate|restore access)\b/)),
  F("security", "Password request", 0.6, rx(/\b(?:password|passcode|cvv)\b/)),
  F("security", "Personal-information request", 0.6, rx(/\b(?:personal (?:information|details)|full name|account details|card details|update your (?:details|information))\b/)),
  F("security", "Call-to-action", 0.2, rx(/\b(?:click|tap|open|download|claim now|view and pay|track your)\b/)),
  F("security", "Click-link instruction", 0.8, rx(/\b(?:click (?:here|below|the link|this link)|follow (?:this|the) link|tap (?:here|below)|claim now)\b/)),
  F("security", "Brand impersonation claim", 1.0, (c: FeatureContext) => {
    const b = c.brands.find((x) => !owned(c.from.reg, x[1]));
    return b ? { disp: b[0], hit: b[0] + " named · sender " + (c.from.dom || "unknown") } : null;
  }),
  F("security", "Trust establishment", 0.4, rx(/\b(?:official|secure (?:portal|link|server|site)|security team|trusted|verified)\b/)),
  F("security", "Suspicious request language", 0.9, rx(/\b(?:keep this confidential|confidential|are you available|do not share|cannot take calls|gift cards?)\b/)),
  F("security", "Unusual greeting", 0.5, (c: FeatureContext) => {
    const m = c.bodyLower.match(/^\s*(?:dear (?:customer|user|client|account holder|valued customer|employee|winner|sir\/madam)|hello user|attention customer)\b/);
    return m ? { disp: "yes", hit: m[0].trim() } : null;
  }),
  F("security", "Lottery / prize language", 1.0, rx(/\b(?:lottery|you(?:'ve| have) won|winner|jackpot|prize|lucky draw)\b/)),
  F("security", "Unexpected reward language", 0.5, rx(/\b(?:reward|bonus|cashback|free gift|claim your|congratulations)\b/)),
  F("security", "Excessive exclamation", 0.4, (c: FeatureContext) => {
    const n = (c.raw.match(/!/g) || []).length;
    return n >= 3 ? { disp: n, hit: n + ' × "!"' } : null;
  }),
  F("security", "Security-indicator count", 0, () => null),

  // URL / domain (20)
  UF("URL length", 0.3, (u) => u.len > 75, (u) => u.len),
  UF("Path length", 0.1, (u) => u.pathLen > 40, (u) => u.pathLen),
  UF("Query length", 0.2, (u) => u.qLen > 30, (u) => u.qLen),
  UF("Dot count", 0.3, (u) => u.dots > 3, (u) => u.dots),
  UF("Hyphen count", 0.4, (u) => u.hyph >= 2, (u) => u.hyph),
  UF("Special-character count", 0.1, (u) => u.special > 5, (u) => u.special),
  UF("Subdomain count", 0.4, (u) => u.subs >= 2, (u) => u.subs),
  UF("HTTPS used", 0.4, (u) => !u.https, () => "no"),
  UF("IP-address URL", 1.4, (u) => u.ip),
  UF("Port present", 0.5, (u) => u.port),
  UF("URL encoding present", 0.3, (u) => u.enc),
  UF("URL shortener", 1.0, (u) => u.short),
  UF("Redirect parameter", 0.6, (u) => u.redirect),
  UF("Multiple-protocol pattern", 0.7, (u) => u.multi),
  UF("@ symbol in URL", 0.9, (u) => u.at),
  UF("Brand-domain mismatch", 1.1, (u) => u.brandMis, (u) => u.brandMis),
  UF("Lookalike domain", 1.3, (u) => u.look, (u) => u.look),
  UF("Domain length", 0.2, (u) => u.dLen > 24, (u) => u.dLen),
  UF("Digit count in domain", 0.3, (u) => u.digits >= 3, (u) => u.digits),
  UF("Domain entropy", 0.3, (u) => u.ent > 3.6, (u) => u.ent.toFixed(2)),

  // Email metadata (11)
  F("metadata", "Sender domain present", 0.6, (c: FeatureContext) =>
    c.from.dom ? { disp: "yes", n: 0 } : { disp: "no", hit: "no sender domain", n: 1 }
  ),
  F("metadata", "Display name present", 0, (c: FeatureContext) => ({ disp: c.from.name ? "yes" : "no", n: 0 })),
  F("metadata", "Display-name / domain match", 0.5, (c: FeatureContext) => {
    if (!c.from.name) return { disp: "n/a", n: 0 };
    const b = BRANDS.find((x) => brandRe(x[0]).test(c.from.name.toLowerCase()));
    if (b && !owned(c.from.reg, b[1])) return { disp: "mismatch", hit: c.from.name + " · " + c.from.dom, n: 1 };
    if (b) return { disp: "match", hit: c.from.name, n: -1 };
    return { disp: "no brand claim", n: 0 };
  }),
  F("metadata", "From / Reply-To mismatch", 1.1, (c: FeatureContext) =>
    !c.reply.dom
      ? { disp: "no reply-to", n: 0 }
      : c.reply.reg !== c.from.reg
      ? { disp: "mismatch", hit: c.reply.addr, n: 1 }
      : { disp: "match", n: 0 }
  ),
  F("metadata", "Sender-domain frequency", 0.25, (c: FeatureContext) =>
    c.freq === 0
      ? { disp: "first seen", hit: c.from.reg || "unknown", n: 1 }
      : { disp: c.freq + " prior", hit: c.from.reg, n: c.freq >= 2 ? -1 : 0 }
  ),
  F("metadata", "From / URL-domain match", 0.5, (c: FeatureContext) =>
    !c.U.length || !c.from.reg
      ? { disp: "n/a", n: 0 }
      : c.U.every((u) => u.reg === c.from.reg)
      ? { disp: "all match", hit: c.from.reg, n: -1 }
      : { disp: "no", n: 0 }
  ),
  F("metadata", "From / URL-domain mismatch", 0.6, (c: FeatureContext) => {
    if (!c.U.length || !c.from.reg) return { disp: "n/a", n: 0 };
    const u = c.U.find((u) => u.reg !== c.from.reg);
    return u ? { disp: "yes", hit: u.host, n: 1 } : { disp: "no", n: 0 };
  }),
  F("metadata", "Reply-To / URL-domain mismatch", 0.3, (c: FeatureContext) => {
    if (!c.U.length || !c.reply.reg) return { disp: "n/a", n: 0 };
    const u = c.U.find((u) => u.reg !== c.reply.reg);
    return u ? { disp: "yes", hit: u.host, n: 1 } : { disp: "no", n: 0 };
  }),
  F("metadata", "Sender-domain consistency", 0.5, (c: FeatureContext) => {
    const d = c.hdr.rp || c.hdr.mid;
    if (!d) return { disp: "no headers", n: 0 };
    return regDomain(d) === c.from.reg
      ? { disp: "consistent", hit: d, n: -1 }
      : { disp: "inconsistent", hit: "Return-Path " + d, n: 1 };
  }),
  F("metadata", "Received-hop count", 0.2, (c: FeatureContext) => ({
    disp: c.hdr.hops,
    hit: c.hdr.hops > 6 ? c.hdr.hops + " hops" : "",
    n: c.hdr.hops > 6 ? 1 : 0,
  })),
  F("metadata", "Originating IP present", 0.1, (c: FeatureContext) =>
    c.hdr.xip ? { disp: c.hdr.xip, hit: "X-Originating-IP " + c.hdr.xip, n: 1 } : { disp: "no", n: 0 }
  ),
];

// Assign IDs (F-01..F-18, S-01..S-19, U-01..U-20, M-01..M-11)
const pad = (n: number) => String(n).padStart(2, "0");
const FEATURES: FeatureDef[] = (() => {
  const cnt: Record<string, number> = {};
  const pre: Record<string, string> = { financial: "F", security: "S", url: "U", metadata: "M" };
  return RAW_FEATURES.map((f) => {
    cnt[f.b] = (cnt[f.b] || 0) + 1;
    return Object.assign({}, f, { id: pre[f.b] + "-" + pad(cnt[f.b]) });
  });
})();

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

export function analyzeEmailCore(email: ScanEmailInput, prior: { fromReg: string }[]): Omit<ScanItem, "id" | "ts" | "src" | "T" | "P" | "localP" | "engine" | "modelVersion" | "decision" | "risk"> {
  const body = htmlToText(email.body || "");
  const raw = (email.subject || "") + "\n" + body;
  const text = raw.toLowerCase();
  const extra = (email.urls || "").split(/\s+/).filter(Boolean);
  const urlsRaw = uniq([...(raw.match(URL_RE) || []), ...extra].map((u) => u.replace(/[.,;:!?)\]]+$/, "")));
  const U = urlsRaw.map(parseUrl).filter((u): u is ParsedUrl => u !== null);
  const from = parseAddr(email.from);
  const reply = parseAddr(email.replyTo);
  const brands = BRANDS.filter((b) => brandRe(b[0]).test(text + " " + from.name.toLowerCase()));
  const freq = prior.filter((s) => s.fromReg && s.fromReg === from.reg).length;
  const hdr = parseHeaders(email.headers || "");
  const c: FeatureContext = { raw, text, bodyLower: body.toLowerCase(), U, from, reply, brands, freq, hdr };

  const rows: FeatureRow[] = FEATURES.map((f) => {
    const r = f.fn(c);
    const n = r ? (r.n ?? 1) : 0;
    return {
      id: f.id!,
      b: f.b,
      name: f.name,
      w: f.w,
      disp: r ? r.disp : "—",
      hit: (r && r.hit) || "",
      contrib: +(f.w * n).toFixed(3),
    };
  });

  const sc = rows.filter((r) => r.b === "security" && r.contrib > 0).length;
  const s19 = rows.find((r) => r.id === "S-19");
  if (s19) {
    s19.disp = sc;
    s19.hit = sc + " security cues";
  }

  const sum = { financial: 0, security: 0, url: 0, metadata: 0 };
  rows.forEach((r) => {
    sum[r.b] += r.contrib;
  });
  const total = Object.values(sum).reduce((a, b) => a + b, 0);
  const P = sig(BIAS + K * total);
  const abl = { financial: 0, security: 0, url: 0, metadata: 0 };
  for (const b of ["financial", "security", "url", "metadata"] as const) {
    abl[b] = P - sig(BIAS + K * (total - sum[b]));
  }

  // Rule-based textual evidence spans
  const spans: { s: number; e: number; id: string; name: string; b: string }[] = [];
  FEATURES.forEach((f) => {
    if (!f.re || (f.b !== "financial" && f.b !== "security")) return;
    const g = new RegExp(f.re.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = g.exec(raw)) !== null) {
      if (!m[0]) {
        g.lastIndex++;
        continue;
      }
      spans.push({ s: m.index, e: m.index + m[0].length, id: f.id!, name: f.name, b: f.b });
    }
  });
  spans.sort((a, b) => a.s - b.s || b.e - a.e);
  const merged: TextSpan[] = [];
  spans.forEach((sp) => {
    const l = merged[merged.length - 1];
    if (l && sp.s < l.e) {
      l.e = Math.max(l.e, sp.e);
      if (!l.ids.includes(sp.id)) {
        l.ids.push(sp.id);
        l.names.push(sp.name);
      }
    } else {
      merged.push({ s: sp.s, e: sp.e, ids: [sp.id], names: [sp.name], b: sp.b });
    }
  });

  // Entities
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
    rows,
    sum,
    abl,
    spans: merged,
    entities: { sector, amounts, tx, cards, accts, orgs: brands.map((b) => b[0]) },
  };
}

/* =====================================================================
   Initial reference sample emails (ground truth from phishguard-ai.html)
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

function buildInitialScans(T = 0.5): ScanItem[] {
  const now = BASELINE_TIMESTAMP;
  const out: ScanItem[] = [];
  SAMPLE_EMAILS.forEach((s, i) => {
    const prior = out.map((o) => ({ fromReg: o.fromReg }));
    const core = analyzeEmailCore(
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
    const total = Object.values(core.sum).reduce((a, b) => a + b, 0);
    const P = sig(BIAS + K * total);
    out.push({
      ...core,
      id: "PG-" + (1131 + i * 7),
      ts: now - s.mins * 60000,
      src: "sample",
      T,
      P,
      localP: P,
      engine: "local",
      modelVersion: "local-preview",
      decision: P >= T ? "PHISHING" : "SAFE",
      risk: P >= T ? "High" : "Low",
    });
  });
  return out.sort((a, b) => b.ts - a.ts);
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

export function PhishGuardProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [usage, setUsage] = useState<{ scans: number; calls: number }>({ scans: 0, calls: 0 });
  const [evalArtifact, setEvalArtifactState] = useState<EvalArtifact | null>(null);
  const [scans, setScans] = useState<ScanItem[]>(() => buildInitialScans(DEFAULT_SETTINGS.T));

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
      const sessionEmail = localStorage.getItem("phishintel-session") || localStorage.getItem("phishguard-session");
      if (sessionEmail) {
        const rawUsers = localStorage.getItem("phishintel-users") || localStorage.getItem("phishguard-users");
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
          if (parsed.org === "PhishGuard Labs" || parsed.org === "PhishIntel Labs") parsed.org = "";
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

    // 6. User Scans
    try {
      const userScans: ScanItem[] = JSON.parse(localStorage.getItem("pg.scans") || "[]");
      if (userScans.length > 0) {
        setScans((prev) => {
          const existingIds = new Set(userScans.map((s) => s.id));
          const filteredPrev = prev.filter((s) => !existingIds.has(s.id));
          return [...userScans, ...filteredPrev].sort((a, b) => b.ts - a.ts);
        });
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
              sender: "test@phishguard.local",
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
            ? "PhishGuard backend request timed out."
            : err instanceof Error
              ? err.message
              : String(err)
        );
      }
    },
    [settings.endpoint, settings.useService]
  );

  // Run email analysis
  const runScan = useCallback(
    async (email: ScanEmailInput): Promise<ScanItem> => {
      const prior = scans.map((s) => ({ fromReg: s.fromReg }));
      const core = analyzeEmailCore(email, prior);
      const svcRes = await callService(email);

      const localP = sig(BIAS + K * Object.values(core.sum).reduce((a, b) => a + b, 0));
      const P = svcRes ? svcRes.p : localP;
      const isService = !!svcRes;
      const modelVer = svcRes ? svcRes.version : "local-preview";
      const serviceRows: FeatureRow[] = svcRes
        ? svcRes.indicators.map((indicator, index) => {
            const category = (indicator.category || "").toLowerCase();
            const branch: FeatureRow["b"] = category.includes("url")
              ? "url"
              : category.includes("sender") || category.includes("metadata")
                ? "metadata"
                : category.includes("financial")
                  ? "financial"
                  : "security";
            const impact =
              typeof indicator.score_impact === "number" ? indicator.score_impact : 0;
            return {
              id: indicator.id || `API-${index + 1}`,
              b: branch,
              name: indicator.title || "Threat indicator",
              w: impact / 100,
              disp: indicator.severity || "info",
              hit: indicator.description || "",
              contrib: impact / 100,
            };
          })
        : core.rows;
      const serviceSums = { financial: 0, security: 0, url: 0, metadata: 0 };
      serviceRows.forEach((row) => {
        serviceSums[row.b] += row.contrib;
      });

      const id = "PG-" + (2000 + usage.scans + 1 + (Math.floor(Date.now() / 1000) % 1000));
      const newScan: ScanItem = {
        ...core,
        rows: serviceRows,
        sum: isService ? serviceSums : core.sum,
        id,
        ts: Date.now(),
        src: "user",
        T: settings.T,
        P,
        localP,
        engine: isService ? "service" : "local",
        modelVersion: modelVer,
        decision: svcRes
          ? svcRes.isPhishing
            ? "PHISHING"
            : "SAFE"
          : P >= settings.T
            ? "PHISHING"
            : "SAFE",
        riskScore: svcRes?.riskScore,
        indicators: svcRes?.indicators,
        risk: svcRes
          ? svcRes.riskScore >= 70
            ? "High"
            : "Low"
          : P >= settings.T
            ? "High"
            : "Low",
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
        const sessionUser = typeof window !== "undefined" ? localStorage.getItem("phishguard-session") : null;
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
    setScans((prev) => {
      const remaining = prev.filter((s) => s.src !== "user");
      try {
        localStorage.removeItem("pg.scans");
      } catch {}
      return remaining;
    });
    logActivity("Cleared user scans");
    showToast("Cleared user scans");
  }, [logActivity, showToast]);

  // Delete a single scan permanently
  const deleteScan = useCallback(
    async (scanId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const sessionUser =
          typeof window !== "undefined"
            ? localStorage.getItem("phishintel-session") || localStorage.getItem("phishguard-session")
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
