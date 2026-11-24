"use client";

import React from "react";

interface DatasetSummaryProps {
  totalSamples: number;
  classSupport: {
    Legitimate: number;
    Phishing: number;
    [key: string]: number;
  };
  dataNotes?: string[];
}

export function DatasetSummary({
  totalSamples,
  classSupport,
  dataNotes,
}: DatasetSummaryProps) {
  const legitCount = classSupport["Legitimate"] ?? 9070;
  const phishCount = classSupport["Phishing"] ?? 5224;
  const total = totalSamples || legitCount + phishCount;

  const legitPct = total > 0 ? ((legitCount / total) * 100).toFixed(2) : "63.45";
  const phishPct = total > 0 ? ((phishCount / total) * 100).toFixed(2) : "36.55";

  return (
    <section
      className="card"
      aria-labelledby="dataset-summary-heading"
      style={{
        background: "var(--card, #E3E5D6)",
        border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
        borderRadius: "var(--r-lg, 8px)",
        padding: "20px 22px",
      }}
    >
      <div className="card-head" style={{ marginBottom: 12 }}>
        <div>
          <h2
            id="dataset-summary-heading"
            style={{
              fontSize: "1.12rem",
              fontWeight: 600,
              color: "var(--ink, #1C1F1A)",
              margin: 0,
            }}
          >
            Evaluation Dataset Summary
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--ink-2, #41453D)",
              marginTop: 3,
              marginBottom: 0,
            }}
          >
            Benchmark dataset provenance, holdout split size, and ground-truth class distribution.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {/* Metric counts grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              background: "var(--card-2, #ECEEE2)",
              borderRadius: "var(--r, 6px)",
              border: "1px solid var(--line, rgba(28, 31, 26, 0.1))",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--ink-2, #41453D)",
              }}
            >
              Total Samples
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 700,
                marginTop: 4,
                color: "var(--ink, #1C1F1A)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {total.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--muted, #555A4E)",
                marginTop: 3,
              }}
            >
              100% holdout test partition
            </div>
          </div>

          <div
            style={{
              padding: "14px 16px",
              background: "rgba(16, 185, 129, 0.08)",
              borderRadius: "var(--r, 6px)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#065F46",
              }}
            >
              Legitimate Samples
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 700,
                marginTop: 4,
                color: "#065F46",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {legitCount.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "#047857",
                marginTop: 3,
                fontWeight: 500,
              }}
            >
              {legitPct}% of total dataset
            </div>
          </div>

          <div
            style={{
              padding: "14px 16px",
              background: "rgba(239, 68, 68, 0.08)",
              borderRadius: "var(--r, 6px)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
            }}
          >
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#991B1B",
              }}
            >
              Phishing Samples
            </div>
            <div
              style={{
                fontSize: "1.55rem",
                fontWeight: 700,
                marginTop: 4,
                color: "#991B1B",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {phishCount.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: "0.74rem",
                color: "#B91C1C",
                marginTop: 3,
                fontWeight: 500,
              }}
            >
              {phishPct}% of total dataset
            </div>
          </div>
        </div>

        {/* Visual Class Balance Progress Bar */}
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.78rem",
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            <span style={{ color: "#065F46" }}>
              Legitimate: {legitCount.toLocaleString()} ({legitPct}%)
            </span>
            <span style={{ color: "#991B1B" }}>
              Phishing: {phishCount.toLocaleString()} ({phishPct}%)
            </span>
          </div>
          <div
            style={{
              height: 12,
              width: "100%",
              borderRadius: 9999,
              overflow: "hidden",
              display: "flex",
              background: "rgba(28, 31, 26, 0.12)",
              border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
            }}
          >
            <div
              style={{
                width: `${legitPct}%`,
                background: "var(--safe, #1E9A69)",
                transition: "width 0.3s ease",
              }}
              title={`Legitimate: ${legitCount.toLocaleString()} (${legitPct}%)`}
            />
            <div
              style={{
                width: `${phishPct}%`,
                background: "var(--phish, #D8452B)",
                transition: "width 0.3s ease",
              }}
              title={`Phishing: ${phishCount.toLocaleString()} (${phishPct}%)`}
            />
          </div>
        </div>

        {/* Provenance & Methodology Notes */}
        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            background: "var(--card-2, #ECEEE2)",
            borderRadius: "var(--r, 6px)",
            border: "1px solid var(--line, rgba(28, 31, 26, 0.1))",
          }}
        >
          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--ink, #1C1F1A)",
            }}
          >
            Benchmark Provenance &amp; Verification Notes
          </div>
          <ul
            style={{
              margin: "8px 0 0 18px",
              padding: 0,
              fontSize: "0.78rem",
              color: "var(--ink-2, #41453D)",
              lineHeight: 1.55,
            }}
          >
            {dataNotes && dataNotes.length > 0 ? (
              dataNotes.map((note, index) => <li key={index}>{note}</li>)
            ) : (
              <>
                <li>Metric values are transcribed from the verified PAHF-Net holdout evaluation benchmark.</li>
                <li>Summary metrics retain 6-decimal precision; classification-report values retain 4-decimal precision.</li>
                <li>ROC-AUC and PR-AUC are separate metrics and rendered as independent indicators.</li>
                <li>Confusion matrix conforms to verified row-major actual and column-major predicted class order.</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
