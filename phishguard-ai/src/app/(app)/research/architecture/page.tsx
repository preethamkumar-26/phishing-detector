"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  ArrowDown,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Mail,
  Link2,
  FileText,
  Activity,
  Maximize2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

// Feature definitions from authoritative blueprint
const FINANCIAL_FEATURES = [
  { id: "f1-1", name: "Amount Count", desc: "Frequency of explicit numerical currency values" },
  { id: "f1-2", name: "Currency", desc: "Detection of currency symbols and standard codes (USD, EUR, INR, GBP)" },
  { id: "f1-3", name: "Monetary Value Reference", desc: "Lexical tokens referencing financial balances and sums" },
  { id: "f1-4", name: "Payment Amount", desc: "Contextual mentions of outstanding or overdue payment totals" },
  { id: "f1-5", name: "Bank Name", desc: "Recognized banking institution identifiers in email body or subject" },
  { id: "f1-6", name: "Financial Brand Mention", desc: "Recognized fintech, card issuer, or merchant brand entities" },
  { id: "f1-7", name: "Transaction Type", desc: "Categorization (wire, refund, withdrawal, charge, credit, transfer)" },
  { id: "f1-8", name: "Transfer Request", desc: "Imperative language demanding funds or account transfers" },
  { id: "f1-9", name: "Payment Method", desc: "Specified transfer mechanisms (gift card, crypto, wire, ACH, card)" },
  { id: "f1-10", name: "Beneficiary", desc: "Third-party payee, account holder, or recipient identification" },
  { id: "f1-11", name: "Billing Reference", desc: "Presence of invoice IDs, billing cycles, or receipt tokens" },
  { id: "f1-12", name: "Invoice Reference", desc: "Structured invoice terminology or attached invoice mentions" },
  { id: "f1-13", name: "Loan Reference", desc: "Credit lines, loan approvals, or mortgage payment phrasing" },
  { id: "f1-14", name: "Card Number", desc: "Patterns matching credit, debit, or prepaid card formats" },
  { id: "f1-15", name: "Password/Credential Request", desc: "Requests for PIN, OTP, CVV, or banking security codes" },
  { id: "f1-16", name: "Identity Verification", desc: "Demands for SSN, tax ID, or government identification KYC" },
  { id: "f1-17", name: "Personal ID Request", desc: "Prompts asking user to furnish personal identity documents" },
  { id: "f1-18", name: "Payment Request", desc: "Direct payment calls-to-action or simulated outstanding dues" },
];

const SECURITY_FEATURES = [
  { id: "f2-1", name: "Urgency/Pressure", desc: "Time-compressed cues ('immediate action required', 'act now')" },
  { id: "f2-2", name: "Pressure Language", desc: "Coercive psychological framing threatening immediate harm" },
  { id: "f2-3", name: "Deadline Present", desc: "Explicit timestamps or hour countdowns ('within 24 hours')" },
  { id: "f2-4", name: "Fear Language", desc: "Threats of legal action, account suspension, or severe penalties" },
  { id: "f2-5", name: "Legal Consequence", desc: "Mentions of law enforcement, subpoenas, or litigation" },
  { id: "f2-6", name: "Verification Request", desc: "Prompts asking recipient to 'verify your identity' or 're-confirm'" },
  { id: "f2-7", name: "Login Instruction", desc: "Direct instructions to log into an account via provided link" },
  { id: "f2-8", name: "Password Request", desc: "Requests to update, reset, or supply account passwords" },
  { id: "f2-9", name: "Personal Information Request", desc: "Solicitation of personal profile or contact records" },
  { id: "f2-10", name: "Call-to-Action", desc: "Imperative interactive prompts designed to elicit clicks" },
  { id: "f2-11", name: "Click Link Instruction", desc: "Direct cues instructing user to click embedded hyperlinks" },
  { id: "f2-12", name: "Brand Impersonation Claim", desc: "Claims to represent prominent security or tech enterprises" },
  { id: "f2-13", name: "Trust Establishment", desc: "Artificial trust-building rhetoric ('trusted security partner')" },
  { id: "f2-14", name: "Suspicious Request Language", desc: "Anomalous or out-of-band operational requests" },
  { id: "f2-15", name: "Unusual Greeting", desc: "Generic or mismatched salutations ('Dear Customer', 'Valued User')" },
  { id: "f2-16", name: "Lottery/Prize Language", desc: "Unsolicited reward, sweepstakes, or prize notifications" },
  { id: "f2-17", name: "Unexpected Reward Language", desc: "Unearned cash prizes, bonuses, or rebate claims" },
  { id: "f2-18", name: "Excessive Exclamation", desc: "High density of exclamation marks and capitalized words" },
  { id: "f2-19", name: "Security Indicator Count", desc: "Aggregate sum of co-occurring psychological manipulation cues" },
];

