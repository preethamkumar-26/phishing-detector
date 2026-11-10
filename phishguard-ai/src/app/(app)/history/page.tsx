"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClassificationBadge, Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { formatDateTime } from "@/lib/utils";
import { ScanRecord } from "@/types/scan";
import { getScanHistory, deleteScanRecord } from "@/services/scanService";
import {
  Search,
  Download,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

function HistoryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [scans, setScans] = useState<ScanRecord[]>(() => getScanHistory());
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<"all" | "phishing" | "safe" | "needs_review">("all");
  const [dateRange, setDateRange] = useState("all");
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportNotice, setExportNotice] = useState(false);
  const pageSize = 8;

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

  const totalPages = Math.max(1, Math.ceil(filteredScans.length / pageSize));
  const paginatedScans = filteredScans.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDelete = (id: string) => {
    deleteScanRecord(id);
    setScans(getScanHistory());
    if (selectedScan?.id === id) {
      setSelectedScan(null);
    }
  };

  const handleExport = () => {
    setExportNotice(true);
  };

  return (
    <div className="space-y-6">
      <DemoDataNotice
        message="Demo History Workspace — Retains analysis records in session memory. Historical records are cleared upon full page reload."
        variant="banner"
      />

      <PageHeader
        title="Scan History"
        description="Comprehensive audit trail and forensic logs for all submitted email analyses."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Scans (Demo)
          </Button>
          <Link href="/analyzer">
            <Button variant="primary" size="sm">
              New Scan
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Search and Filters Bar */}
      <Card className="border-[#273449] p-4 bg-[#151E31]">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by subject, sender, or scan ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 pl-9 pr-3 text-xs bg-[#101729] text-[#F3F4F6] placeholder-[#9CA3AF] rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#101729] rounded-xl border border-[#273449]">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "phishing", label: "Phishing" },
                  { id: "safe", label: "Safe" },
                  { id: "needs_review", label: "Review" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    statusFilter === tab.id
                      ? "bg-[#8B5CF6] text-white shadow-sm"
                      : "text-[#9CA3AF] hover:text-[#F3F4F6]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date range UI selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101729] rounded-xl border border-[#273449] text-xs text-[#9CA3AF]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-[#F3F4F6] focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#101729]">All Dates</option>
                <option value="today" className="bg-[#101729]">Today</option>
                <option value="week" className="bg-[#101729]">Past 7 Days</option>
                <option value="month" className="bg-[#101729]">Past 30 Days</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Scans Table */}
      <Card className="border-[#273449]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#273449] bg-[#101729]/60 text-[#9CA3AF] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Scan ID</th>
                  <th className="py-3 px-5 font-semibold">Email Subject & Sender</th>
                  <th className="py-3 px-4 font-semibold">Classification</th>
                  <th className="py-3 px-4 font-semibold">Confidence</th>
                  <th className="py-3 px-4 font-semibold">Scan Date</th>
                  <th className="py-3 px-4 font-semibold">Model Version</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#273449]/60">
                {paginatedScans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#9CA3AF]">
                      No historical records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedScans.map((scan) => (
                    <tr
                      key={scan.id}
                      className="hover:bg-[#1B2740]/40 transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-mono text-[11px] text-[#9CA3AF]">
                        {scan.id}
                      </td>
                      <td className="py-3.5 px-5 max-w-xs">
                        <div className="font-semibold text-[#F3F4F6] truncate group-hover:text-[#8B5CF6] transition-colors">
                          {scan.subject}
                        </div>
                        <div className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                          {scan.sender || "Unspecified"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <ClassificationBadge prediction={scan.prediction} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        <span className="font-semibold text-[#F3F4F6]">
                          {scan.confidence.toFixed(1)}%
                        </span>{" "}
                        <span className="text-[10px] text-[#9CA3AF] font-sans">(demo)</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#9CA3AF] text-[11px]">
                        {formatDateTime(scan.timestamp)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#9CA3AF] font-mono text-[10px]">
                        {scan.modelVersion}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setSelectedScan(scan)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                          <button
                            onClick={() => handleDelete(scan.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete demo scan record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="p-4 bg-[#101729]/60 border-t border-[#273449] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9CA3AF]">
            <div>
              Showing {filteredScans.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredScans.length)} of {filteredScans.length} records
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-3 py-1 font-mono text-xs text-[#F3F4F6]">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side Detail Modal / Inspection View */}
      <Dialog open={!!selectedScan} onOpenChange={(open) => !open && setSelectedScan(null)}>
        {selectedScan && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClassificationBadge prediction={selectedScan.prediction} />
                  <span className="text-xs text-[#9CA3AF] font-mono">{selectedScan.id}</span>
                </div>
              </div>
              <DialogTitle className="text-base font-bold mt-2">
                {selectedScan.subject}
              </DialogTitle>
              <DialogDescription>
                From: {selectedScan.sender} • Scanned {formatDateTime(selectedScan.timestamp)}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-[#101729] rounded-xl border border-[#273449] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#9CA3AF] text-[10px] block">Model Pipeline:</span>
                  <span className="text-[#F3F4F6] font-mono">{selectedScan.modelVersion}</span>
                </div>
                <div>
                  <span className="text-[#9CA3AF] text-[10px] block">Inference Confidence:</span>
                  <span className="text-[#F3F4F6] font-bold font-mono">{selectedScan.confidence}% (Demo)</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                  Extracted Body Text
                </h4>
                <div className="p-3 bg-[#101729] rounded-xl border border-[#273449] font-mono text-xs text-[#F3F4F6] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {selectedScan.bodySnippet}
                </div>
              </div>

              {selectedScan.evidence && selectedScan.evidence.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">
                    Detected Evidence Indicators ({selectedScan.evidence.length})
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedScan.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#1B2740]/80 border border-[#273449] text-xs flex items-start justify-between gap-2"
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
              <Button variant="primary" size="sm" onClick={() => setSelectedScan(null)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* Export Demo Toast Modal */}
      <Dialog open={exportNotice} onOpenChange={setExportNotice}>
        <DialogHeader>
          <DialogTitle>Export Scan Data (Demo)</DialogTitle>
          <DialogDescription>
            Audit log export configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-xs text-[#9CA3AF] bg-[#101729] p-3 rounded-xl border border-[#273449] space-y-2">
          <p>
            In production, this triggers an authenticated CSV or JSON streaming export of scan records, model predictions, and flagged token spans.
          </p>
          <p className="font-mono text-[11px] text-[#F3F4F6]">
            Exporting {filteredScans.length} active records in memory...
          </p>
        </div>
        <DialogFooter>
          <Button variant="primary" size="sm" onClick={() => setExportNotice(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#9CA3AF]">Loading history...</div>}>
      <HistoryContent />
    </Suspense>
  );
}

