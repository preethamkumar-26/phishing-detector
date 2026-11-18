"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { usePhishGuard } from "@/context/PhishGuardContext";
import { validateAndComputeArtifact, ProcessedEvalArtifact } from "@/lib/evalArtifact";

export default function EvaluationPage() {
  const { evalArtifact, setEvalArtifact, logActivity, showToast } = usePhishGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [artifactHistory, setArtifactHistory] = useState<ProcessedEvalArtifact[]>([]);
  const [activeVersion, setActiveVersion] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pg.eval.history");
      if (raw) {
        const hist: ProcessedEvalArtifact[] = JSON.parse(raw);
        if (Array.isArray(hist) && hist.length > 0) {
          setArtifactHistory(hist);
          if (!evalArtifact && hist[0]) {
            setEvalArtifact(hist[0] as any);
            setActiveVersion(hist[0].model_version);
          }
        }
      }
    } catch {}
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        const res = validateAndComputeArtifact(json);

        if (!res.success || !res.artifact) {
          showToast(`Invalid evaluation artifact: ${res.error}`, true);
          return;
        }

        const computed = res.artifact;
        setEvalArtifact(computed as any);
        setActiveVersion(computed.model_version);

        setArtifactHistory((prev) => {
          const filtered = prev.filter((x) => x.model_version !== computed.model_version);
          const next = [computed, ...filtered];
          try {
            localStorage.setItem("pg.eval.history", JSON.stringify(next));
          } catch {}
          return next;
        });

        logActivity(`Loaded evaluation artifact ${computed.model_version} (${computed.dataset})`);
        showToast(`Evaluation artifact loaded: ${computed.model_version} (n=${computed.n})`);
      } catch (err: any) {
        showToast("Could not parse JSON: " + err.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSelectVersion = (version: string) => {
    const found = artifactHistory.find((x) => x.model_version === version);
    if (found) {
      setEvalArtifact(found as any);
      setActiveVersion(found.model_version);
      showToast(`Switched active evaluation to ${found.model_version}`);
    }
  };

  const a = evalArtifact as any as ProcessedEvalArtifact | null;
  const cm = a?.confusion;

  // ROC Curve SVG construction
  const rocSvg = useMemo(() => {
    const W = 220, H = 180, L = 28, B = 22, pw = W - L - 8, ph = H - B - 8;
    const X = (v: number) => L + v * pw;
    const Y = (v: number) => 8 + (1 - v) * ph;

    let pathD = "";
    if (a && Array.isArray(a.roc) && a.roc.length > 1) {
      const pts = a.roc.slice().sort((p, q) => p[0] - q[0]);
      pathD = pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join(" ");
    }

    return { W, H, L, B, pw, ph, X, Y, pathD };
  }, [a]);

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Model evaluation</h1>
          <p>
            PhishIntel metrics appear only when a versioned evaluation artifact is loaded.
          </p>
        </div>
        <div className="actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {artifactHistory.length > 1 && (
            <select
              value={activeVersion}
              onChange={(e) => handleSelectVersion(e.target.value)}
              className="btn btn-line"
              style={{ padding: "8px 12px", fontSize: "13px" }}
              aria-label="Select loaded artifact version"
            >
              {artifactHistory.map((h) => (
                <option key={h.model_version} value={h.model_version}>
                  {h.model_version} ({h.split})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn btn-dark"
            onClick={() => fileInputRef.current?.click()}
          >
            Load evaluation artifact
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/json,.json"
            className="sr"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* PhishIntel Section */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        PAHF-Net Benchmarks & Metrics
      </div>

      {/* 4 Metric Cards */}
      <div className="grid g4" id="eval-metrics">
        {[
          { label: "Accuracy", key: "accuracy", tip: "Overall proportion of correct classifications" },
          { label: "Precision", key: "precision", tip: "True Phishing / (True Phishing + False Phishing)" },
          { label: "Recall", key: "recall", tip: "True Phishing / (True Phishing + False Safe)" },
          { label: "F1 score", key: "f1", tip: "Harmonic mean of precision and recall" },
        ].map(({ label, key, tip }) => {
          const val = a && typeof (a as any)[key] === "number" ? (a as any)[key] : null;
          return (
            <div key={key} className="card metric" title={tip}>
              <div className="row between">
                <span className="lbl">{label}</span>
                {val !== null && <span className="tag">{a?.split || "test"}</span>}
              </div>
              <div className={`big ${val === null ? "dim" : ""}`} style={{ marginTop: 12 }}>
                {val === null ? (
                  "—"
                ) : (
                  <>
                    {(val * 100).toFixed(2)}
                    <small style={{ color: "var(--muted)" }}>%</small>
                  </>
                )}
              </div>
              <div className="muted" style={{ fontSize: "12px", marginTop: 8 }}>
                {val === null ? (
                  "No evaluation artifact loaded"
                ) : (
                  `${a?.model_version || "PAHF-Net"} · n=${a?.n?.toLocaleString() ?? 0}`
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 Grid: Confusion Matrix, ROC curve, Evaluation metadata */}
      <div className="grid g3 mt">
        {/* Confusion Matrix */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Confusion matrix</h3>
              <p>{a && a.threshold != null ? `At threshold T = ${a.threshold}` : "At threshold T"}</p>
            </div>
          </div>
          <div className="cm">
            <div />
            <div className="ax">pred. phishing</div>
            <div className="ax">pred. safe</div>
            <div className="ax">actual phishing</div>
            <div
              className="cell"
              style={cm ? { background: "var(--dark)", color: "var(--dark-ink)" } : {}}
            >
              <b>{cm ? Number(cm.tp).toLocaleString() : "—"}</b>
              <span className="muted" style={{ fontSize: "10.5px" }}>
                TP
              </span>
            </div>
            <div className="cell">
              <b>{cm ? Number(cm.fn).toLocaleString() : "—"}</b>
              <span className="muted" style={{ fontSize: "10.5px" }}>
                FN
              </span>
            </div>
            <div className="ax">actual safe</div>
            <div className="cell">
              <b>{cm ? Number(cm.fp).toLocaleString() : "—"}</b>
              <span className="muted" style={{ fontSize: "10.5px" }}>
                FP
              </span>
            </div>
            <div
              className="cell"
              style={cm ? { background: "var(--dark)", color: "var(--dark-ink)" } : {}}
            >
              <b>{cm ? Number(cm.tn).toLocaleString() : "—"}</b>
              <span className="muted" style={{ fontSize: "10.5px" }}>
                TN
              </span>
            </div>
          </div>
        </div>

        {/* ROC Curve */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>ROC curve</h3>
              <p>{a?.auc != null ? `AUC = ${Number(a.auc).toFixed(3)}` : "True vs false positive rate"}</p>
            </div>
          </div>
          <svg
            id="roc"
            viewBox={`0 0 ${rocSvg.W} ${rocSvg.H}`}
            width="100%"
            style={{ display: "block" }}
            aria-label="ROC curve display"
          >
            <rect
              x={rocSvg.L}
              y={8}
              width={rocSvg.pw}
              height={rocSvg.ph}
              fill="none"
              stroke="rgba(28,31,26,.12)"
            />
            {[1, 2, 3].map((i) => (
              <React.Fragment key={i}>
                <line
                  x1={rocSvg.X(i / 4)}
                  y1={8}
                  x2={rocSvg.X(i / 4)}
                  y2={8 + rocSvg.ph}
                  stroke="rgba(28,31,26,.06)"
                />
                <line
                  x1={rocSvg.L}
                  y1={rocSvg.Y(i / 4)}
                  x2={rocSvg.L + rocSvg.pw}
                  y2={rocSvg.Y(i / 4)}
                  stroke="rgba(28,31,26,.06)"
                />
              </React.Fragment>
            ))}
            <line
              x1={rocSvg.X(0)}
              y1={rocSvg.Y(0)}
              x2={rocSvg.X(1)}
              y2={rocSvg.Y(1)}
              stroke="rgba(28,31,26,.25)"
              strokeDasharray="3 3"
            />
            <text
              x={rocSvg.L + rocSvg.pw / 2}
              y={rocSvg.H - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#737869"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              FPR
            </text>
            <text
              x={10}
              y={8 + rocSvg.ph / 2}
              fontSize="9"
              fill="#737869"
              fontFamily="var(--font-jetbrains-mono), monospace"
              transform={`rotate(-90 10 ${8 + rocSvg.ph / 2})`}
              textAnchor="middle"
            >
              TPR
            </text>

            {rocSvg.pathD ? (
              <path d={rocSvg.pathD} fill="none" stroke="#EF6A1E" strokeWidth="2" />
            ) : (
              <text
                x={rocSvg.L + rocSvg.pw / 2}
                y={8 + rocSvg.ph / 2}
                textAnchor="middle"
                fontSize="11"
                fill="#737869"
                fontFamily="var(--font-outfit), Outfit, system-ui"
              >
                No ROC data
              </text>
            )}
          </svg>
        </div>

        {/* Evaluation Metadata */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Evaluation record</h3>
              <p>Schema v1 specification verification.</p>
            </div>
          </div>
          <dl className="kv" id="eval-meta">
            {[
              ["Model version", "model_version"],
              ["Dataset", "dataset"],
              ["Dataset version", "dataset_version"],
              ["Split", "split"],
              ["Threshold", "threshold"],
              ["Evaluation date", "date"],
              ["Sample size", "n"],
            ].map(([l, k]) => {
              const val = a ? (a as any)[k] : null;
              return (
                <React.Fragment key={k}>
                  <dt>{l}</dt>
                  <dd style={val != null ? {} : { color: "#A6AA9A" }}>
                    {val != null ? (k === "n" ? Number(val).toLocaleString() : String(val)) : "required"}
                  </dd>
                </React.Fragment>
              );
            })}
          </dl>
        </div>
      </div>
    </div>
  );
}
