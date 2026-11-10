"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClassificationBadge, Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { formatDateTime, truncate } from "@/lib/utils";
import { ScanRecord } from "@/types/scan";
import { getScanHistory } from "@/services/scanService";
import {
  Search,
  Filter,
  Eye,
  ScanSearch,
  FileUp,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export function RecentScansTable() {
  const [scans, setScans] = useState<ScanRecord[]>(() => getScanHistory());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "phishing" | "safe" | "needs_review">("all");
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);

  // Client-side filtering
  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      const matchesSearch =
        searchQuery === "" ||
        scan.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || scan.prediction === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [scans, searchQuery, statusFilter]);

  return (
    <>
      <Card className="border-[#273449]">
        <CardHeader className="p-5 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-bold">
                  Recent Email Scans & Workspace
                </CardTitle>
                {/* Status Chips required by sketch */}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Model ON
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-[#273449]">
                  Demo model v0.1
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Demo / Not connected
                </span>
              </div>
              <CardDescription className="mt-1">
                Evaluated records from recent email inspections in this demo session
              </CardDescription>
            </div>

            {/* Quick Actions from Sketch */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/analyzer?mode=upload">
                <Button variant="outline" size="sm">
                  <FileUp className="w-3.5 h-3.5" />
                  Scan File
                </Button>
              </Link>
              <Link href="/analyzer">
                <Button variant="primary" size="sm">
                  <ScanSearch className="w-3.5 h-3.5" />
                  New Scan
                </Button>
              </Link>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 pt-4 border-t border-[#273449]/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by subject, sender or scan ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#101729] text-[#F3F4F6] placeholder-[#9CA3AF] rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: "all", label: "All Scans" },
                  { id: "phishing", label: "Phishing" },
                  { id: "safe", label: "Safe" },
                  { id: "needs_review", label: "Needs Review" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    statusFilter === tab.id
                      ? "bg-[#8B5CF6] text-white shadow-sm"
                      : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1B2740]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#273449] bg-[#101729]/60 text-[#9CA3AF] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Email Subject & Sender</th>
                  <th className="py-3 px-4 font-semibold">Classification</th>
                  <th className="py-3 px-4 font-semibold">Confidence</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#273449]/60">
                {filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#9CA3AF]">
                      No scans matching the current search query or filter.
                    </td>
                  </tr>
                ) : (
                  filteredScans.slice(0, 7).map((scan) => (
                    <tr
                      key={scan.id}
                      className="hover:bg-[#1B2740]/40 transition-colors group"
                    >
                      <td className="py-3 px-5 max-w-xs">
                        <div className="font-semibold text-[#F3F4F6] truncate group-hover:text-[#8B5CF6] transition-colors">
                          {scan.subject}
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                          {scan.sender || "Unknown Sender"}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <ClassificationBadge prediction={scan.prediction} size="sm" />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <span className="font-semibold text-[#F3F4F6]">
                          {scan.confidence.toFixed(1)}%
                        </span>{" "}
                        <span className="text-[10px] text-[#9CA3AF] font-sans">(demo)</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#9CA3AF] text-[11px]">
                        {formatDateTime(scan.timestamp)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          onClick={() => setSelectedScan(scan)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 px-5 bg-[#101729]/40 border-t border-[#273449]/60 flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>
              Showing {Math.min(7, filteredScans.length)} of {filteredScans.length} records
            </span>
            <Link
              href="/history"
              className="text-[#8B5CF6] hover:underline font-medium flex items-center gap-1"
            >
              View Full History ({scans.length} total)
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Detail Inspection Modal */}
      <Dialog open={!!selectedScan} onOpenChange={(open) => !open && setSelectedScan(null)}>
        {selectedScan && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ClassificationBadge prediction={selectedScan.prediction} />
                <span className="text-xs text-[#9CA3AF] font-mono">{selectedScan.id}</span>
              </div>
              <DialogTitle className="text-base font-bold mt-2">
                {selectedScan.subject}
              </DialogTitle>
              <DialogDescription>
                From: {selectedScan.sender} • {formatDateTime(selectedScan.timestamp)}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-[#101729] rounded-xl border border-[#273449] space-y-2 text-xs">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Evaluated Model:</span>
                  <span className="text-[#F3F4F6] font-mono">{selectedScan.modelVersion}</span>
                </div>
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Inference Confidence:</span>
                  <span className="text-[#F3F4F6] font-bold">{selectedScan.confidence}% (Demo)</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Email Body Snippet
                </h4>
                <div className="p-3 bg-[#101729]/80 rounded-xl border border-[#273449] font-mono text-xs text-[#F3F4F6] whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedScan.bodySnippet}
                </div>
              </div>

              {selectedScan.evidence && selectedScan.evidence.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Flagged Clues & Indicators ({selectedScan.evidence.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedScan.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold text-red-300">"{ev.text}"</span>
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{ev.reason}</p>
                        </div>
                        <Badge variant="threat" size="sm">
                          {ev.severity || "high"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Link href="/explainability">
                <Button variant="outline" size="sm">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-[#8B5CF6]" />
                  Open in Explainability
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedScan(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </>
  );
}