const URL_FEATURES = [
  { id: "f3-1", name: "url_length", desc: "Total character length of primary embedded hyperlink" },
  { id: "f3-2", name: "path_length", desc: "Length of URL path component following domain" },
  { id: "f3-3", name: "query_length", desc: "Length of URL parameter query string (?key=val)" },
  { id: "f3-4", name: "dot_count", desc: "Number of period characters in hostname and path" },
  { id: "f3-5", name: "hyphen_count", desc: "Count of hyphens frequently used in lookalike domains" },
  { id: "f3-6", name: "special_char_count", desc: "Count of non-alphanumeric symbols in URL string" },
  { id: "f3-7", name: "subdomain_count", desc: "Number of nested subdomain levels (e.g. login.secure.bank.com)" },
  { id: "f3-8", name: "https_used", desc: "Binary flag indicating TLS/HTTPS protocol presence" },
  { id: "f3-9", name: "ip_address_url", desc: "Flag for raw numerical IP addresses in hostname (e.g. 192.168.1.1)" },
  { id: "f3-10", name: "port_present", desc: "Explicit non-standard TCP port specification in URL (e.g. :8080)" },
  { id: "f3-11", name: "url_encoding_present", desc: "Presence of percent-encoded characters (%20, %2F, %40)" },
  { id: "f3-12", name: "url_shortener", desc: "Domain matches known URL shortening service (bit.ly, tinyurl)" },
  { id: "f3-13", name: "redirect_parameter", desc: "Presence of open-redirect parameters (?url=, ?redirect=)" },
  { id: "f3-14", name: "multiple_protocol_pattern", desc: "Multiple protocol schemes embedded in path (http://...https://)" },
  { id: "f3-15", name: "@_symbol_request", desc: "Presence of '@' character in URL which discards leading auth" },
  { id: "f3-16", name: "brand_domain_mismatch", desc: "Claimed email brand does not match destination URL domain" },
  { id: "f3-17", name: "lookalike_domain", desc: "Typosquatting distance from high-profile legitimate domains" },
  { id: "f3-18", name: "domain_length", desc: "Character count of registered domain name" },
  { id: "f3-19", name: "digit_count_in_domain", desc: "Quantity of numerical digits in hostname" },
  { id: "f3-20", name: "entropy_of_domain", desc: "Shannon entropy measuring randomness in domain string" },
];

const METADATA_FEATURES = [
  { id: "f4-1", name: "sender_domain_present", desc: "Sender domain parsed cleanly from RFC 5322 From header" },
  { id: "f4-2", name: "display_name_present", desc: "Presence of human-readable display name string" },
  { id: "f4-3", name: "display_name_domain_match", desc: "Consistency between display name brand and sending domain" },
  { id: "f4-4", name: "from_replyto_mismatch", desc: "Discrepancy between From: address and Reply-To: header" },
  { id: "f4-5", name: "sender_domain_frequency", desc: "Corpus-level historical frequency of sending domain" },
  { id: "f4-6", name: "from_url_domain_match", desc: "Alignment between sending domain and destination URL host" },
  { id: "f4-7", name: "from_url_domain_mismatch", desc: "Explicit conflict between sender identity and link target" },
  { id: "f4-8", name: "replyto_url_domain_mismatch", desc: "Conflict between reply routing and embedded link domains" },
  { id: "f4-9", name: "sender_domain_consistency", desc: "Consistency check across Return-Path and Message-ID headers" },
  { id: "f4-10", name: "received_hop_count", desc: "Number of MTA transit relays in Received: header trace" },
  { id: "f4-11", name: "originating_ip_present", desc: "Presence of client IP address in Received: headers" },
];

