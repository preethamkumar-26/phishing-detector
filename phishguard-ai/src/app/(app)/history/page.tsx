"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePhishGuard, ScanItem } from "@/context/PhishGuardContext";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const BASELINE_TIME = 1794747600000;

const fmtAbs = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtRel = (ts: number, now = BASELINE_TIME) => {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  return Math.round(h / 24) + " d ago";
};

const senderShort = (f: string) => {
  const m = f.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? m[2].trim() : f;
};

export default function HistoryPage() {
  const router = useRouter();
  const { scans, setSelectedScanId, clearUserScans, formatP } = usePhishGuard();

  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | "PHISHING" | "SAFE">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "sample" | "user">("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(BASELINE_TIME);

  React.useEffect(() => {
    setNowTime(Date.now());
  }, []);

  // Filtered rows
  const filteredScans = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scans.filter((s) => {
      const matchDec = decisionFilter === "all" || s.decision === decisionFilter;
      const matchSrc = sourceFilter === "all" || s.src === sourceFilter;
      const matchQuery =
        !q || (s.id + " " + s.email.subject + " " + s.email.from).toLowerCase().includes(q);
      return matchDec && matchSrc && matchQuery;
    });
  }, [decisionFilter, query, scans, sourceFilter]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const ph = scans.filter((s) => s.decision === "PHISHING").length;
    const avg = scans.length ? scans.reduce((a, s) => a + s.P, 0) / scans.length : 0;
    return [
      { label: "Scans", value: scans.length, color: "var(--ink)" },
      { label: "Phishing", value: ph, color: "var(--phish)" },
      { label: "Safe", value: scans.length - ph, color: "var(--safe)" },
      { label: "Mean P_phish", value: avg.toFixed(3), color: "var(--ink)" },
    ];
  }, [scans]);

  const handleOpenScan = (id: string) => {
    setSelectedScanId(id);
    router.push("/explainability");
  };

  const handleLoadIntoAnalyzer = (s: ScanItem) => {
    // Navigate to analyzer with prefilled query
    setSelectedScanId(s.id);
    router.push("/analyzer");
  };

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Scan history</h1>
          <p>
            Every analysis with its decision, score and the threshold in force at the time. Expand a row for evidence.
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-line" onClick={clearUserScans}>
            Clear my scans
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid g4" id="hist-kpis">
        {kpis.map((k, i) => (
          <div key={i} className="card metric">
            <div className="lbl">{k.label}</div>
            <div className="big" style={{ marginTop: 10, color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table & Controls Card */}
      <div className="card mt">
        <div className="row wrap" style={{ marginBottom: 14, gap: 8 }}>
          <input
            className="input"
            id="h-q"
            placeholder="Search subject, sender or scan ID"
            style={{ maxWidth: 340 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="seg" role="group" aria-label="Filter by decision">
            <button
              type="button"
              className={decisionFilter === "all" ? "on" : ""}
              onClick={() => setDecisionFilter("all")}
            >
              All
            </button>
            <button
              type="button"
              className={decisionFilter === "PHISHING" ? "on" : ""}
              onClick={() => setDecisionFilter("PHISHING")}
            >
              Phishing
            </button>
            <button
              type="button"
              className={decisionFilter === "SAFE" ? "on" : ""}
              onClick={() => setDecisionFilter("SAFE")}
            >
              Safe
            </button>
          </div>

          <select
            className="select"
            id="h-src"
            style={{ width: "auto" }}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
          >
            <option value="all">All sources</option>
            <option value="sample">Sample workspace</option>
            <option value="user">My scans</option>
          </select>

          <span className="mono muted" style={{ marginLeft: "auto", fontSize: "12px" }}>
            {filteredScans.length} of {scans.length}
          </span>
        </div>

        <div className="tbl-wrap">
          <table className="tbl" id="hist-tbl">
            <thead>
              <tr>
                <th>Scan</th>
                <th>Message</th>
                <th>Decision</th>
                <th className="num">P<sub>phish</sub></th>
                <th className="num">T</th>
                <th>Engine</th>
                <th className="num">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.length ? (
                filteredScans.map((s) => {
                  const isExpanded = expandedRowId === s.id;
                  const isPhish = s.decision === "PHISHING";
                  const topInd = s.rows
                    .filter((r) => r.contrib > 0)
                    .sort((a, b) => b.contrib - a.contrib)
                    .slice(0, 4);

                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        className="clickable"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedRowId(isExpanded ? null : s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setExpandedRowId(isExpanded ? null : s.id);
                          }
                        }}
                      >
                        <td className="mono" style={{ fontSize: "12px" }}>
                          {s.id}
                        </td>
                        <td>
                          <div className="trunc" style={{ maxWidth: 360 }}>
                            {s.email.subject}
                          </div>
                          <div className="t-sub trunc" style={{ maxWidth: 360 }}>
                            {senderShort(s.email.from)}
                          </div>
                        </td>
                        <td>
                          <span className={`verdict ${isPhish ? "v-phish" : "v-safe"}`}>
                            {isPhish ? (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.5 1.5 21h21L12 2.5Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4.5Z" />
                              </svg>
                            ) : (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="m5 12.5 4.5 4.5L19 7" />
                              </svg>
                            )}
                            {isPhish ? "Phishing" : "Safe"}
                          </span>
                        </td>
                        <td className="num">{formatP(s.P)}</td>
                        <td className="num muted">{s.T.toFixed(2)}</td>
                        <td>
                          {s.src === "sample" ? (
                            <span className="tag">sample</span>
                          ) : s.engine === "service" ? (
                            <span className="tag">service · {s.modelVersion}</span>
                          ) : (
                            <span className="tag">local preview</span>
                          )}
                        </td>
                        <td className="num muted" title={fmtAbs(s.ts)}>
                          {fmtRel(s.ts, nowTime)}
                        </td>
                      </tr>

                      {/* Expandable detail row */}
                      {isExpanded && (
                        <tr className="detail">
                          <td colSpan={7}>
                            <div className="grid g-2-1" style={{ gap: 20 }}>
                              <div>
                                <div className="lbl" style={{ marginBottom: 8 }}>
                                  Top indicators
                                </div>
                                {topInd.length ? (
                                  topInd.map((r) => (
                                    <div key={r.id} className="row" style={{ padding: "4px 0", fontSize: "13px" }}>
                                      <span className="code">{r.id}</span>
                                      <span>{r.name}</span>
                                      <span
                                        className="mono muted"
                                        style={{ marginLeft: "auto", fontSize: "12px" }}
                                      >
                                        +{r.contrib.toFixed(2)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="muted">None fired.</span>
                                )}
                              </div>
                              <div>
                                <div className="lbl" style={{ marginBottom: 8 }}>
                                  Entities
                                </div>
                                <div className="ent">
                                  <span className="tag">sector · {s.entities.sector}</span>
                                  {s.entities.amounts.map((a, idx) => (
                                    <span key={idx} className="tag">
                                      amount · {a}
                                    </span>
                                  ))}
                                  {s.entities.tx && <span className="tag">tx · {s.entities.tx}</span>}
                                  {s.entities.orgs.map((o, idx) => (
                                    <span key={idx} className="tag">
                                      org · {o}
                                    </span>
                                  ))}
                                </div>
                                <div className="row" style={{ marginTop: 14 }}>
                                  <button
                                    type="button"
                                    className="btn btn-dark btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenScan(s.id);
                                    }}
                                  >
                                    Open explanation
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-line btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleLoadIntoAnalyzer(s);
                                    }}
                                  >
                                    Load into analyzer
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 36, textAlign: "center" }} className="muted">
                    No scans match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
