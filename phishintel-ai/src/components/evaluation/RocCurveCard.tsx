"use client";

import React, { useState } from "react";

interface RocCurveCardProps {
  rocAuc: number;
  prAuc: number;
  totalSamples?: number;
  // Optional genuine coordinates if exported from backend
  genuineCoordinates?: { fpr: number; tpr: number; threshold?: number }[];
}

export function RocCurveCard({
  rocAuc,
  prAuc,
  totalSamples = 14294,
  genuineCoordinates,
}: RocCurveCardProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ fpr: number; tpr: number; label: string } | null>(null);

  // Exact empirical operating point from verified holdout confusion matrix:
  // Legitimate support = 9,070; Phishing support = 5,224
  // FP = 59, TP = 5,175
  const opFpr = 59 / 9070; // 0.006505 (0.6505%)
  const opTpr = 5175 / 5224; // 0.990620 (99.0620%)

  // Chart dimensions in SVG viewBox coordinate space
  const svgWidth = 560;
  const svgHeight = 320;
  const padLeft = 56;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 48;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Coordinate transforms: (0,0) at bottom-left of chart, (1,1) at top-right
  const scaleX = (fpr: number) => padLeft + fpr * chartW;
  const scaleY = (tpr: number) => padTop + (1 - tpr) * chartH;

  const opX = scaleX(opFpr);
  const opY = scaleY(opTpr);

  const ticks = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

  const hasContinuousCoords = Array.isArray(genuineCoordinates) && genuineCoordinates.length > 2;

  // Build SVG path if continuous genuine coordinates exist
  let continuousPath = "";
  if (hasContinuousCoords && genuineCoordinates) {
    continuousPath = genuineCoordinates.reduce((acc, pt, i) => {
      const x = scaleX(Math.max(0, Math.min(1, pt.fpr)));
      const y = scaleY(Math.max(0, Math.min(1, pt.tpr)));
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, "");
  }

  return (
    <section
      className="card"
      aria-labelledby="roc-curve-heading"
      style={{
        marginTop: 12,
        background: "var(--card, #E3E5D6)",
        border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
        borderRadius: "var(--r-lg, 8px)",
        padding: "20px 22px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            id="roc-curve-heading"
            style={{
              fontSize: "1.12rem",
              fontWeight: 600,
              color: "var(--ink, #1C1F1A)",
              margin: 0,
            }}
          >
            PAHF-Net ROC Curve &amp; Operating Point
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--ink-2, #41453D)",
              marginTop: 3,
              marginBottom: 0,
            }}
          >
            Receiver Operating Characteristic on {totalSamples.toLocaleString()} holdout evaluation samples.
          </p>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: "var(--r, 6px)",
              background: "var(--accent-soft, rgba(239, 106, 30, 0.12))",
              border: "1px solid rgba(239, 106, 30, 0.25)",
              display: "flex",
              alignItems: "baseline",
              gap: 5,
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--ink-2, #41453D)", fontWeight: 500 }}>
              ROC-AUC:
            </span>
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--accent, #EF6A1E)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {(rocAuc * 100).toFixed(4)}%
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--muted, #555A4E)" }}>
              ({rocAuc.toFixed(4)})
            </span>
          </div>

          <div
            style={{
              padding: "4px 10px",
              borderRadius: "var(--r, 6px)",
              background: "var(--card-2, #ECEEE2)",
              border: "1px solid var(--line, rgba(28, 31, 26, 0.12))",
              display: "flex",
              alignItems: "baseline",
              gap: 5,
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--ink-2, #41453D)", fontWeight: 500 }}>
              PR-AUC:
            </span>
            <span
              style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--ink, #1C1F1A)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {(prAuc * 100).toFixed(4)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart visualization area */}
      <div
        style={{
          width: "100%",
          background: "var(--card-2, #ECEEE2)",
          border: "1px solid var(--line, rgba(28, 31, 26, 0.1))",
          borderRadius: "var(--r, 6px)",
          padding: "12px 14px",
          position: "relative",
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          aria-label="Receiver Operating Characteristic curve chart"
        >
          {/* Grid lines */}
          {ticks.map((t) => {
            const x = scaleX(t);
            const y = scaleY(t);
            return (
              <g key={t}>
                {/* Vertical grid line */}
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartH}
                  stroke="rgba(28, 31, 26, 0.08)"
                  strokeWidth="1"
                />
                {/* Horizontal grid line */}
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + chartW}
                  y2={y}
                  stroke="rgba(28, 31, 26, 0.08)"
                  strokeWidth="1"
                />
                {/* X axis tick text */}
                <text
                  x={x}
                  y={padTop + chartH + 18}
                  fill="var(--ink-2, #41453D)"
                  fontSize="10.5"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {t.toFixed(1)}
                </text>
                {/* Y axis tick text */}
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  fill="var(--ink-2, #41453D)"
                  fontSize="10.5"
                  fontWeight="500"
                  textAnchor="end"
                >
                  {t.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Chart Border */}
          <rect
            x={padLeft}
            y={padTop}
            width={chartW}
            height={chartH}
            fill="none"
            stroke="var(--line, rgba(28, 31, 26, 0.2))"
            strokeWidth="1.2"
          />

          {/* Diagonal Random Classifier Baseline: (0,0) to (1,1) */}
          <line
            x1={scaleX(0)}
            y1={scaleY(0)}
            x2={scaleX(1)}
            y2={scaleY(1)}
            stroke="var(--muted, #737869)"
            strokeWidth="1.5"
            strokeDasharray="5,5"
          />

          {/* Continuous Curve (if genuine coordinates exported) */}
          {hasContinuousCoords && continuousPath && (
            <path
              d={continuousPath}
              fill="none"
              stroke="var(--safe, #1E9A69)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Operational Point crosshairs */}
          <line
            x1={opX}
            y1={opY}
            x2={opX}
            y2={padTop + chartH}
            stroke="rgba(30, 154, 105, 0.4)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          <line
            x1={padLeft}
            y1={opY}
            x2={opX}
            y2={opY}
            stroke="rgba(30, 154, 105, 0.4)"
            strokeWidth="1"
            strokeDasharray="3,3"
          />

          {/* Operational Marker Circle */}
          <circle
            cx={opX}
            cy={opY}
            r="8"
            fill="rgba(30, 154, 105, 0.2)"
            stroke="none"
          />
          <circle
            cx={opX}
            cy={opY}
            r="4.5"
            fill="var(--safe, #1E9A69)"
            stroke="#ffffff"
            strokeWidth="1.5"
            style={{ cursor: "pointer" }}
            onMouseEnter={() =>
              setHoveredPoint({
                fpr: opFpr,
                tpr: opTpr,
                label: `Operating Point (T = 0.50): TPR = ${(opTpr * 100).toFixed(2)}%, FPR = ${(opFpr * 100).toFixed(2)}%`,
              })
            }
            onMouseLeave={() => setHoveredPoint(null)}
          />

          {/* Operating Point Callout Label on SVG */}
          <g transform={`translate(${Math.min(opX + 10, chartW - 140)}, ${Math.max(opY + 12, padTop + 24)})`}>
            <rect
              x="0"
              y="-14"
              width="156"
              height="28"
              rx="4"
              fill="var(--card, #E3E5D6)"
              stroke="rgba(30, 154, 105, 0.5)"
              strokeWidth="1"
            />
            <text x="6" y="-1" fill="var(--ink, #1C1F1A)" fontSize="9.5" fontWeight="600">
              Operational Point (T=0.50)
            </text>
            <text x="6" y="9.5" fill="var(--safe, #1E9A69)" fontSize="9" fontWeight="600">
              TPR: 99.06% · FPR: 0.65%
            </text>
          </g>

          {/* X Axis Label */}
          <text
            x={padLeft + chartW / 2}
            y={padTop + chartH + 38}
            fill="var(--ink, #1C1F1A)"
            fontSize="11.5"
            fontWeight="600"
            textAnchor="middle"
          >
            False Positive Rate (FPR)
          </text>

          {/* Y Axis Label */}
          <text
            x={-(padTop + chartH / 2)}
            y={padLeft - 38}
            transform="rotate(-90)"
            fill="var(--ink, #1C1F1A)"
            fontSize="11.5"
            fontWeight="600"
            textAnchor="middle"
          >
            True Positive Rate (TPR / Recall)
          </text>
        </svg>

        {/* Dynamic Tooltip on hover */}
        {hoveredPoint && (
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "var(--card, #E3E5D6)",
              border: "1px solid var(--line, rgba(28, 31, 26, 0.2))",
              borderRadius: "var(--r, 6px)",
              padding: "6px 10px",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--ink, #1C1F1A)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {hoveredPoint.label}
          </div>
        )}
      </div>

      {/* Legend & Provenance Footer */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          {/* Legend: Model */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.78rem" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--safe, #1E9A69)",
                display: "inline-block",
              }}
            />
            <span style={{ fontWeight: 600, color: "var(--ink, #1C1F1A)" }}>
              PAHF-Net Operational Point (AUC: 0.9984)
            </span>
          </div>

          {/* Legend: Baseline */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.78rem" }}>
            <span
              style={{
                width: 16,
                height: 0,
                borderTop: "2px dashed var(--muted, #737869)",
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--ink-2, #41453D)" }}>
              Random Classifier Baseline (AUC: 0.5000)
            </span>
          </div>
        </div>

        {/* Data integrity note */}
        <div
          style={{
            fontSize: "0.74rem",
            color: "var(--muted, #555A4E)",
            lineHeight: 1.35,
            maxWidth: 520,
          }}
        >
          {hasContinuousCoords
            ? "Continuous ROC curve rendered from verified evaluation prediction coordinates."
            : "The empirical operating point (0.65% FPR, 99.06% TPR) is verified from the 14,294-sample confusion matrix. In strict compliance with data integrity protocols, synthetic intermediate curve points are never fabricated."}
        </div>
      </div>
    </section>
  );
}
