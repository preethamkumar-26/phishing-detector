import React from "react";

export default function Loading() {
  return (
    <div className="section-no-hover animate-pulse" aria-busy="true" aria-label="Loading section">
      {/* Page Header Skeleton */}
      <div className="ph" style={{ marginBottom: 24 }}>
        <div style={{ width: "100%" }}>
          <div
            style={{
              height: 28,
              width: 180,
              background: "var(--card-2)",
              borderRadius: 6,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              height: 14,
              width: "60%",
              maxWidth: 420,
              background: "var(--card-2)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid g2" style={{ gap: 16 }}>
        <div
          className="card"
          style={{
            minHeight: 180,
            background: "var(--card)",
            borderRadius: 12,
            border: "1px solid var(--line)",
            padding: 20,
          }}
        >
          <div
            style={{
              height: 16,
              width: 140,
              background: "var(--card-2)",
              borderRadius: 4,
              marginBottom: 16,
            }}
          />
          <div
            style={{
              height: 12,
              width: "80%",
              background: "var(--card-2)",
              borderRadius: 4,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              height: 12,
              width: "65%",
              background: "var(--card-2)",
              borderRadius: 4,
            }}
          />
        </div>

        <div
          className="card"
          style={{
            minHeight: 180,
            background: "var(--card)",
            borderRadius: 12,
            border: "1px solid var(--line)",
            padding: 20,
          }}
        >
          <div
            style={{
              height: 16,
              width: 120,
              background: "var(--card-2)",
              borderRadius: 4,
              marginBottom: 16,
            }}
          />
          <div
            style={{
              height: 12,
              width: "75%",
              background: "var(--card-2)",
              borderRadius: 4,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              height: 12,
              width: "50%",
              background: "var(--card-2)",
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    </div>
  );
}
