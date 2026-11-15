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

  const litMetrics = [
    { label: "Accuracy", value: 97.22 },
    { label: "Precision", value: 94.26 },
    { label: "Recall", value: 98.71 },
    { label: "F1 score", value: 96.43 },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Model evaluation</h1>
          <p>
            PhishGuard metrics appear only when a versioned evaluation artifact is loaded. Figures from the reference
            study are shown separately as literature context.
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

      {/* Reference study · literature */}
      <div className="eyebrow" style={{ margin: "26px 0 8px" }}>
        Reference study · literature
      </div>
      <div className="grid g-2-1">
        {/* Author-reported results */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Author-reported results</h3>
              <p>Hosseinzadeh et al., Scientific Reports 2025 · Table 9 configuration, as used on the research poster.</p>
            </div>
            <span className="tag acc">not PhishGuard</span>
          </div>

          <div>
            {litMetrics.map(({ label, value }) => (
              <div key={label} className="lit-row">
                <span>{label}</span>
                <div className="track">
                  <i style={{ width: `${(((value - 90) / 10) * 100).toFixed(1)}%` }} />
                </div>
                <span className="v">{value.toFixed(2)}%</span>
              </div>
            ))}
            <div
              className="row between mono muted"
              style={{ fontSize: "10.5px", margin: "4px 0 0 102px", paddingRight: "76px" }}
            >
              <span>90%</span>
              <span>95%</span>
              <span>100%</span>
            </div>
          </div>

          <p className="note" style={{ marginTop: 14 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <span>
              Some narrative sections of the paper pair these metrics inconsistently. These numbers describe that
              study&apos;s BERT-based model on one public dataset. They are not PhishGuard performance.
            </span>
          </p>
        </div>

        {/* Study dataset */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Study dataset</h3>
              <p>Public Kaggle phishing-email collection</p>
            </div>
          </div>
          <div className="big" style={{ color: "var(--ink)", fontSize: "40px" }}>
            18,650<small style={{ color: "var(--muted)" }}>emails</small>
          </div>
          <div className="dist" style={{ marginTop: 16 }}>
            <div style={{ width: "61%", background: "#3A3F38" }}>61% safe</div>
            <div style={{ width: "39%", background: "var(--accent)" }}>39% phishing</div>
          </div>
          <p className="muted" style={{ fontSize: "12.5px", margin: "12px 0 0" }}>
            Empty bodies removed. Single dataset, so wider testing across organisations, languages and new scam types is
            still needed.
          </p>
        </div>
      </div>

      {/* Collapsible JSON schema */}
      <details className="more" style={{ marginTop: 16 }}>
        <summary>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 6 6 6-6 6" />
          </svg>
          Evaluation artifact schema
        </summary>
        <pre className="schema">
          {JSON.stringify(
            {
              model_version: "pg-fusion-836@0.1.0",
              dataset: "pg-finance-mail",
              dataset_version: "2026.11",
              split: "test (time-based, 15%)",
              threshold: 0.55,
              date: "2026-11-15",
              n: 2800,
              accuracy: 0.964,
              precision: 0.941,
              recall: 0.978,
              f1: 0.959,
              confusion: { tp: 1042, fp: 65, tn: 1670, fn: 23 },
              roc: [
                [0, 0],
                [0.02, 0.81],
                [0.05, 0.92],
                [0.1, 0.96],
                [1, 1],
              ],
              auc: 0.978,
            },
            null,
            2
          )}
        </pre>
      </details>
    </div>
  );
}
