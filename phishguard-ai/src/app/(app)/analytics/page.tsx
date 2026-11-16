"use client";

import React, { useRef, useMemo } from "react";
import { usePhishGuard } from "@/context/PhishGuardContext";

export default function EvaluationPage() {
  const { evalArtifact, setEvalArtifact, logActivity, showToast } = usePhishGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        const missing = ["model_version", "dataset", "split", "threshold", "date", "n"].filter(
          (k) => json[k] == null
        );
        setEvalArtifact(json);
        logActivity("Loaded evaluation artifact " + (json.model_version || file.name));
        showToast(
          missing.length ? "Loaded. Missing fields: " + missing.join(", ") : "Evaluation artifact loaded",
          !!missing.length
        );
      } catch (err: any) {
        showToast("Could not parse JSON: " + err.message, true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const a = evalArtifact;
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
            PhishGuard metrics appear only when a versioned evaluation artifact is loaded.
          </p>
        </div>
        <div className="actions">
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

      {/* PhishGuard Section */}
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        PhishGuard
      </div>

      {/* 4 Metric Cards */}
      <div className="grid g4" id="eval-metrics">
        {[
          { label: "Accuracy", key: "accuracy" },
          { label: "Precision", key: "precision" },
          { label: "Recall", key: "recall" },
          { label: "F1 score", key: "f1" },
        ].map(({ label, key }) => {
          const val = a && typeof (a as any)[key] === "number" ? (a as any)[key] : null;
          return (
            <div key={key} className="card metric">
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
                {val === null ? "No evaluation artifact loaded" : a?.model_version || ""}
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
              <p>Each reported value needs these fields.</p>
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
                    {val != null ? (k === "n" ? Number(val).toLocaleString() : val) : "required"}
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
