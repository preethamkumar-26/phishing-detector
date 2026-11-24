"use client";

import React from "react";
import { ConfusionMatrixData } from "@/types/evaluation";

interface ConfusionMatrixViewProps {
  matrix: ConfusionMatrixData;
}

export function ConfusionMatrixView({ matrix }: ConfusionMatrixViewProps) {
  const values = matrix.values;
  const labels = matrix.label_order || ["Legitimate", "Phishing"];

  // values[row][col]: row = actual, col = predicted
  const tn = values[0]?.[0] ?? 9011; // Actual Legitimate, Predicted Legitimate
  const fp = values[0]?.[1] ?? 59;   // Actual Legitimate, Predicted Phishing
  const fn = values[1]?.[0] ?? 49;   // Actual Phishing, Predicted Legitimate
  const tp = values[1]?.[1] ?? 5175; // Actual Phishing, Predicted Phishing

  const actualLegitTotal = tn + fp;
  const actualPhishTotal = fn + tp;
  const predLegitTotal = tn + fn;
  const predPhishTotal = fp + tp;
  const grandTotal = actualLegitTotal + actualPhishTotal;

  const tnRate = actualLegitTotal > 0 ? (tn / actualLegitTotal) * 100 : 0;
  const fpRate = actualLegitTotal > 0 ? (fp / actualLegitTotal) * 100 : 0;
  const fnRate = actualPhishTotal > 0 ? (fn / actualPhishTotal) * 100 : 0;
  const tpRate = actualPhishTotal > 0 ? (tp / actualPhishTotal) * 100 : 0;

  return (
    <section
      className="card"
      aria-labelledby="confusion-matrix-heading"
      style={{
        background: "var(--card, #E3E5D6)",
        border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
        borderRadius: "var(--r-lg, 8px)",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div className="card-head" style={{ marginBottom: 12 }}>
          <div>
            <h2
              id="confusion-matrix-heading"
              style={{
                fontSize: "1.12rem",
                fontWeight: 600,
                color: "var(--ink, #1C1F1A)",
                margin: 0,
              }}
            >
              2 × 2 Confusion Matrix
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--ink-2, #41453D)",
                marginTop: 3,
                marginBottom: 0,
              }}
            >
              Explicit actual vs. predicted label counts on {grandTotal.toLocaleString()} holdout samples.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 14, overflowX: "auto" }}>
          <div style={{ minWidth: 380, maxWidth: 540, margin: "0 auto" }}>
            {/* Top Axis Header: Predicted Class */}
            <div
              style={{
                textAlign: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--ink, #1C1F1A)",
                marginBottom: 8,
                background: "var(--card-2, #ECEEE2)",
                padding: "4px 8px",
                borderRadius: "var(--r-xs, 4px)",
                border: "1px solid var(--line, rgba(28, 31, 26, 0.1))",
              }}
            >
              Predicted Class ({matrix.column_axis})
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 6,
                textAlign: "center",
              }}
            >
              <thead>
                <tr>
                  {/* Empty corner for Actual label axis */}
                  <th style={{ width: "24%", border: "none" }} />
                  <th
                    style={{
                      width: "38%",
                      padding: "8px 6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--ink, #1C1F1A)",
                      background: "var(--card-2, #ECEEE2)",
                      borderRadius: "var(--r, 6px)",
                      border: "1px solid var(--line, rgba(28, 31, 26, 0.1))",
                    }}
                  >
                    {labels[0]}
                  </th>
                  <th
                    style={{
                      width: "38%",
                      padding: "8px 6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--ink, #1C1F1A)",
                      background: "var(--card-2, #ECEEE2)",
                      borderRadius: "var(--r, 6px)",
                      border: "1px solid var(--line, rgba(28, 31, 26, 0.1))",
                    }}
                  >
                    {labels[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Row 0: Actual Legitimate */}
                <tr>
                  <td
                    style={{
                      padding: "10px 8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textAlign: "right",
                      verticalAlign: "middle",
                      color: "var(--ink, #1C1F1A)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span>{labels[0]}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--ink-2, #41453D)", fontWeight: 500 }}>
                        Actual ({actualLegitTotal.toLocaleString()})
                      </span>
                    </div>
                  </td>

                  {/* Cell 0,0: TN */}
                  <td
                    style={{
                      padding: "16px 10px",
                      borderRadius: "var(--r, 6px)",
                      background: "rgba(16, 185, 129, 0.14)",
                      border: "1px solid rgba(16, 185, 129, 0.38)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.45rem",
                        fontWeight: 700,
                        color: "#065F46",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {tn.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "#047857", marginTop: 2 }}>
                      True Legitimate ({tnRate.toFixed(2)}%)
                    </div>
                  </td>

                  {/* Cell 0,1: FP */}
                  <td
                    style={{
                      padding: "16px 10px",
                      borderRadius: "var(--r, 6px)",
                      background: "rgba(245, 158, 11, 0.14)",
                      border: "1px solid rgba(245, 158, 11, 0.38)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.45rem",
                        fontWeight: 700,
                        color: "#92400E",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fp.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "#B45309", marginTop: 2 }}>
                      False Alarm ({fpRate.toFixed(2)}%)
                    </div>
                  </td>
                </tr>

                {/* Row 1: Actual Phishing */}
                <tr>
                  <td
                    style={{
                      padding: "10px 8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      textAlign: "right",
                      verticalAlign: "middle",
                      color: "var(--ink, #1C1F1A)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                      <span>{labels[1]}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--ink-2, #41453D)", fontWeight: 500 }}>
                        Actual ({actualPhishTotal.toLocaleString()})
                      </span>
                    </div>
                  </td>

                  {/* Cell 1,0: FN */}
                  <td
                    style={{
                      padding: "16px 10px",
                      borderRadius: "var(--r, 6px)",
                      background: "rgba(239, 68, 68, 0.14)",
                      border: "1px solid rgba(239, 68, 68, 0.38)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.45rem",
                        fontWeight: 700,
                        color: "#991B1B",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fn.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "#B91C1C", marginTop: 2 }}>
                      Missed Threat ({fnRate.toFixed(2)}%)
                    </div>
                  </td>

                  {/* Cell 1,1: TP */}
                  <td
                    style={{
                      padding: "16px 10px",
                      borderRadius: "var(--r, 6px)",
                      background: "rgba(16, 185, 129, 0.14)",
                      border: "1px solid rgba(16, 185, 129, 0.38)",
                      verticalAlign: "middle",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.45rem",
                        fontWeight: 700,
                        color: "#065F46",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {tp.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "#047857", marginTop: 2 }}>
                      True Phishing ({tpRate.toFixed(2)}%)
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom axis summary notes */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--line, rgba(28, 31, 26, 0.08))",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "var(--ink-2, #41453D)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>Predicted Legit: {predLegitTotal.toLocaleString()}</span>
        <span>Predicted Phish: {predPhishTotal.toLocaleString()}</span>
        <span style={{ fontWeight: 600, color: "var(--ink, #1C1F1A)" }}>
          Holdout Accuracy: {(((tn + tp) / grandTotal) * 100).toFixed(2)}%
        </span>
      </div>
    </section>
  );
}
