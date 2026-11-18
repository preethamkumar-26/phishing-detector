"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePhishGuard, ScanItem } from "@/context/PhishGuardContext";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { ThePagination } from "@/components/ui/the-pagination";

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
  const { scans, setSelectedScanId, clearUserScans, deleteScan, formatP, showToast } = usePhishGuard();

  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | "PHISHING" | "SAFE">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "sample" | "user">("all");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(BASELINE_TIME);

  // Per-record delete & overflow menu state
  const [menuOpenScanId, setMenuOpenScanId] = useState<string | null>(null);
  const [deletingScan, setDeletingScan] = useState<ScanItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [binningScanId, setBinningScanId] = useState<string | null>(null);

  // Export PDF state
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setNowTime(Date.now());
  }, []);

  // Close overflow menus on outside click or Escape
  useEffect(() => {
    const handleGlobalClick = () => {
      setMenuOpenScanId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpenScanId(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingScan || isDeleting) return;
    const target = deletingScan;
    setIsDeleting(true);

    // 1. Close the dialog
    setDeleteConfirmOpen(false);

    // 2. Trigger the "thrown in bin" animation on the target row
    setBinningScanId(target.id);

    // 3. Play the smooth binning animation for 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. Perform the permanent deletion
    await deleteScan(target.id);

    // 5. Clean up states
    setBinningScanId(null);
    setDeletingScan(null);
    setIsDeleting(false);
  };

  // Export PDF Report handler
  const handleExportPdf = async () => {
    if (isExporting) return;
    const targetScans = filteredScans.length ? filteredScans : scans;
    if (!targetScans.length) {
      showToast("No scan records available to export", true);
      return;
    }

    setIsExporting(true);
    try {
      const { exportHistoryPdf } = await import("@/lib/exportHistoryPdf");

      const filterParts: string[] = [];
      if (decisionFilter !== "all") filterParts.push(`Decision: ${decisionFilter}`);
      if (sourceFilter !== "all") filterParts.push(`Source: ${sourceFilter}`);
      if (query.trim()) filterParts.push(`Query: "${query.trim()}"`);

      exportHistoryPdf({
        scans: targetScans,
        filterLabel: filterParts.length ? filterParts.join(", ") : undefined,
        query: query.trim() || undefined,
      });

      showToast(`Scan history exported to PDF (${targetScans.length} records)`);
    } catch (err) {
      console.error("PDF export failed:", err);
      showToast("Failed to generate PDF report", true);
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination settings (10 items per page limit)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

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

  // Total pages
  const totalPages = Math.ceil(filteredScans.length / PAGE_SIZE) || 1;

  // Auto-adjust page if current page exceeds total pages (e.g. after deletion or filter)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  // Reset to page 1 on query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, decisionFilter, sourceFilter]);

  // Paginated visible scans
  const paginatedScans = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredScans.slice(start, start + PAGE_SIZE);
  }, [filteredScans, currentPage]);

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
        <div className="actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-export"
            onClick={handleExportPdf}
            disabled={isExporting || scans.length === 0}
            title="Export forensic scan audit report to PDF format"
            aria-label="Export scan history to PDF format"
          >
            {isExporting ? (
              <>
                <svg className="spin-export" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg className="export-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export</span>
              </>
            )}
          </button>
          <button type="button" className="btn btn-line" onClick={clearUserScans}>
            Clear my scans
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid g4" id="hist-kpis">
        {kpis.map((k, i) => (
          <div key={i} className="card metric no-hover">
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
            {filteredScans.length === 0
              ? "0 scans"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                  currentPage * PAGE_SIZE,
                  filteredScans.length
                )} of ${filteredScans.length}${filteredScans.length !== scans.length ? ` (filtered from ${scans.length})` : ""}`}
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
                <th style={{ width: 44, textAlign: "right" }} aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedScans.length ? (
                paginatedScans.map((s) => {
                  const isExpanded = expandedRowId === s.id;
                  const isPhish = s.decision === "PHISHING";
                  // De-duplicate near-identical indicators by semantic key
                  const rawInd = (s.indicators || []).filter((r) => (r.score_impact ?? 0) > 0);
                  const seenConcepts = new Map<string, (typeof rawInd)[0]>();
                  for (const ind of rawInd) {
                    const slug = (ind.title || "")
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "")
                      .slice(0, 14);
                    if (!seenConcepts.has(slug) || (ind.score_impact ?? 0) > (seenConcepts.get(slug)!.score_impact ?? 0)) {
                      seenConcepts.set(slug, ind);
                    }
                  }
                  const topInd = Array.from(seenConcepts.values())
                    .sort((a, b) => (b.score_impact ?? 0) - (a.score_impact ?? 0))
                    .slice(0, 4);

                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        className={`clickable ${binningScanId === s.id ? "row-binning" : ""}`}
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedRowId(isExpanded ? null : s.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setExpandedRowId(isExpanded ? null : s.id);
                          }
                        }}
                      >
                        <td className="mono" style={{ fontSize: "12px", position: "relative" }}>
                          {binningScanId === s.id && (
                            <div className="binning-indicator" role="status" aria-label="Scan binned">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              <span>Binned</span>
                            </div>
                          )}
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
                        <td style={{ textAlign: "right", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <button
                              type="button"
                              className="row-act-btn"
                              aria-label={`Actions for scan ${s.id}`}
                              aria-haspopup="menu"
                              aria-expanded={menuOpenScanId === s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenScanId(menuOpenScanId === s.id ? null : s.id);
                              }}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>

                            {menuOpenScanId === s.id && (
                              <div
                                className="row-menu"
                                role="menu"
                                aria-label={`Actions for scan ${s.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-menu-item"
                                  onClick={() => {
                                    setMenuOpenScanId(null);
                                    handleOpenScan(s.id);
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                  </svg>
                                  <span>Open explanation</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-menu-item"
                                  onClick={() => {
                                    setMenuOpenScanId(null);
                                    handleLoadIntoAnalyzer(s);
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                  <span>Load into analyzer</span>
                                </button>
                                <div className="row-menu-divider" role="separator" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="row-menu-item row-menu-item-destructive"
                                  onClick={() => {
                                    setMenuOpenScanId(null);
                                    setDeletingScan(s);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <svg className="trash-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable detail row */}
                      {isExpanded && (
                        <tr className="detail">
                          <td colSpan={8}>
                            <div className="grid g-2-1" style={{ gap: 20 }}>
                              <div>
                                <div className="lbl" style={{ marginBottom: 8 }}>
                                  PAHF-Net Indicators
                                </div>
                                {topInd.length ? (
                                  topInd.map((r) => (
                                    <div key={r.id} className="row" style={{ padding: "4px 0", fontSize: "13px" }}>
                                      <span style={{ fontWeight: 500 }}>{r.title}</span>
                                      <span className="tag" style={{ marginLeft: 6, fontSize: "11px", textTransform: "capitalize" }}>
                                        {r.category || "security"}
                                      </span>
                                      <span
                                        className="mono muted"
                                        style={{ marginLeft: "auto", fontSize: "12px" }}
                                      >
                                        +{(r.score_impact ?? 0)}%
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="muted">None fired.</span>
                                )}
                                <div style={{ marginTop: 12 }}>
                                  <div className="lbl" style={{ marginBottom: 6 }}>
                                    Modality Gates (g_i)
                                  </div>
                                  <div className="row wrap" style={{ gap: 6 }}>
                                    {(["text", "url", "structure", "linguistic"] as const).map((m) => {
                                      const g = s.gateWeights?.[m] ?? 0;
                                      const c = s.modalityContributions?.[m] ?? 0;
                                      const avail = s.availabilityMask?.[m] ?? true;
                                      const code = { text: "g_t", url: "g_u", structure: "g_s", linguistic: "g_l" }[m];
                                      return (
                                        <span
                                          key={m}
                                          className="tag"
                                          style={{ fontSize: "11px", opacity: avail ? 1 : 0.6 }}
                                          title={`Contribution: ${c >= 0 ? "+" : ""}${c.toFixed(3)}`}
                                        >
                                          {code}: {g.toFixed(2)} ({m})
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="lbl" style={{ marginBottom: 8 }}>
                                  Entities
                                </div>
                                <div className="ent">
                                  <span className="tag">sector · {s.entities?.sector || "General"}</span>
                                  {(s.entities?.amounts || []).map((a, idx) => (
                                    <span key={idx} className="tag">
                                      amount · {a}
                                    </span>
                                  ))}
                                  {s.entities?.tx && <span className="tag">tx · {s.entities.tx}</span>}
                                  {(s.entities?.orgs || []).map((o, idx) => (
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
                  <td colSpan={8} style={{ padding: 36, textAlign: "center" }} className="muted">
                    No scans match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-footer">
            <ThePagination
              page={currentPage}
              totalPages={totalPages}
              onChange={(p) => setCurrentPage(p)}
            />
            <div className="pagination-info mono">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

      {/* Explicit Permanent Deletion Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteConfirmOpen(open);
            if (!open) setDeletingScan(null);
          }
        }}
        className="del-modal-panel sm:max-w-[480px]"
      >
        <div className="del-modal-content">
          {/* Header with Danger Pill Badge & Close button */}
          <div className="del-modal-header">
            <div className="del-modal-icon-badge" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <DialogTitle className="del-modal-title">Delete scan record?</DialogTitle>
              <div className="del-modal-subtitle">
                This item will be permanently removed from your workspace.
              </div>
            </div>
            <button
              type="button"
              className="del-modal-close-btn"
              disabled={isDeleting}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeletingScan(null);
              }}
              aria-label="Close dialog"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Record Callout Card */}
          {deletingScan && (
            <div className="del-modal-card">
              <div className="del-modal-card-top">
                <span className="del-modal-card-id mono">{deletingScan.id}</span>
                <span
                  className={`verdict ${deletingScan.decision === "PHISHING" ? "v-phish" : "v-safe"}`}
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                >
                  {deletingScan.decision === "PHISHING" ? "Phishing" : "Safe"}
                </span>
                <span className="mono muted" style={{ fontSize: "11px", marginLeft: "auto" }}>
                  P: {formatP(deletingScan.P)}
                </span>
              </div>
              <div className="del-modal-card-subject">
                {deletingScan.email.subject || "Untitled Email Analysis"}
              </div>
              <div className="del-modal-card-sender">
                {senderShort(deletingScan.email.from)}
              </div>
            </div>
          )}

          {/* Warning Note */}
          <div className="del-modal-warning">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="del-modal-warning-icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <DialogDescription className="del-modal-desc">
              All associated indicator breakdown scores, forensic spans, and audit statistics for this scan will be permanently purged. This action cannot be reversed.
            </DialogDescription>
          </div>

          {/* Actions Footer */}
          <div className="del-modal-footer">
            <button
              type="button"
              className="btn del-btn-cancel"
              disabled={isDeleting}
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeletingScan(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn del-btn-danger"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? (
                <>
                  <svg className="spin-del" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  <span>Delete permanently</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
