"use client";

import React, { useMemo } from "react";
import { usePhishGuard, ScanItem } from "@/context/PhishGuardContext";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtAbs = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const BR = {
  text: { code: "T", name: "Text representation", dim: 768 },
  financial: { code: "F", name: "Financial", dim: 18 },
  security: { code: "S", name: "Security & phishing", dim: 19 },
  url: { code: "U", name: "URL / domain", dim: 20 },
  metadata: { code: "M", name: "Email metadata", dim: 11 },
};

export default function ExplainabilityPage() {
  const { scans, selectedScanId, setSelectedScanId, selectedScan, formatP } = usePhishGuard();

  const scan = selectedScan;

  // Human-readable narrative explanation
  const explainNarrative = useMemo(() => {
    if (!scan) return "";
    const pos = scan.rows.filter((r) => r.contrib > 0).sort((a, b) => b.contrib - a.contrib).slice(0, 3);
    const neg = scan.rows.filter((r) => r.contrib < 0).sort((a, b) => a.contrib - b.contrib).slice(0, 2);
    const topBranch = Object.entries(scan.abl).sort((a, b) => b[1] - a[1])[0];
    const isPhish = scan.decision === "PHISHING";

    let t = `Classified ${isPhish ? "phishing" : "safe"}: P_phish = ${scan.P.toFixed(3)} ${isPhish ? "≥" : "<"} T = ${scan.T.toFixed(2)}. `;
    if (topBranch && topBranch[1] > 0.01) {
      const bKey = topBranch[0] as keyof typeof BR;
      t += `Removing the ${BR[bKey]?.name.toLowerCase() || topBranch[0]} branch would lower the score by ${topBranch[1].toFixed(3)}, more than any other branch. `;
    }
    if (pos.length) {
      t += `Strongest signals: ${pos.map((r) => `${r.name.toLowerCase()}${r.hit ? ` (“${String(r.hit).slice(0, 48)}”)` : ""}`).join("; ")}. `;
    } else {
      t += "No risk signals were found. ";
    }
    t += neg.length
      ? `Signals pointing the other way: ${neg.map((r) => r.name.toLowerCase()).join(" and ")}.`
      : "No benign signals offset the score.";
    if (scan.engine === "service") {
      t += ` The decision comes from the model service (${scan.modelVersion}). The evidence comes from local rules and may not match what the model relied on.`;
    }
    return t;
  }, [scan]);

  const benignRows = useMemo(() => {
    if (!scan) return [];
    return scan.rows.filter((r) => r.contrib < 0);
  }, [scan]);

  // Text highlights
  const highlightedEvidence = useMemo(() => {
    if (!scan) return null;
    const raw = (scan.email.subject || "") + "\n" + (scan.email.body || "");
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;

    scan.spans.forEach((sp, idx) => {
      if (sp.s > lastIdx) {
        parts.push(raw.slice(lastIdx, sp.s));
      }
      parts.push(
        <mark
          key={idx}
          className={sp.b === "financial" ? "fin" : ""}
          title={`${sp.ids.join(", ")} · ${sp.names.join(", ")}`}
        >
          {raw.slice(sp.s, sp.e)}
        </mark>
      );
      lastIdx = sp.e;
    });

    if (lastIdx < raw.length) {
      parts.push(raw.slice(lastIdx));
    }

    return parts;
  }, [scan]);

  if (!scan) {
    return (
      <div className="section-no-hover">
        <div className="ph">
          <div>
            <h1>Explainability</h1>
            <p>
              Evidence for one scan: feature ablation over the structured branches, rule-based textual evidence, and a
              plain-language summary.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="empty">
            <h4>No scans yet</h4>
            <p>Analyse an email to see its explanation.</p>
          </div>
        </div>
      </div>
    );
  }

  const isPhish = scan.decision === "PHISHING";

  return (
    <div className="section-no-hover">
      {/* Page Header with Scan Picker */}
      <div className="ph">
        <div>
          <h1>Explainability</h1>
          <p>
            Evidence for one scan: feature ablation over the structured branches, rule-based textual evidence, and a
            plain-language summary. Highlighted phrases indicate correlation, not proof of intent.
          </p>
        </div>
        <div className="actions">
          <label htmlFor="xai-pick" className="lbl">
            Scan
          </label>
          <select
            className="select"
            id="xai-pick"
            style={{ minWidth: 320, maxWidth: 420 }}
            value={selectedScanId || scan.id}
            onChange={(e) => setSelectedScanId(e.target.value)}
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.decision === "PHISHING" ? "Phishing" : "Safe"} · {s.email.subject.slice(0, 48)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Grid: Summary Card & Score Card */}
      <div className="grid g-2-1">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="row" style={{ gap: 8 }}>
                <span className={`verdict ${isPhish ? "v-phish" : "v-safe"}`}>
                  {isPhish ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.5 1.5 21h21L12 2.5Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4.5Z" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="m5 12.5 4.5 4.5L19 7" />
                    </svg>
                  )}
                  {isPhish ? "Phishing" : "Safe"}
                </span>
                <span className="tag">
                  {scan.engine === "service" ? `service · ${scan.modelVersion}` : "local preview"}
                </span>
                <span className="tag">{scan.id}</span>
              </div>
            </div>
            <span className="mono muted" style={{ fontSize: "12px" }}>
              {fmtAbs(scan.ts)}
            </span>
          </div>

          <h2 style={{ fontWeight: 400, fontSize: "21px", margin: "0 0 4px", letterSpacing: "-0.01em" }}>
            {scan.email.subject}
          </h2>
          <div className="mono muted" style={{ fontSize: "12px", marginBottom: 18 }}>
            {scan.email.from}
            {scan.email.replyTo ? " · reply-to " + scan.email.replyTo : ""}
          </div>

          <p className="explain" style={{ margin: 0 }}>
            {explainNarrative}
          </p>

          <p className="note" style={{ margin: "16px 0 0" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <span>
              Generated from the evidence below. A highlighted phrase is correlated with the decision. It is not proof of
              intent.
            </span>
          </p>
        </div>

        {/* Score Card */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Score</h3>
              <p>Bound to this scan and the threshold in force at the time.</p>
            </div>
          </div>
          <dl className="kv">
            <dt>P<sub>phish</sub></dt>
            <dd>{scan.P.toFixed(4)}</dd>
            <dt>Threshold T</dt>
            <dd>{scan.T.toFixed(2)}</dd>
            <dt>Margin</dt>
            <dd>{(scan.P - scan.T >= 0 ? "+" : "−") + Math.abs(scan.P - scan.T).toFixed(3)}</dd>
            <dt>Risk</dt>
            <dd>{scan.risk}</dd>
            <dt>Engine</dt>
            <dd>{scan.engine === "service" ? "service" : "local preview"}</dd>
            <dt>Model version</dt>
            <dd>{scan.modelVersion}</dd>
            <dt>Explanation method</dt>
            <dd>ablation + rules</dd>
          </dl>
        </div>
      </div>

      {/* Second Grid: Feature Ablation & Extracted Entities */}
      <div className="grid g2 mt">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Feature ablation</h3>
              <p>Change in P<sub>phish</sub> when each structured branch is removed and the email is re-scored.</p>
            </div>
          </div>

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
            const val = scan.abl[b];
            const w = Math.min(50, Math.abs(val) * 100);
            return (
              <div key={b} className="abl">
                <span>
                  {labels[b]} <span className="mono" style={{ opacity: 0.6 }}>{dims[b]}</span>
                </span>
                <div className="track" style={{ background: "var(--card-3)" }}>
                  <i
                    style={
                      val >= 0
                        ? { left: "50%", width: `${w}%`, background: "var(--phish)" }
                        : { right: "50%", width: `${w}%`, background: "var(--safe)" }
                    }
                  />
                  <i style={{ left: "50%", width: 1, background: "var(--line)" }} />
                </div>
                <span className="v">
                  {val >= 0 ? "+" : "−"}
                  {Math.abs(val).toFixed(3)}
                </span>
              </div>
            );
          })}

          <div className="legend" style={{ marginTop: 14 }}>
            <span>
              <i style={{ background: "var(--phish)" }} />
              raises risk
            </span>
            <span>
              <i style={{ background: "var(--safe)" }} />
              lowers risk
            </span>
            <span style={{ marginLeft: "auto" }}>text branch requires trained weights</span>
          </div>
        </div>

        {/* Extracted Entities */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Extracted entities</h3>
              <p>Card and account numbers are masked.</p>
            </div>
          </div>
          <div className="ent">
            <span className="tag">sector · {scan.entities.sector}</span>
            {scan.entities.amounts.map((a, i) => (
              <span key={i} className="tag">
                amount · {a}
              </span>
            ))}
            {scan.entities.tx && <span className="tag">transaction · {scan.entities.tx}</span>}
            {scan.entities.cards.map((c, i) => (
              <span key={i} className="tag">
                card · {c}
              </span>
            ))}
            {scan.entities.accts.map((a, i) => (
              <span key={i} className="tag">
                account · {a}
              </span>
            ))}
            {scan.entities.orgs.map((o, i) => (
              <span key={i} className="tag">
                org · {o}
              </span>
            ))}
          </div>

          <div className="card-head" style={{ margin: "22px 0 10px" }}>
            <div>
              <h3 style={{ fontSize: "15px" }}>URLs</h3>
            </div>
            <span className="mono muted" style={{ fontSize: "12px" }}>
              {scan.urls.length}
            </span>
          </div>
          {scan.urls.length ? (
            scan.urls.map((u, i) => (
              <div
                key={i}
                className="mono"
                style={{ fontSize: "12px", padding: "6px 0", borderTop: "1px solid var(--line-2)", wordBreak: "break-all" }}
              >
                {u}
              </div>
            ))
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
              No URLs in this message.
            </p>
          )}
        </div>
      </div>

      {/* Textual Evidence */}
      <div className="card mt">
        <div className="card-head">
          <div>
            <h3>Textual evidence</h3>
            <p>Rule-based phrase detection over the parsed subject and body.</p>
          </div>
          <div className="legend">
            <span>
              <i style={{ background: "rgba(239,106,30,.5)" }} />
              security
            </span>
            <span>
              <i style={{ background: "rgba(168,102,42,.5)" }} />
              financial
            </span>
          </div>
        </div>
        <div className="evidence">{highlightedEvidence}</div>

        {benignRows.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="lbl" style={{ marginBottom: 8 }}>
              Benign evidence
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {benignRows.map((r) => (
                <span key={r.id} className="verdict v-safe" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {r.id} · {r.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
