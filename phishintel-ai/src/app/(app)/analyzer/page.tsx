"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePhishGuard, SAMPLE_EMAILS, ScanItem } from "@/context/PhishGuardContext";

const ANALYZER_SAMPLES = {
  phish: 4, // "Your Meridian Bank account has been locked"
  bec: 7,   // "Immediate wire transfer needed — confidential"
  safe: 3,  // "Your November e-statement is ready"
};

const STEPS = [
  ["Parse & normalise", "MIME · HTML → text"],
  ["Financial · security cues", "18 + 19 features"],
  ["URL & metadata", "20 + 11 features"],
  ["Fuse & score", "836-d → P_phish"],
  ["Threshold & evidence", "P ≥ T"],
];

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'\])]+/gi;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtAbs = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AnalyzerPage() {
  const router = useRouter();
  const { runScan, settings, setSelectedScanId, showToast, formatP } = usePhishGuard();

  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [body, setBody] = useState("");
  const [urls, setUrls] = useState("");
  const [headers, setHeaders] = useState("");

  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [headersOpen, setHeadersOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [scanResult, setScanResult] = useState<ScanItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Extracted URLs from subject and body
  const detectedUrls = useMemo(() => {
    const raw = (subject + "\n" + body).match(URL_RE) || [];
    const extra = urls.split(/\s+/).filter(Boolean);
    const combined = [...raw, ...extra].map((u) => u.replace(/[.,;:!?)\]]+$/, ""));
    return Array.from(new Set(combined));
  }, [subject, body, urls]);

  // Headers line count
  const headerLinesCount = useMemo(() => {
    return (headers.match(/^[A-Za-z-]+:/gm) || []).length;
  }, [headers]);

  // Fill form with sample
  const handleLoadSample = (sampleKey: "phish" | "bec" | "safe") => {
    setActiveSample(sampleKey);
    const s = SAMPLE_EMAILS[ANALYZER_SAMPLES[sampleKey]];
    setSubject(s.subject || "");
    setFrom(s.from || "");
    setReplyTo(s.replyTo || "");
    setBody(s.body || "");
    setUrls("");
    setHeaders(s.headers || "");
    if (s.headers) setHeadersOpen(true);
  };

  // Clear form
  const handleClear = () => {
    setSubject("");
    setFrom("");
    setReplyTo("");
    setBody("");
    setUrls("");
    setHeaders("");
    setActiveSample(null);
    setScanResult(null);
    bodyTextareaRef.current?.focus();
  };

  // Eml parser
  const parseEml = (txt: string) => {
    const sp = txt.search(/\r?\n\r?\n/);
    const head = sp > -1 ? txt.slice(0, sp) : "";
    let b = sp > -1 ? txt.slice(sp).trim() : txt;
    const unfolded = head.replace(/\r?\n[ \t]+/g, " ");
    const h = (n: string) => ((unfolded.match(new RegExp("^" + n + ":\\s*(.*)$", "im")) || [])[1] || "").trim();
    if (!/^(from|subject|received|return-path):/im.test(unfolded)) return { body: txt };
    if (/quoted-printable/i.test(unfolded)) {
      b = b.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, x) => String.fromCharCode(parseInt(x, 16)));
    }
    if (/content-transfer-encoding:\s*base64/i.test(unfolded) && /^[A-Za-z0-9+/=\s]+$/.test(b)) {
      try {
        b = decodeURIComponent(escape(atob(b.replace(/\s/g, ""))));
      } catch {}
    }
    const hdrLines = unfolded
      .split(/\r?\n/)
      .filter((l) => /^(received|return-path|message-id|x-originating-ip|authentication-results|dkim-signature|x-mailer):/i.test(l))
      .join("\n");
    return { subject: h("Subject"), from: h("From"), replyTo: h("Reply-To"), body: b, headers: hdrLines };
  };

  const handleFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("File is larger than 2 MB. Paste the relevant part instead.", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseEml(String(reader.result));
      setSubject(parsed.subject || "");
      setFrom(parsed.from || "");
      setReplyTo(parsed.replyTo || "");
      setBody(parsed.body || "");
      setHeaders(parsed.headers || "");
      if (parsed.headers) setHeadersOpen(true);
      showToast("Loaded " + file.name);
    };
    reader.readAsText(file);
  };

  // Run analysis execution
  const executeScan = useCallback(async () => {
    if (running) return;
    if (!body.trim() && !subject.trim()) {
      showToast("Add a subject or body first.", true);
      bodyTextareaRef.current?.focus();
      return;
    }

    setRunning(true);
    setScanResult(null);

    // Step-by-step UI progress indicator
    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 160 + Math.random() * 80));
    }

    try {
      const result = await runScan({
        subject,
        from,
        replyTo,
        body,
        urls,
        headers,
      });
      setScanResult(result);
      if (settings.jump) {
        setSelectedScanId(result.id);
        router.push("/explainability");
      }
    } catch (error: unknown) {
      showToast(
        error instanceof Error ? error.message : "Analysis encountered an error.",
        true
      );
    } finally {
      setRunning(false);
      setCurrentStep(-1);
    }
  }, [body, from, headers, replyTo, router, runScan, running, setSelectedScanId, settings.jump, showToast, subject, urls]);

  // Keyboard shortcut Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        executeScan();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [executeScan]);

  const topIndicatorsList = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.rows
      .filter((r) => r.contrib > 0)
      .sort((a, b) => b.contrib - a.contrib)
      .slice(0, 6);
  }, [scanResult]);

  // Semi-circular gauge SVG calculation
  const gaugeSvg = useMemo(() => {
    if (!scanResult) return null;
    const P = scanResult.P;
    const T = scanResult.T;
    const cx = 90, cy = 86, r = 70;
    const pt = (p: number) => [
      cx - r * Math.cos(Math.PI * p),
      cy - r * Math.sin(Math.PI * p),
    ];
    const [x1, y1] = pt(Math.max(0.001, P));
    const [tx, ty] = pt(T);
    const [tx2, ty2] = [
      cx - (r + 9) * Math.cos(Math.PI * T),
      cy - (r + 9) * Math.sin(Math.PI * T),
    ];
    const col = P >= T ? "#FF7A52" : "#3FC891";

    return (
      <svg width="180" height="104" viewBox="0 0 180 104" aria-hidden="true">
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(236,238,229,.08)" strokeWidth="8" />
        <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`} fill="none" stroke={col} strokeWidth="8" />
        <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="#ECEEE5" strokeWidth="1.5" />
        <text x={tx2} y={ty2 - 4} textAnchor="middle" fill="#8C9388" fontFamily="var(--font-jetbrains-mono), monospace" fontSize="9">
          T
        </text>
        <text x={cx} y={cy - 8} textAnchor="middle" fill="#ECEEE5" fontFamily="var(--font-outfit), Outfit, system-ui" fontWeight="300" fontSize="28">
          {formatP(P)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#8C9388" fontFamily="var(--font-outfit), Outfit, system-ui" fontSize="10.5">
          P_phish
        </text>
      </svg>
    );
  }, [formatP, scanResult]);

  // Copy summary
  const handleCopySummary = () => {
    if (!scanResult) return;
    const txt = `${scanResult.id} · ${scanResult.decision} · P_phish ${scanResult.P.toFixed(3)} (T ${scanResult.T.toFixed(2)}) · ${scanResult.engine}\nSubject: ${scanResult.email.subject}\nFrom: ${scanResult.email.from}\nIndicators: ${topIndicatorsList.map((r) => r.id + " " + r.name).join("; ") || "none"}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(
        () => showToast("Summary copied"),
        () => showToast("Clipboard not available", true)
      );
    }
  };

  const handleOpenExplanation = () => {
    if (!scanResult) return;
    setSelectedScanId(scanResult.id);
    router.push("/explainability");
  };

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Email analyzer</h1>
          <p>
            Submit a finance-related email. Subject, body, sender, reply-to, URLs and headers are parsed separately and
            passed through the five feature branches.
          </p>
        </div>
        <div className="actions">
          <div className="seg" role="group" aria-label="Load sample">
            <button
              type="button"
              className={activeSample === "phish" ? "on" : ""}
              onClick={() => handleLoadSample("phish")}
            >
              Sample: phishing
            </button>
            <button
              type="button"
              className={activeSample === "bec" ? "on" : ""}
              onClick={() => handleLoadSample("bec")}
            >
              Sample: BEC
            </button>
            <button
              type="button"
              className={activeSample === "safe" ? "on" : ""}
              onClick={() => handleLoadSample("safe")}
            >
              Sample: legitimate
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Analyzer Grid */}
      <div className="az">
        {/* Left Column: Input Form Card */}
        <div className="card">
          {/* File Dropzone */}
          <div
            className={`drop ${isDragOver ? "over" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Upload email file"
          >
            <span className="ico" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 16V4m0 0-4 4m4-4 4 4" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
            </span>
            <span>
              <b>Drop an .eml or .txt file</b> or browse
              <br />
              <span className="muted" style={{ fontSize: "12px" }}>
                Headers and body are read in this browser. Attachments are not scanned.
              </span>
            </span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".eml,.txt,message/rfc822,text/plain"
              className="sr"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="stack" style={{ marginTop: 16 }}>
            {/* Subject */}
            <div className="field">
              <label htmlFor="f-subject">Subject</label>
              <input
                className="input"
                id="f-subject"
                autoComplete="off"
                placeholder="e.g. Action required: confirm your account"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* From & Reply-To */}
            <div className="grid g2">
              <div className="field">
                <label htmlFor="f-from">From</label>
                <input
                  className="input mono"
                  id="f-from"
                  autoComplete="off"
                  placeholder="Display Name <sender@domain.com>"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="f-reply">Reply-To</label>
                <input
                  className="input mono"
                  id="f-reply"
                  autoComplete="off"
                  placeholder="optional"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                />
              </div>
            </div>

            {/* Body */}
            <div className="field">
              <div className="row between">
                <label htmlFor="f-body" className="lbl">
                  Body <span className="muted">· HTML or plain text</span>
                </label>
                <span className="mono muted" style={{ fontSize: "11px" }}>
                  {body.length.toLocaleString()} chars
                </span>
              </div>
              <textarea
                className="textarea"
                id="f-body"
                ref={bodyTextareaRef}
                rows={10}
                placeholder="Paste the message body. HTML is converted to text before analysis."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {/* URLs */}
            <div className="field">
              <span className="lbl">
                URLs <span className="muted">· extracted automatically, add more below</span>
              </span>
              <div className="url-chips">
                {detectedUrls.length ? (
                  detectedUrls.map((u, i) => (
                    <span key={i} className="tag" title={u}>
                      {u.length > 60 ? u.slice(0, 57) + "…" : u}
                    </span>
                  ))
                ) : (
                  <span className="muted" style={{ fontSize: "12px" }}>
                    No URLs detected yet.
                  </span>
                )}
              </div>
              <input
                className="input mono"
                id="f-urls"
                autoComplete="off"
                placeholder="Additional URLs, space-separated"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
              />
            </div>

            {/* Raw Headers collapsible */}
            <div>
              <button
                type="button"
                className="collapse-btn"
                aria-expanded={headersOpen}
                onClick={() => setHeadersOpen(!headersOpen)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: headersOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
                Raw headers <span className="mono">{headerLinesCount ? `· ${headerLinesCount} lines` : ""}</span>
              </button>
              {headersOpen && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    className="textarea mono"
                    id="f-headers"
                    rows={5}
                    placeholder={"Received: …\nReturn-Path: <…>\nMessage-ID: <…>\nX-Originating-IP: …"}
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div
              className="row between wrap"
              style={{
                borderTop: "1px solid var(--line-2)",
                marginTop: 4,
                paddingTop: 16,
              }}
            >
              <p className="note" style={{ margin: 0, maxWidth: 360 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <span>
                  {settings.useService && settings.endpoint
                    ? "Content is sent to the configured model service for scoring."
                    : "Content stays in this browser. No model service is configured."}
                </span>
              </p>

              <div className="row">
                <button type="button" className="btn btn-line" onClick={handleClear}>
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-accent"
                  disabled={running}
                  onClick={executeScan}
                >
                  Analyse{" "}
                  <kbd
                    style={{
                      background: "rgba(255,255,255,.18)",
                      borderColor: "rgba(255,255,255,.25)",
                      color: "#fff",
                    }}
                  >
                    Ctrl ↵
                  </kbd>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dark Result Panel */}
        <div className="panel-dark result" aria-live="polite">
          {/* Running progress view */}
          {running && (
            <>
              <div className="eyebrow" style={{ color: "var(--dark-muted)" }}>
                Analysing
              </div>
              <div className="steps">
                {STEPS.map((s, i) => {
                  const isRun = currentStep === i;
                  const isDone = currentStep > i;
                  return (
                    <div
                      key={i}
                      className={`step ${isRun ? "run" : ""} ${isDone ? "done" : ""}`}
                    >
                      <span className="dot" />
                      {s[0]}
                      <span className="mono">{s[1]}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty state */}
          {!running && !scanResult && (
            <div className="empty">
              <div className="rings" />
              <h4>Awaiting a message</h4>
              <p>
                Paste an email, drop an .eml file or load a sample. The decision, score and evidence appear here.
              </p>
            </div>
          )}

          {/* Result view */}
          {!running && scanResult && (
            <>
              <div className="res-top">
                <div>
                  <div className="eyebrow" style={{ color: "var(--dark-muted)" }}>
                    Decision
                  </div>
                  <div className={`dec ${scanResult.decision === "PHISHING" ? "phish" : "safe"}`}>
                    {scanResult.decision === "PHISHING" ? "Phishing" : "Safe · legitimate"}
                  </div>
                  <div className="dark-tags">
                    <span className="tag dark">
                      {scanResult.decision === "PHISHING" ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.5 1.5 21h21L12 2.5Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4.5Z" />
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m5 12.5 4.5 4.5L19 7" />
                        </svg>
                      )}
                      {" "}{scanResult.risk} risk
                    </span>
                    <span className="tag dark">T = {scanResult.T.toFixed(2)}</span>
                    <span className="tag dark">
                      {scanResult.engine === "service" ? `service · ${scanResult.modelVersion}` : "local preview"}
                    </span>
                  </div>
                </div>
                {gaugeSvg}
              </div>

              <div
                className="row between mono"
                style={{ fontSize: "11px", color: "var(--dark-muted)", padding: "10px 0 0" }}
              >
                <span>{scanResult.id}</span>
                <span>{fmtAbs(scanResult.ts)}</span>
              </div>

              {/* Branch Ablation */}
              <div className="res-sec">
                <h5>
                  <span>Branch ablation · change in P when removed</span>
                  <span className="mono">ΔP</span>
                </h5>
                <div className="abl">
                  <span>
                    Text representation <span className="mono" style={{ opacity: 0.6 }}>768</span>
                  </span>
                  <div className="track" />
                  <span className="v" style={{ opacity: 0.6 }}>
                    n/a
                  </span>
                </div>
                {(["financial", "security", "url", "metadata"] as const).map((b) => {
                  const dims = { financial: 18, security: 19, url: 20, metadata: 11 };
                  const labels = {
                    financial: "Financial",
                    security: "Security & phishing",
                    url: "URL / domain",
                    metadata: "Email metadata",
                  };
                  const val = scanResult.abl[b];
                  const w = Math.min(50, Math.abs(val) * 100);
                  const pos = "#FF7A52";
                  const neg = "#3FC891";
                  return (
                    <div key={b} className="abl">
                      <span>
                        {labels[b]} <span className="mono" style={{ opacity: 0.6 }}>{dims[b]}</span>
                      </span>
                      <div className="track">
                        <i
                          style={
                            val >= 0
                              ? { left: "50%", width: `${w}%`, background: pos }
                              : { right: "50%", width: `${w}%`, background: neg }
                          }
                        />
                        <i style={{ left: "50%", width: 1, background: "rgba(236,238,229,.25)" }} />
                      </div>
                      <span className="v">
                        {val >= 0 ? "+" : "−"}
                        {Math.abs(val).toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Top Indicators */}
              <div className="res-sec">
                <h5>
                  <span>Top indicators</span>
                  <span className="mono">{scanResult.rows.filter((r) => r.contrib > 0).length} fired</span>
                </h5>
                {topIndicatorsList.length ? (
                  topIndicatorsList.map((r) => (
                    <div key={r.id} className="ind">
                      <span className="code">{r.id}</span>
                      <div style={{ minWidth: 0 }}>
                        <div>{r.name}</div>
                        {r.hit && <div className="h">{String(r.hit).slice(0, 90)}</div>}
                      </div>
                      <span className="mono" style={{ marginLeft: "auto", fontSize: "11.5px", color: "var(--dark-muted)" }}>
                        +{r.contrib.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--dark-muted)" }}>
                    No risk indicators fired.
                  </p>
                )}
              </div>

              {/* Extracted Entities */}
              <div className="res-sec">
                <h5>
                  <span>Extracted entities</span>
                </h5>
                <div className="ent">
                  <span className="tag dark">sector · {scanResult.entities.sector}</span>
                  {scanResult.entities.amounts.map((a, i) => (
                    <span key={i} className="tag dark">
                      amount · {a}
                    </span>
                  ))}
                  {scanResult.entities.tx && (
                    <span className="tag dark">transaction · {scanResult.entities.tx}</span>
                  )}
                  {scanResult.entities.cards.map((c, i) => (
                    <span key={i} className="tag dark">
                      card · {c}
                    </span>
                  ))}
                  {scanResult.entities.accts.map((a, i) => (
                    <span key={i} className="tag dark">
                      account · {a}
                    </span>
                  ))}
                  {scanResult.entities.orgs.map((o, i) => (
                    <span key={i} className="tag dark">
                      org · {o}
                    </span>
                  ))}
                </div>
              </div>

              {scanResult.engine === "local" && (
                <p className="note" style={{ color: "var(--dark-muted)", margin: "6px 0 0" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" />
                  </svg>
                  <span>
                    Local preview: rule-weighted score over the 68 structured features. The text branch needs trained weights and is not included.
                  </span>
                </p>
              )}

              {/* Action Buttons */}
              <div className="res-actions">
                <button type="button" className="btn btn-accent" onClick={handleOpenExplanation}>
                  Open explanation{" "}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M7 17 17 7M8 7h9v9" />
                  </svg>
                </button>
                <button type="button" className="btn btn-dline" onClick={handleCopySummary}>
                  Copy summary
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
