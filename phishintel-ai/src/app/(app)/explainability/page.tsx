"use client";

import React, { useMemo } from "react";
import { usePhishGuard } from "@/context/PhishGuardContext";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtAbs = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const PAHF_MODALITIES = {
  text: { code: "g_t", name: "Text (DeBERTa-v3)", dim: 256 },
  url: { code: "g_u", name: "URL features", dim: 32 },
  structure: { code: "g_s", name: "Structure & layout", dim: 32 },
  linguistic: { code: "g_l", name: "Linguistic markers", dim: 32 },
} as const;

export default function ExplainabilityPage() {
  const { scans, selectedScanId, setSelectedScanId, selectedScan, formatP } = usePhishGuard();

  const scan = selectedScan;

  // Safe fallback derivations
  const indicators = useMemo(() => scan?.indicators || [], [scan]);
  const urls = useMemo(() => scan?.urls || [], [scan]);
  const entities = useMemo(
    () =>
      scan?.entities || {
        sector: "General",
        amounts: [],
        tx: "",
        cards: [],
        accts: [],
        orgs: [],
      },
    [scan]
  );
  const modalityContributions = useMemo(
    () => scan?.modalityContributions || { text: 0, url: 0, structure: 0, linguistic: 0 },
    [scan]
  );
  const gateWeights = useMemo(
    () => scan?.gateWeights || { text: 1, url: 1, structure: 1, linguistic: 1 },
    [scan]
  );
  const availabilityMask = useMemo(
    () => scan?.availabilityMask || { text: true, url: true, structure: true, linguistic: true },
    [scan]
  );

  // Human-readable narrative explanation grounded in PAHF-Net
  const explainNarrative = useMemo(() => {
    if (!scan) return "";
    const isPhish = scan.decision === "PHISHING";
    const topModality = Object.entries(modalityContributions).sort((a, b) => b[1] - a[1])[0];
    const activeThreats = indicators.filter((i) => (i.score_impact ?? 0) > 0);

    let t = `Classified ${isPhish ? "phishing" : "safe"}: calibrated P_phish = ${scan.P.toFixed(3)} ${isPhish ? "≥" : "<"} operating threshold T = ${scan.T.toFixed(2)}. `;
    if (topModality && topModality[1] > 0.01) {
      const modName = PAHF_MODALITIES[topModality[0] as keyof typeof PAHF_MODALITIES]?.name || topModality[0];
      const gate = (gateWeights[topModality[0] as keyof typeof PAHF_MODALITIES] ?? 0).toFixed(2);
      t += `Leading modality: ${modName} contributes ${topModality[1] >= 0 ? "+" : ""}${topModality[1].toFixed(3)} to the fused score with gate weight g = ${gate}. `;
    }
    if (activeThreats.length > 0) {
      t += `Key threat signals: ${activeThreats.map((i) => `${i.title}${i.description ? ` (“${i.description.slice(0, 48)}”)` : ""}`).join("; ")}. `;
    } else {
      t += "No high-risk threat indicators were triggered. ";
    }
    const masked = Object.entries(availabilityMask).filter(([_, avail]) => !avail).map(([m]) => m);
    if (masked.length > 0) {
      t += `Availability gating dynamically masked absent modalities: ${masked.join(", ")}. `;
    }
    t += `Architecture: PAHF-Net with availability-gated hierarchical fusion (DeBERTa-v3 256d + 3×32d encoders) and class-conditional DANN.`;
    return t;
  }, [scan, indicators, modalityContributions, gateWeights, availabilityMask]);

  const benignIndicators = useMemo(() => {
    return indicators.filter((r) => r.severity === "low" || (r.score_impact ?? 0) <= 0);
  }, [indicators]);

  // Text highlights based on flagged tokens
  const highlightedEvidence = useMemo(() => {
    if (!scan) return null;
    const raw = (scan.email?.subject || "") + "\n" + (scan.email?.body || "");
    const tokens = scan.flaggedTokens || [];
    if (!tokens.length) {
      return <span>{raw}</span>;
    }

    try {
      const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const re = new RegExp(`(${escaped})`, "gi");
      const parts = raw.split(re);
      return parts.map((part, idx) => {
        const isMatch = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark key={idx} className="fin" title={`Flagged threat signal: ${part}`}>
              {part}
            </mark>
          );
        }
        return <span key={idx}>{part}</span>;
      });
    } catch {
      return <span>{raw}</span>;
    }
  }, [scan]);

  if (!scan) {
    return (
      <div className="section-no-hover">
        <div className="ph">
          <div>
            <h1>Explainability</h1>
            <p>
              Evidence for one scan: PAHF-Net availability-gated modality contributions, DeBERTa-v3 semantic signals, and calibrated risk.
            </p>
          </div>
        </div>
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            No scan selected. Go to <strong>History</strong> or <strong>Email Threat Analyzer</strong> and pick a scan to inspect its evidence.
          </p>
        </div>
      </div>
    );
  }

  const isPhish = scan.decision === "PHISHING";

  return (
    <div className="section-no-hover">
      <div className="ph">
        <div>
          <h1>Explainability</h1>
          <p>
            Detailed evidence and PAHF-Net modality contributions for scan <code>{scan.id}</code>.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select
            className="sel"
            value={selectedScanId || ""}
            onChange={(e) => setSelectedScanId(e.target.value || null)}
            style={{ maxWidth: 360 }}
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.decision} · {formatP(s.P)} · {(s.email?.subject || "(no subject)").slice(0, 32)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Narrative Card */}
      <div className="card narrative-box">
        <div className="row between">
          <div className="lbl">Model Narrative · PAHF-Net Availability-Gated Explanation</div>
          <span className="mono muted" style={{ fontSize: "11.5px" }}>
            {scan.id} · {fmtAbs(scan.ts)}
          </span>
        </div>
        <div className="narrative-text" style={{ marginTop: 10 }}>
          {explainNarrative}
        </div>
      </div>

      {/* First Grid: Scan Details & Score */}
      <div className="grid g2 mt">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Scan metadata</h3>
              <p>Email attributes evaluated by PAHF-Net.</p>
            </div>
            <span className={`verdict ${isPhish ? "v-phish" : "v-safe"}`}>{scan.decision}</span>
          </div>
          <dl className="kv">
            <dt>Scan ID</dt>
            <dd className="mono">{scan.id}</dd>
            <dt>Subject</dt>
            <dd>{scan.email?.subject || "(no subject)"}</dd>
            <dt>Sender</dt>
            <dd className="mono" style={{ wordBreak: "break-all" }}>
              {scan.email?.from || "none"}
            </dd>
            <dt>Sender domain</dt>
            <dd className="mono">{scan.fromDom || "none"}</dd>
            <dt>Registered domain</dt>
            <dd className="mono">{scan.fromReg || "none"}</dd>
            <dt>Reply-To</dt>
            <dd className="mono" style={{ wordBreak: "break-all" }}>
              {scan.email?.replyTo || "(same as sender)"}
            </dd>
            <dt>Source</dt>
            <dd>{scan.src === "sample" ? "Reference sample" : "Live analyst input"}</dd>
          </dl>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3>PAHF-Net Score</h3>
              <p>Calibrated probability bound to operating threshold.</p>
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
            <dd>Availability gates + Modality contributions</dd>
          </dl>
        </div>
      </div>

      {/* Second Grid: Modality Contributions & Extracted Entities */}
      <div className="grid g2 mt">
        <div className="card">
          <div className="card-head">
            <div>
              <h3>PAHF-Net modality contributions</h3>
              <p>Availability-gated hierarchical fusion (h_fused = Σ g_i z_i).</p>
            </div>
          </div>

          {(["text", "url", "structure", "linguistic"] as const).map((m) => {
            const meta = PAHF_MODALITIES[m];
            const val = modalityContributions[m] ?? 0;
            const gate = gateWeights[m] ?? 0;
            const available = availabilityMask[m] ?? true;
            const w = Math.min(50, Math.abs(val) * 100);
            return (
              <div key={m} className="abl">
                <span>
                  {meta.name} <span className="mono" style={{ opacity: 0.6 }}>{meta.code} · {meta.dim}d</span>
                  {!available && <span className="mono" style={{ marginLeft: 6, fontSize: "10px", color: "var(--muted)" }}>[masked]</span>}
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
                  <span style={{ fontSize: "10.5px", opacity: 0.6, marginLeft: 4 }}>
                    (g={gate.toFixed(2)})
                  </span>
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
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--muted)" }}>
              g_i ∈ [0, 1] availability gate
            </span>
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
            <span className="tag">sector · {entities.sector || "General"}</span>
            {(entities.amounts || []).map((a, i) => (
              <span key={i} className="tag">
                amount · {a}
              </span>
            ))}
            {entities.tx && <span className="tag">transaction · {entities.tx}</span>}
            {(entities.cards || []).map((c, i) => (
              <span key={i} className="tag">
                card · {c}
              </span>
            ))}
            {(entities.accts || []).map((a, i) => (
              <span key={i} className="tag">
                account · {a}
              </span>
            ))}
            {(entities.orgs || []).map((o, i) => (
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
              {urls.length}
            </span>
          </div>
          {urls.length ? (
            urls.map((u, i) => (
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

      {/* Textual & Model Evidence */}
      <div className="card mt">
        <div className="card-head">
          <div>
            <h3>Textual evidence</h3>
            <p>Semantic signals and keywords evaluated in DeBERTa-v3 encoding.</p>
          </div>
          <div className="legend">
            <span>
              <i style={{ background: "rgba(239,106,30,.5)" }} />
              threat cue
            </span>
          </div>
        </div>
        <div className="evidence">{highlightedEvidence}</div>

        {/* Model Indicators */}
        <div style={{ marginTop: 16 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>
            PAHF-Net Threat & Verification Indicators ({indicators.length})
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {indicators.map((ind) => (
              <span
                key={ind.id}
                className={`verdict ${ind.severity === "critical" || ind.severity === "high" ? "v-phish" : "v-safe"}`}
                style={{ textTransform: "none", letterSpacing: 0, padding: "4px 8px", fontSize: "12px" }}
                title={ind.description}
              >
                {ind.title} ({(ind.score_impact ?? 0) >= 0 ? "+" : ""}{ind.score_impact ?? 0}%)
              </span>
            ))}
          </div>
        </div>

        {benignIndicators.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="lbl" style={{ marginBottom: 8 }}>
              Benign / low-risk factors
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {benignIndicators.map((r) => (
                <span key={r.id} className="verdict v-safe" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {r.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
