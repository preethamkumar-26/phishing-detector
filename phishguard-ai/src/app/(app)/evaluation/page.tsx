"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AvailableEvaluationMetrics,
  EvaluationMetricsResponse,
} from "@/types/evaluation";
import { fetchEvaluationMetrics } from "@/services/scanService";

function isAvailable(
  report: EvaluationMetricsResponse | null
): report is AvailableEvaluationMetrics {
  return report?.status === "available";
}

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

  const rankings = useMemo(
    () =>
      isAvailable(report)
        ? [...report.model_ranking].sort((a, b) => a.rank - b.rank)
        : [],
    [report]
  );

  return (
    <div>
      <div className="ph">
        <div>
          <h1>Model evaluation</h1>
          <p>Versioned PAHF-Net metrics and measured baseline comparisons.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-dark" onClick={refresh} disabled={isLoading}>
            {isLoading ? "Loading…" : "Refresh metrics"}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="card mt" role="status">
          Loading evaluation metrics…
        </div>
      )}

      {error && (
        <div className="card mt" role="alert">
          <h2>Metrics unavailable</h2>
          <p className="muted">
            Could not reach the FastAPI evaluation endpoint: {error}
          </p>
          <p className="muted">
            Confirm the backend is running, then refresh to try again.
          </p>
        </div>
      )}

      {!isLoading && !error && report?.status === "unavailable" && (
        <div className="card mt" role="status">
          <h2>Evaluation data is not available yet</h2>
          <p className="muted">
            Add a verified, versioned <code>{report.artifact}</code> file to{" "}
            <code>backend/saved_models/</code>. No performance scores or model
            rankings are shown until that artifact exists.
          </p>
          <button type="button" className="btn btn-line mt" onClick={refresh}>
            Check again
          </button>
        </div>
      )}

      {!isLoading && !error && isAvailable(report) && (
        <>
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
              <div key={label} className="card metric no-hover">
                <div className="lbl">{label}</div>
                <div className="big" style={{ marginTop: 10 }}>
                  {unit === "%"
                    ? `${(Number(value) * 100).toFixed(2)}%`
                    : `${Number(value).toFixed(1)}${unit}`}
                </div>
              </div>
            ))}
          </div>

          <div className="grid g2 mt">
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Model ranking</h2>
                  <p>Rank values are taken from the evaluation artifact.</p>
                </div>
              </div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Classifier</th>
                      <th className="num">Accuracy</th>
                      <th className="num">Precision</th>
                      <th className="num">Recall</th>
                      <th className="num">F1</th>
                      <th className="num">AUC-ROC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((item) => (
                      <tr key={item.model_name}>
                        <td>{item.rank}</td>
                        <td>{item.model_name}</td>
                        <td className="num">{(item.accuracy * 100).toFixed(2)}%</td>
                        <td className="num">{(item.precision * 100).toFixed(2)}%</td>
                        <td className="num">{(item.recall * 100).toFixed(2)}%</td>
                        <td className="num">{(item.f1_score * 100).toFixed(2)}%</td>
                        <td className="num">{(item.auc_roc * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <div>
                  <h2>Evaluation record</h2>
                  <p>Metrics are tied to this dataset and test split.</p>
                </div>
              </div>
              <dl className="kv">
                <dt>Dataset</dt>
                <dd>{report.dataset} · {report.dataset_version}</dd>
                <dt>Split / sample count</dt>
                <dd>{report.split} · {report.sample_count.toLocaleString()}</dd>
                <dt>Threshold</dt>
                <dd>{report.threshold.toFixed(4)}</dd>
                <dt>Evaluated</dt>
                <dd>{new Date(report.evaluated_at).toLocaleString()}</dd>
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
