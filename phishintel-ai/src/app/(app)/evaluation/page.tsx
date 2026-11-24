"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EvaluationMetricsResponse,
  isLegacyEvaluation,
  isPAHFNetEvaluation,
} from "@/types/evaluation";
import { fetchEvaluationMetrics } from "@/services/scanService";
import { PerformanceCards } from "@/components/evaluation/PerformanceCards";
import { RocCurveCard } from "@/components/evaluation/RocCurveCard";
import { ClassificationReportTable } from "@/components/evaluation/ClassificationReportTable";
import { ConfusionMatrixView } from "@/components/evaluation/ConfusionMatrixView";
import { DatasetSummary } from "@/components/evaluation/DatasetSummary";

export default function EvaluationPage() {
  const [report, setReport] = useState<EvaluationMetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchEvaluationMetrics(controller.signal)
      .then((response) => {
        setReport(response);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load evaluation metrics."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const isPAHF = isPAHFNetEvaluation(report);
  const isLegacy = isLegacyEvaluation(report);

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      {/* Page Header */}
      <div className="ph" style={{ marginBottom: 18 }}>
        <div>
          <div
            className="eyebrow"
            style={{
              marginBottom: 4,
              color: "var(--muted, #555A4E)",
              fontWeight: 600,
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Research Benchmark · Holdout Evaluation
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--ink, #1C1F1A)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            PAHF-Net Model Evaluation
          </h1>
          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--ink-2, #41453D)",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Official holdout test metrics, classification breakdown, ROC operating point, and confusion matrix.
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-dark"
            onClick={refresh}
            disabled={isLoading}
            style={{
              padding: "7px 16px",
              fontSize: "0.82rem",
              fontWeight: 600,
              borderRadius: "var(--r, 6px)",
            }}
          >
            {isLoading ? "Refreshing…" : "Refresh metrics"}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          className="card mt"
          role="status"
          style={{
            padding: "36px 24px",
            textAlign: "center",
            background: "var(--card, #E3E5D6)",
            border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
            borderRadius: "var(--r-lg, 8px)",
          }}
        >
          <div style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--ink, #1C1F1A)" }}>
            Loading evaluation metrics…
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-2, #41453D)", marginTop: 6, marginBottom: 0 }}>
            Querying backend evaluation service and verified benchmark artifacts.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="card mt"
          role="alert"
          style={{
            padding: "20px 24px",
            borderLeft: "4px solid var(--phish, #D8452B)",
            background: "var(--card, #E3E5D6)",
            border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
            borderRadius: "var(--r-lg, 8px)",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink, #1C1F1A)", margin: 0 }}>
            Metrics unavailable
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ink-2, #41453D)", marginTop: 6, marginBottom: 0 }}>
            Could not reach the evaluation endpoint: {error}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--muted, #555A4E)", marginTop: 4, marginBottom: 12 }}>
            Confirm the backend service is running, then refresh to try again.
          </p>
          <button type="button" className="btn btn-line" onClick={refresh}>
            Try again
          </button>
        </div>
      )}

      {/* Unavailable artifact state */}
      {!isLoading && !error && report && "status" in report && report.status === "unavailable" && (
        <div
          className="card mt"
          role="status"
          style={{
            padding: "24px 26px",
            background: "var(--card, #E3E5D6)",
            border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
            borderRadius: "var(--r-lg, 8px)",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink, #1C1F1A)", margin: 0 }}>
            Evaluation data is not available yet
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--ink-2, #41453D)", marginTop: 8, lineHeight: 1.5, marginBottom: 12 }}>
            Add a verified, versioned <code>{report.artifact}</code> file to{" "}
            <code>backend/saved_models/</code> or <code>public/</code>. No performance scores
            or confusion matrices are displayed until that artifact exists.
          </p>
          <button type="button" className="btn btn-line" onClick={refresh}>
            Check again
          </button>
        </div>
      )}

      {/* Primary PAHF-Net Evaluation Presentation */}
      {!isLoading && !error && isPAHF && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Section 1: 7 Overall Performance Metric Cards in balanced 4 + 3 layout */}
          <PerformanceCards metrics={report.evaluation.summary_metrics} />

          {/* Section 2: PAHF-Net ROC Curve & Operating Point Visualization */}
          <RocCurveCard
            rocAuc={report.evaluation.summary_metrics.roc_auc}
            prAuc={report.evaluation.summary_metrics.pr_auc}
            totalSamples={report.evaluation.total_samples}
          />

          {/* Section 3 & 4: Detailed Classification Report Table & 2x2 Confusion Matrix */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 16,
            }}
          >
            <ClassificationReportTable report={report.evaluation.classification_report} />
            <ConfusionMatrixView matrix={report.evaluation.confusion_matrix} />
          </div>

          {/* Section 5: Dataset Summary & Provenance */}
          <DatasetSummary
            totalSamples={report.evaluation.total_samples}
            classSupport={report.evaluation.class_support}
            dataNotes={report.data_notes}
          />
        </div>
      )}

      {/* Legacy Fallback if old ranking format is loaded */}
      {!isLoading && !error && !isPAHF && isLegacy && (
        <div style={{ marginTop: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {report.model_name} · {report.model_version}
          </div>
          <div className="grid g3" id="evaluation-metrics">
            {[
              ["Accuracy", report.metrics.accuracy, "%"],
              ["Precision", report.metrics.precision, "%"],
              ["Recall", report.metrics.recall, "%"],
              ["F1 score", report.metrics.f1_score, "%"],
              ["AUC-ROC", report.metrics.auc_roc, "%"],
              ["Inference latency", report.metrics.inference_latency_ms, " ms"],
            ].map(([label, value, unit]) => (
              <div key={label} className="card metric no-hover" style={{ background: "var(--card, #E3E5D6)" }}>
                <div className="lbl" style={{ color: "var(--ink-2, #41453D)" }}>{label}</div>
                <div className="big" style={{ marginTop: 10, color: "var(--ink, #1C1F1A)" }}>
                  {unit === "%"
                    ? `${(Number(value) * 100).toFixed(2)}%`
                    : `${Number(value).toFixed(1)}${unit}`}
                </div>
              </div>
            ))}
          </div>

          <div className="grid g2 mt">
            <section className="card" style={{ background: "var(--card, #E3E5D6)" }}>
              <div className="card-head">
                <div>
                  <h2 style={{ color: "var(--ink, #1C1F1A)" }}>Model ranking</h2>
                  <p style={{ color: "var(--ink-2, #41453D)" }}>Rank values are taken from the evaluation artifact.</p>
                </div>
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ color: "var(--ink, #1C1F1A)" }}>Rank</th>
                      <th style={{ color: "var(--ink, #1C1F1A)" }}>Classifier</th>
                      <th className="num" style={{ color: "var(--ink, #1C1F1A)" }}>Accuracy</th>
                      <th className="num" style={{ color: "var(--ink, #1C1F1A)" }}>Precision</th>
                      <th className="num" style={{ color: "var(--ink, #1C1F1A)" }}>Recall</th>
                      <th className="num" style={{ color: "var(--ink, #1C1F1A)" }}>F1</th>
                      <th className="num" style={{ color: "var(--ink, #1C1F1A)" }}>AUC-ROC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.model_ranking.map((item) => (
                      <tr key={item.model_name}>
                        <td style={{ color: "var(--ink, #1C1F1A)" }}>{item.rank}</td>
                        <td style={{ color: "var(--ink, #1C1F1A)" }}>{item.model_name}</td>
                        <td className="num" style={{ color: "var(--ink, #1C1F1A)" }}>{(item.accuracy * 100).toFixed(2)}%</td>
                        <td className="num" style={{ color: "var(--ink, #1C1F1A)" }}>{(item.precision * 100).toFixed(2)}%</td>
                        <td className="num" style={{ color: "var(--ink, #1C1F1A)" }}>{(item.recall * 100).toFixed(2)}%</td>
                        <td className="num" style={{ color: "var(--ink, #1C1F1A)" }}>{(item.f1_score * 100).toFixed(2)}%</td>
                        <td className="num" style={{ color: "var(--ink, #1C1F1A)" }}>{(item.auc_roc * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card" style={{ background: "var(--card, #E3E5D6)" }}>
              <div className="card-head">
                <div>
                  <h2 style={{ color: "var(--ink, #1C1F1A)" }}>Evaluation record</h2>
                  <p style={{ color: "var(--ink-2, #41453D)" }}>Metrics are tied to this dataset and test split.</p>
                </div>
              </div>
              <dl className="kv">
                <dt style={{ color: "var(--ink-2, #41453D)" }}>Dataset</dt>
                <dd style={{ color: "var(--ink, #1C1F1A)" }}>{report.dataset} · {report.dataset_version}</dd>
                <dt style={{ color: "var(--ink-2, #41453D)" }}>Split / sample count</dt>
                <dd style={{ color: "var(--ink, #1C1F1A)" }}>{report.split} · {report.sample_count.toLocaleString()}</dd>
                <dt style={{ color: "var(--ink-2, #41453D)" }}>Threshold</dt>
                <dd style={{ color: "var(--ink, #1C1F1A)" }}>{report.threshold.toFixed(4)}</dd>
                <dt style={{ color: "var(--ink-2, #41453D)" }}>Evaluated</dt>
                <dd style={{ color: "var(--ink, #1C1F1A)" }}>{new Date(report.evaluated_at).toLocaleString()}</dd>
              </dl>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