export default function ArchitecturePage() {
  const [selectedBranch, setSelectedBranch] = useState<"text" | "financial" | "security" | "url" | "metadata">("text");
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Blueprint Status Notice */}
      <DemoDataNotice
        message="Final Architecture Specification — End-to-end multi-branch feature representation, 836-dimensional concatenation fusion, custom residual representation network (built from scratch without BERT, CNN, GRU, or Attention), and validation-calibrated threshold decision."
        variant="banner"
      />

      {/* Page Header with Action Buttons */}
      <PageHeader
        title="Model Architecture"
        description="Comprehensive technical specification of PhishGuard AI's multi-branch neural pipeline: parallel feature extraction, 836-d concatenation fusion, custom residual representation learning, and validation-tuned threshold classification."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBlueprintModalOpen(true)}
            className="flex items-center gap-1.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            <span>View Blueprint Diagram</span>
          </Button>
          <a
            href="/images/model-architecture-diagram.png"
            download="PhishGuard-AI-Architecture-Blueprint.png"
            className="inline-flex items-center"
          >
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Download className="w-3.5 h-3.5" />
              <span>Download Blueprint</span>
            </Button>
          </a>
        </div>
      </PageHeader>

      {/* Blueprint Architecture Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[var(--primary-accent)] shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <span>Custom Multi-Branch Representation &amp; Residual Pipeline</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                From Scratch
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Engineered specifically for financial email threat detection — independent of monolithic transformer or recurrent backbones (no BERT, CNN, GRU, or Attention).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] shrink-0 bg-[var(--bg-surface)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
          <span>Fused Dimension:</span>
          <span className="font-bold text-[var(--primary-accent)]">836-d</span>
          <span className="text-[var(--border-color)]">|</span>
          <span>Latent:</span>
          <span className="font-bold text-emerald-400">256-d</span>
        </div>
      </div>

      {/* STAGE 1: INPUT: FINANCE-RELATED EMAIL */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Input: Finance-Related Email
            </h2>
          </div>
          <Badge variant="accent" size="sm">Ingestion Stage</Badge>
        </div>

        <Card phase={1} className="border-[var(--border-color)] bg-[var(--bg-surface)]/80">
          <CardContent className="p-5">
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Ingests raw candidate messages comprising header metadata, structured envelope attributes, and multi-part MIME payloads across seven key extraction channels:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span>Subject</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  eg: &quot;Your bill is due&quot;, &quot;Urgent transaction review requested&quot;
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Body (HTML / Text)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  eg: Transaction logs, account alerts, payment instructions
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sender (`From`) &amp; `Reply-To`</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  eg: support@bank.com vs. reply-to routing mismatch
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>URLs &amp; Headers</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-mono">
                  eg: bit.ly, IP urls, Outlook / Yahoo transit relay hops
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Downward Transition Arrow */}
      <div className="flex justify-center -my-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary-accent)] shadow-sm">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* STAGE 2: EMAIL PARSING AND PREPROCESSING */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Email Parsing and Preprocessing
            </h2>
          </div>
          <Badge variant="outline" size="sm">Normalization Pipeline</Badge>
        </div>

        <Card phase={2} className="border-[var(--border-color)] bg-[var(--bg-surface)]/80">
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { step: "2.1", title: "MIME/HTML Decoding", desc: "Quoted-printable & Base64 decoding" },
                { step: "2.2", title: "HTML to Text", desc: "DOM traversal & plaintext extraction" },
                { step: "2.3", title: "Strip Noise", desc: "Remove boilerplate, scripts & styling" },
                { step: "2.4", title: "Field Separation", desc: "Split Subject, Body, URLs & Headers" },
                { step: "2.5", title: "Text Normalization", desc: "Lowercasing & character sanitization" },
                { step: "2.6", title: "URL Cleaning", desc: "Protocol canonicalization & unshortening" },
              ].map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] font-mono font-bold text-purple-400 block">{s.step}</span>
                  <div className="text-xs font-bold text-[var(--text-primary)]">{s.title}</div>
                  <div className="text-[10px] text-[var(--text-muted)] leading-tight">{s.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Downward Transition Arrow */}
      <div className="flex justify-center -my-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-purple-400 shadow-sm">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* STAGES 3-7: FIVE FEATURE BRANCHES */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-center">
              3–7
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Five Parallel Feature Extraction Branches
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Total Dimensionality: 768 + 18 + 19 + 20 + 11 = 836 features
          </span>
        </div>

        {/* Feature Branch Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: "text", label: "3. Text Branch", dim: "768-d", color: "rose" },
            { id: "financial", label: "4. Financial", dim: "18-d", color: "emerald" },
            { id: "security", label: "5. Security", dim: "19-d", color: "sky" },
            { id: "url", label: "6. URL / Domain", dim: "20-d", color: "amber" },
            { id: "metadata", label: "7. Metadata", dim: "11-d", color: "purple" },
          ].map((tab) => {
            const active = selectedBranch === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedBranch(tab.id as typeof selectedBranch)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  active
                    ? "bg-[var(--bg-surface)] border-[var(--primary-accent)] shadow-sm"
                    : "bg-[var(--bg-elevated)]/60 border-[var(--border-color)] hover:border-slate-500"
                }`}
              >
                <div className="text-xs font-bold text-[var(--text-primary)]">{tab.label}</div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5 flex items-center justify-between">
                  <span>Dimension:</span>
                  <span className="font-bold text-[var(--primary-accent)]">{tab.dim}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Branch Detailed View */}
        <Card phase={3} className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardHeader className="p-5 pb-3 border-b border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  {selectedBranch === "text" && <span className="text-rose-400">Branch 3: Text Feature Representation</span>}
                  {selectedBranch === "financial" && <span className="text-emerald-400">Branch 4: Financial Feature Extraction</span>}
                  {selectedBranch === "security" && <span className="text-sky-400">Branch 5: Security &amp; Phishing Feature Extraction</span>}
                  {selectedBranch === "url" && <span className="text-amber-400">Branch 6: URL &amp; Domain Feature Extraction</span>}
                  {selectedBranch === "metadata" && <span className="text-purple-400">Branch 7: Email Metadata Feature Extraction</span>}
                </CardTitle>
                <CardDescription>
                  {selectedBranch === "text" && "Source: Email content (Subject + Body + URLs) via Python n-gram tokenization, embedding lookup, and pooling projection."}
                  {selectedBranch === "financial" && "Source: Text content evaluated for 18 distinct financial, billing, and credential-seeking constructs."}
                  {selectedBranch === "security" && "Source: Text content evaluated for 19 psychological coercion, urgency, and security deception cues."}
                  {selectedBranch === "url" && "Source: Extracted hyperlinks evaluated for 20 structural, lexical, and behavioral threat patterns."}
                  {selectedBranch === "metadata" && "Source: RFC 5322 headers and MTA transit traces evaluated for 11 routing and domain consistency signals."}
                </CardDescription>
              </div>
              <Badge variant="accent" size="sm">
                Output Vector:{" "}
                {selectedBranch === "text" && "h_text (768-d)"}
                {selectedBranch === "financial" && "h_financial (18-d)"}
                {selectedBranch === "security" && "h_security (19-d)"}
                {selectedBranch === "url" && "h_url (20-d)"}
                {selectedBranch === "metadata" && "h_metadata (11-d)"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {/* BRANCH 3: TEXT DETAILED PIPELINE */}
            {selectedBranch === "text" && (
              <div className="space-y-4">
                <div className="text-xs text-[var(--text-muted)]">
                  Sequential tokenization and representation pipeline generating high-dimensional textual context:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block">Stage 3.1</span>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Custom Text Tokenizer</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Python n-gram tokenization applied across Subject + Body + URLs</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block">Stage 3.2</span>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Vocabulary &amp; Embedding</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Max Vocab: 50,000 | Trainable Matrix: 50,000 × 128</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block">Stage 3.3</span>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Sequence Aggregation</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Token Sequence (1–128) → Mean / Max Pooling (256-d)</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block">Stage 3.4</span>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Linear Projection</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Dimension expansion: 256 → 768 dimensions (Output: <code className="text-rose-400 font-mono">h_text</code>)</div>
                  </div>
                </div>
              </div>
            )}

            {/* BRANCH 4: FINANCIAL FEATURES TABLE */}
            {selectedBranch === "financial" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {FINANCIAL_FEATURES.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-start gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                      {f.id}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate">{f.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] leading-tight">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BRANCH 5: SECURITY FEATURES TABLE */}
            {selectedBranch === "security" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {SECURITY_FEATURES.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-start gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 shrink-0">
                      {f.id}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate">{f.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] leading-tight">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BRANCH 6: URL FEATURES TABLE */}
            {selectedBranch === "url" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {URL_FEATURES.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-start gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
                      {f.id}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate">{f.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] leading-tight">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* BRANCH 7: METADATA FEATURES TABLE */}
            {selectedBranch === "metadata" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {METADATA_FEATURES.map((f) => (
                  <div key={f.id} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-start gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 shrink-0">
                      {f.id}
                    </span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate">{f.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] leading-tight">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Downward Transition Arrow */}
      <div className="flex justify-center -my-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-cyan-400 shadow-sm">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* STAGE 8: FEATURE FUSION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center justify-center">
              8
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Feature Fusion: Concatenation (836-d)
            </h2>
          </div>
          <Badge variant="accent" size="sm">Vector Concatenation</Badge>
        </div>

        <Card phase={4} className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              All five branch representation vectors are concatenated along the feature axis into an aggregate 836-dimensional representation vector (<code className="text-cyan-400 font-mono">h_fused</code>). Unlike summation or pooling, concatenation preserves exact per-channel signals without loss of domain identity:
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold">
                h_text (768-d)
              </span>
              <span className="text-[var(--text-muted)] font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                h_financial (18-d)
              </span>
              <span className="text-[var(--text-muted)] font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold">
                h_security (19-d)
              </span>
              <span className="text-[var(--text-muted)] font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
                h_url (20-d)
              </span>
              <span className="text-[var(--text-muted)] font-bold">+</span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 font-semibold">
                h_metadata (11-d)
              </span>
              <span className="text-[var(--text-muted)] font-bold">=</span>
              <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                h_fused (836-d)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Downward Transition Arrow */}
      <div className="flex justify-center -my-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-indigo-400 shadow-sm">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* STAGE 9: CUSTOM REPRESENTATION LEARNING NETWORK */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center justify-center">
              9
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Custom Feature Interaction &amp; Representation Learning Network
            </h2>
          </div>
          <Badge variant="accent" size="sm">From Scratch — No BERT/CNN/GRU</Badge>
        </div>

        <Card phase={5} className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Proprietary deep interaction network built from scratch using residual blocks and layer normalization to model multi-modal feature co-dependencies while preventing vanishing gradients:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch">
              {/* Step 9.1: Feature Projection */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 block">Stage 9.1</span>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Feature Projection</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">Linear dimension reduction mapping the fused vector:</div>
                </div>
                <div className="text-center py-2 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono text-xs font-bold text-indigo-400">
                  836 → 512
                </div>
              </div>

              {/* Step 9.2: Residual Block 1 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-indigo-500/30 space-y-2 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-1 right-2 text-[9px] font-mono text-indigo-400 font-bold uppercase">
                  Skip ⊕
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 block">Stage 9.2</span>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Residual Block 1 (512)</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 space-y-0.5 font-mono">
                    <div>• Linear(512) → ReLU</div>
                    <div>• Dropout (0.3)</div>
                    <div>• Linear(512) + Residual Skip</div>
                  </div>
                </div>
                <div className="text-center py-1.5 px-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono text-[11px] font-bold text-indigo-300">
                  Dim: 512 → 512
                </div>
              </div>

              {/* Step 9.3: Residual Block 2 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-indigo-500/30 space-y-2 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-1 right-2 text-[9px] font-mono text-indigo-400 font-bold uppercase">
                  Skip ⊕
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 block">Stage 9.3</span>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Residual Block 2 (512 → 256)</div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1 space-y-0.5 font-mono">
                    <div>• Linear(512) → ReLU</div>
                    <div>• Dropout (0.2)</div>
                    <div>• Linear(256) + Residual Skip</div>
                  </div>
                </div>
                <div className="text-center py-1.5 px-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono text-[11px] font-bold text-indigo-300">
                  Dim: 512 → 256
                </div>
              </div>

              {/* Step 9.4: Global Representation (LayerNorm) */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 block">Stage 9.4</span>
                  <div className="text-xs font-bold text-[var(--text-primary)]">Global Representation</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    Layer Normalization (<code className="text-indigo-400 font-mono">LayerNorm</code>) stabilizes activations across diverse feature ranges.
                  </div>
                </div>
                <div className="text-center py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs font-bold text-emerald-400">
                  Output: h_repr (256-d)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Downward Transition Arrow */}
      <div className="flex justify-center -my-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-red-400 shadow-sm">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* STAGE 10: PHISHING CLASSIFICATION HEAD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold flex items-center justify-center">
              10
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Phishing Classification Head (From Scratch)
            </h2>
          </div>
          <Badge variant="outline" size="sm">Dense Classification Pipeline</Badge>
        </div>

        <Card phase={6} className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-mono">
              <span className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-bold text-emerald-400">
                h_repr (256-d)
              </span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                Dense (128)
              </span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">ReLU</span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">Dropout (0.3)</span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                Dense (64)
              </span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">ReLU</span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">Dropout (0.2)</span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)]">
                Dense (1)
              </span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">Sigmoid</span>
              <span className="text-[var(--text-muted)] font-bold">→</span>
              <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                P_phish (0 – 1)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Downward Transition Arrow */}
      <div className="flex justify-center -my-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-teal-400 shadow-sm">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* STAGE 11: DECISION (VALIDATION-TUNED THRESHOLD) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 text-xs font-bold flex items-center justify-center">
              11
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Decision: Validation-Tuned Threshold
            </h2>
          </div>
          <Badge variant="accent" size="sm">Decision Rule: P_phish &ge; T</Badge>
        </div>

        <Card phase={1} className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="text-center space-y-1">
                <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                  Evaluation Condition
                </div>
                <div className="text-lg font-mono font-bold text-teal-400 bg-[var(--bg-elevated)] px-4 py-2 rounded-xl border border-[var(--border-color)]">
                  P_phish &ge; T
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  T = Threshold selected during validation set calibration (default: ~0.58)
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-1 min-w-[140px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">Condition: YES</span>
                  <div className="font-bold text-sm text-red-500 dark:text-red-300 flex items-center justify-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>PHISHING</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">Threat Mitigated</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1 min-w-[140px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Condition: NO</span>
                  <div className="font-bold text-sm text-emerald-500 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>SAFE (LEGITIMATE)</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">Clean Message</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Downward Transition Arrow */}
      <div className="flex justify-center -my-2">
        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-blue-400 shadow-sm">
          <ArrowDown className="w-4 h-4" />
        </div>
      </div>

      {/* STAGE 12: OUTPUT, EVIDENCE & EXPLAINABILITY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-bold flex items-center justify-center">
              12
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Output &amp; Three-Pillar Explainability
            </h2>
          </div>
          <Badge variant="accent" size="sm">Evidence &amp; Interpretability</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Output & Evidence Card */}
          <Card phase={2} className="border-[var(--border-color)] bg-[var(--bg-surface)]">
            <CardHeader className="p-5 pb-3 border-b border-[var(--border-color)]">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--primary-accent)]" />
                <span>Output and Forensic Evidence</span>
              </CardTitle>
              <CardDescription>
                Structured forensic indicators and extracted entity records generated alongside the classification verdict.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Input / Transaction Domain</span>
                <p className="text-[var(--text-primary)] font-mono">
                  Financial service context (eg: Amazon Pay, Paytm, NetBanking, Corporate Vendor)
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Phishing Probability &amp; Verdict</span>
                <p className="text-[var(--text-primary)] font-mono">
                  P_phish score (0–1), Discrete Decision (PHISHING / SAFE), Calibrated Risk Tier (HIGH / LOW)
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Detected Indicators</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                  <div>• Behavioral / Email Indicators</div>
                  <div>• Security Coercion Cues</div>
                  <div>• Text / Domain Anomalies</div>
                  <div>• MTA Metadata Signals</div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Extracted Entities</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                  <div>• Institution / Brand</div>
                  <div>• Monetary Amounts</div>
                  <div>• Transaction Types</div>
                  <div>• Account / Card Targets</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Three-Pillar Explainability Card */}
          <Card phase={3} className="border-[var(--border-color)] bg-[var(--bg-surface)]">
            <CardHeader className="p-5 pb-3 border-b border-[var(--border-color)]">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Three-Pillar Explainability Pipeline</span>
              </CardTitle>
              <CardDescription>
                Multi-level interpretability mechanism enabling security analysts to audit model decisions transparently.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono flex items-center justify-center font-bold">1</span>
                  <span>Feature Ablation (Structured Contributions)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Quantifies feature importance by measuring performance drops upon systematically ablating financial, security, URL, and metadata feature groups.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center justify-center font-bold">2</span>
                  <span>Rule-Based Textual Evidence</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Highlights high-confidence keyword matches, deceptive phrase patterns, and benign vs. suspicious linguistic cues directly in the raw email text.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-mono flex items-center justify-center font-bold">3</span>
                  <span>Human-Readable Explanation</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Synthesizes plain-language audit summaries articulating why the model flagged or cleared the message based on correlated threat indicators.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BLUEPRINT DISCREPANCY & VERIFICATION REGISTRY */}
      <Card phase={4} className="border-[var(--border-color)] bg-[var(--bg-surface)]/60">
        <CardHeader
          className="p-4 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => setNotesExpanded(!notesExpanded)}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--primary-accent)]" />
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Blueprint Verification &amp; Diagram Discrepancy Registry
            </CardTitle>
          </div>
          <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            {notesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </CardHeader>
        {notesExpanded && (
          <CardContent className="p-4 pt-0 space-y-3 text-xs text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-color)] mt-1">
            <p>
              Per project specifications, the frontend reflects the authoritative architecture diagram provided by the research team. Below is the transparent audit of diagram typographical artifacts and verified architectural parameters:
            </p>
            <div className="space-y-1.5 font-mono text-[11px] bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-color)]">
              <div>• <strong className="text-[var(--text-primary)]">Liaaoe Projection:</strong> Rendered in diagram text as &quot;Liaaoe Projection (256 → 768)&quot; — verified as Linear Projection layer expanding pooled token embeddings to 768-d.</div>
              <div>• <strong className="text-[var(--text-primary)]">Residual Block 1 (318):</strong> Diagram label reads &quot;Rastigeal Block 1 (318)&quot; — layer operations verify 512-d linear transforms with skip addition.</div>
              <div>• <strong className="text-[var(--text-primary)]">Residual Block 2:</strong> Diagram label reads &quot;Boahigal Block 3 (815 → 256)&quot; — layer operations verify 512 → 256-d linear transform with residual skip addition.</div>
              <div>• <strong className="text-[var(--text-primary)]">Layer Normalization:</strong> Diagram text reads &quot;LayerNioon&quot; — verified as standard PyTorch/TensorFlow LayerNorm normalization block.</div>
              <div>• <strong className="text-[var(--text-primary)]">Metadata Feature Indices:</strong> Image contains a duplicate &quot;f4-5&quot; label — resolved sequentially as f4-4 (from_replyto_mismatch) and f4-5 (sender_domain_frequency).</div>
              <div>• <strong className="text-[var(--text-primary)]">Absence of Monolithic Backbones:</strong> The architecture explicitly contains NO BERT, CNN, GRU, or Attention in its final classification and representation pipeline.</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* HIGH-RES BLUEPRINT MODAL */}
      <Dialog open={blueprintModalOpen} onOpenChange={setBlueprintModalOpen} className="!max-w-5xl !w-[92vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Authoritative Architecture Blueprint</span>
            <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
              1535 × 1024
            </span>
          </DialogTitle>
          <DialogDescription>
            Official PhishGuard AI neural architecture specification diagram from the research documentation.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-slate-950 flex items-center justify-center p-2">
            <Image
              src="/images/model-architecture-diagram.png"
              alt="PhishGuard AI Final Model Architecture Flowchart"
              width={1535}
              height={1024}
              className="w-full h-auto object-contain rounded-lg max-h-[70vh]"
              priority
            />
          </div>
        </div>

        <DialogFooter>
          <a
            href="/images/model-architecture-diagram.png"
            download="PhishGuard-AI-Architecture-Blueprint.png"
            className="inline-flex items-center mr-auto"
          >
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>Download High-Res PNG</span>
            </Button>
          </a>
          <Button variant="primary" size="sm" onClick={() => setBlueprintModalOpen(false)}>
            Close Viewer
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
