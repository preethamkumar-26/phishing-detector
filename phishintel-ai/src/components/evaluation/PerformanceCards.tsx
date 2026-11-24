"use client";

import React from "react";
import { PAHFNetSummaryMetrics } from "@/types/evaluation";

interface PerformanceCardsProps {
  metrics: PAHFNetSummaryMetrics;
}

interface MetricCardConfig {
  key: keyof PAHFNetSummaryMetrics;
  label: string;
  tooltip: string;
  badge?: string;
  badgeType?: "accent" | "neutral";
}

const PRIMARY_ROW_CARDS: MetricCardConfig[] = [
  {
    key: "accuracy",
    label: "Accuracy",
    tooltip: "Proportion of all predictions (legitimate and phishing) that are correct.",
  },
  {
    key: "balanced_accuracy",
    label: "Balanced Accuracy",
    tooltip: "Unweighted average recall across classes; robust against dataset imbalance.",
  },
  {
    key: "precision",
    label: "Precision",
    tooltip: "Proportion of emails flagged as phishing that are genuinely malicious.",
  },
  {
    key: "recall",
    label: "Recall",
    tooltip: "Proportion of all actual phishing attacks successfully detected by the model.",
  },
];

const SECONDARY_ROW_CARDS: MetricCardConfig[] = [
  {
    key: "f1_score",
    label: "F1 Score",
    tooltip: "Harmonic mean of precision and recall; balances false alarms vs. missed attacks.",
  },
  {
    key: "roc_auc",
    label: "ROC-AUC",
    badge: "Scalar AUC",
    badgeType: "accent",
    tooltip: "Area under the Receiver Operating Characteristic curve across all classification thresholds.",
  },
  {
    key: "pr_auc",
    label: "PR-AUC",
    badge: "Scalar AUC",
    badgeType: "accent",
    tooltip: "Area under the Precision-Recall curve; sensitive to positive-class phishing detection.",
  },
];

function MetricCard({ config, value }: { config: MetricCardConfig; value: number | undefined }) {
  const percentString = typeof value === "number" ? `${(value * 100).toFixed(4)}%` : "—";

  return (
    <div
      className="card metric no-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "18px 20px",
        background: "var(--card, #E3E5D6)",
        border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
        borderRadius: "var(--r-lg, 8px)",
        boxShadow: "0 1px 3px rgba(28, 31, 26, 0.04)",
        minHeight: 140,
      }}
      title={config.tooltip}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.85rem",
            color: "var(--ink-2, #41453D)",
            letterSpacing: "-0.01em",
          }}
        >
          {config.label}
        </span>
        {config.badge && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 500,
              padding: "2px 7px",
              borderRadius: "var(--r-xs, 3px)",
              background:
                config.badgeType === "accent"
                  ? "var(--accent-soft, rgba(239, 106, 30, 0.12))"
                  : "var(--card-2, #ECEEE2)",
              color:
                config.badgeType === "accent"
                  ? "var(--accent, #EF6A1E)"
                  : "var(--ink-2, #41453D)",
              border: `1px solid ${
                config.badgeType === "accent"
                  ? "rgba(239, 106, 30, 0.25)"
                  : "var(--line, rgba(28, 31, 26, 0.12))"
              }`,
              whiteSpace: "nowrap",
            }}
          >
            {config.badge}
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: 10,
          marginBottom: 4,
          fontSize: "1.9rem",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          color: "var(--ink, #1C1F1A)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.15,
        }}
      >
        {percentString}
      </div>

      <div
        style={{
          fontSize: "0.76rem",
          color: "var(--muted, #555A4E)",
          lineHeight: 1.38,
          marginTop: 6,
        }}
      >
        {config.tooltip}
      </div>
    </div>
  );
}

export function PerformanceCards({ metrics }: PerformanceCardsProps) {
  return (
    <section aria-labelledby="overall-performance-heading" style={{ marginTop: 12 }}>
      <div className="card-head" style={{ marginBottom: 12 }}>
        <div>
          <h2
            id="overall-performance-heading"
            style={{ fontSize: "1.12rem", fontWeight: 600, color: "var(--ink, #1C1F1A)", margin: 0 }}
          >
            Overall Performance Metrics
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--ink-2, #41453D)",
              marginTop: 3,
              marginBottom: 0,
            }}
          >
            Seven benchmark indicators measured on the holdout test evaluation split (14,294 samples).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.74rem",
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: "9999px",
              background: "var(--accent-soft, rgba(239, 106, 30, 0.12))",
              color: "var(--accent, #EF6A1E)",
              border: "1px solid rgba(239, 106, 30, 0.25)",
            }}
          >
            ROC-AUC &amp; PR-AUC Preserved as Distinct Metrics
          </span>
        </div>
      </div>

      {/* Balanced 4 + 3 arrangement: no orphan card */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Row 1: 4 core rate metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {PRIMARY_ROW_CARDS.map((config) => (
            <MetricCard key={config.key} config={config} value={metrics[config.key]} />
          ))}
        </div>

        {/* Row 2: 3 composite and threshold-independent metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}
        >
          {SECONDARY_ROW_CARDS.map((config) => (
            <MetricCard key={config.key} config={config} value={metrics[config.key]} />
          ))}
        </div>
      </div>
    </section>
  );
}
