"use client";

import React from "react";
import { ClassificationReport } from "@/types/evaluation";

interface ClassificationReportTableProps {
  report: ClassificationReport;
}

function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  return `${(val * 100).toFixed(2)}%`;
}

function formatSupport(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  return val.toLocaleString();
}

export function ClassificationReportTable({ report }: ClassificationReportTableProps) {
  return (
    <section
      className="card"
      aria-labelledby="classification-report-heading"
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
              id="classification-report-heading"
              style={{
                fontSize: "1.12rem",
                fontWeight: 600,
                color: "var(--ink, #1C1F1A)",
                margin: 0,
              }}
            >
              Classification Report
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--ink-2, #41453D)",
                marginTop: 3,
                marginBottom: 0,
              }}
            >
              Per-class precision, recall, and F1 scores with support sample counts.
            </p>
          </div>
        </div>

        <div className="tbl-wrap" style={{ marginTop: 12, overflowX: "auto" }}>
          <table
            className="tbl"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid var(--line, rgba(28, 31, 26, 0.15))",
                  background: "var(--card-2, #ECEEE2)",
                }}
              >
                <th
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    color: "var(--ink, #1C1F1A)",
                    textAlign: "left",
                  }}
                >
                  Class / Average
                </th>
                <th
                  className="num"
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    color: "var(--ink, #1C1F1A)",
                    textAlign: "right",
                  }}
                >
                  Precision
                </th>
                <th
                  className="num"
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    color: "var(--ink, #1C1F1A)",
                    textAlign: "right",
                  }}
                >
                  Recall
                </th>
                <th
                  className="num"
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    color: "var(--ink, #1C1F1A)",
                    textAlign: "right",
                  }}
                >
                  F1 Score
                </th>
                <th
                  className="num"
                  style={{
                    padding: "10px 12px",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    color: "var(--ink, #1C1F1A)",
                    textAlign: "right",
                  }}
                >
                  Support
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Legitimate */}
              <tr
                style={{
                  borderBottom: "1px solid var(--line, rgba(28, 31, 26, 0.08))",
                }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      fontWeight: 600,
                      color: "var(--ink, #1C1F1A)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "var(--safe, #1E9A69)",
                        display: "inline-block",
                      }}
                    />
                    Legitimate
                  </span>
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.Legitimate.precision)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.Legitimate.recall)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.Legitimate.f1_score)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                  {formatSupport(report.Legitimate.support)}
                </td>
              </tr>

              {/* Row 2: Phishing */}
              <tr
                style={{
                  borderBottom: "1px solid var(--line, rgba(28, 31, 26, 0.08))",
                }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      fontWeight: 600,
                      color: "var(--ink, #1C1F1A)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: "var(--phish, #D8452B)",
                        display: "inline-block",
                      }}
                    />
                    Phishing
                  </span>
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.Phishing.precision)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.Phishing.recall)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.Phishing.f1_score)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
                  {formatSupport(report.Phishing.support)}
                </td>
              </tr>

              {/* Row 3: Accuracy */}
              <tr
                style={{
                  borderBottom: "1px solid var(--line, rgba(28, 31, 26, 0.1))",
                  background: "var(--card-2, #ECEEE2)",
                }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--ink, #1C1F1A)", fontSize: "0.85rem" }}>
                  Accuracy
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted, #555A4E)" }}>
                  —
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--muted, #555A4E)" }}>
                  —
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.accuracy.value)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {formatSupport(report.accuracy.support)}
                </td>
              </tr>

              {/* Row 4: Macro Average */}
              <tr
                style={{
                  borderBottom: "1px solid var(--line, rgba(28, 31, 26, 0.08))",
                }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--ink-2, #41453D)", fontSize: "0.85rem" }}>
                  Macro Average
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.macro_avg.precision)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.macro_avg.recall)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.macro_avg.f1_score)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink-2, #41453D)", fontVariantNumeric: "tabular-nums" }}>
                  {formatSupport(report.macro_avg.support)}
                </td>
              </tr>

              {/* Row 5: Weighted Average */}
              <tr>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--ink-2, #41453D)", fontSize: "0.85rem" }}>
                  Weighted Average
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.weighted_avg.precision)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.weighted_avg.recall)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink, #1C1F1A)", fontVariantNumeric: "tabular-nums" }}>
                  {formatPercent(report.weighted_avg.f1_score)}
                </td>
                <td className="num" style={{ padding: "10px 12px", textAlign: "right", color: "var(--ink-2, #41453D)", fontVariantNumeric: "tabular-nums" }}>
                  {formatSupport(report.weighted_avg.support)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 10,
          borderTop: "1px solid var(--line, rgba(28, 31, 26, 0.08))",
          fontSize: "0.75rem",
          color: "var(--muted, #555A4E)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span>Class conventions: Legitimate (0), Phishing (1)</span>
        <span>Accuracy row represents test subset overall classification rate</span>
      </div>
    </section>
  );
}
