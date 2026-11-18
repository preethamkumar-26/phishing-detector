"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScanResult } from "@/types/scan";
import { saveScanToHistory } from "@/services/scanService";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  BookmarkCheck,
  RotateCcw,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSearch,
} from "lucide-react";

interface AnalysisResultsPanelProps {
  result: ScanResult | null;
  isLoading: boolean;
  onClear: () => void;
  error?: string | null;
  onRetry?: () => void;
}

const SCAN_STAGES = [
  { id: 1, label: "Email structure" },
  { id: 2, label: "Sender identity" },
  { id: 3, label: "URL reputation" },
  { id: 4, label: "Content signals" },
  { id: 5, label: "ML classification" },
];

export function AnalysisResultsPanel({
  result,
  isLoading,
  onClear,
  error,
  onRetry,
}: AnalysisResultsPanelProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [activeStage, setActiveStage] = useState(0);

  React.useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setActiveStage((prev) => (prev < SCAN_STAGES.length - 1 ? prev + 1 : prev));
    }, 150);

    return () => {
      clearInterval(interval);
      setActiveStage(0);
    };
  }, [isLoading]);

  const handleSave = () => {
    if (result) {
      saveScanToHistory(result);
      setIsSaved(true);
    }
  };

  return (
    <Card phase={2} className="h-full flex flex-col border-[var(--border-color)]">
      <CardHeader className="pb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>Analysis Results</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Demo Output
              </span>
            </CardTitle>
            <CardDescription>
              Availability-Gated Hierarchical Fusion &amp; DANN verdicts
            </CardDescription>
          </div>
          {result && (
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              ID: {result.scanId}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-5 flex flex-col justify-between overflow-y-auto">
        {/* State 1: Loading / In-Progress Analysis */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 animate-in fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--primary-accent)] to-[var(--secondary-accent)] flex items-center justify-center text-white shadow-lg shadow-blue-900/30 animate-pulse">
                <Cpu className="w-8 h-8 animate-spin" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-[var(--bg-surface)]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Analyzing Email Content…
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs">
                Scanning email structure, linguistic urgency signals, and deep contextual representations
              </p>
            </div>

            {/* Approved 5-stage scan progress checklist */}
            <div className="w-full max-w-xs space-y-2 text-left bg-[var(--bg-elevated)] p-3.5 rounded-xl border border-[var(--border-color)] text-[11px]">
              {SCAN_STAGES.map((stage, idx) => {
                const isCompleted = idx < activeStage;
                const isActive = idx === activeStage;
                return (
                  <div
                    key={stage.id}
                    className={`flex items-center gap-2.5 transition-colors duration-150 ${
                      isCompleted
                        ? "text-[var(--text-primary)]"
                        : isActive
                        ? "text-[var(--primary-accent)] font-medium"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[var(--primary-accent)] animate-ping shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]/30 shrink-0" />
                    )}
                    <span>
                      {stage.id}. {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] max-w-xs">
              Pipeline active. The final classification verdict is generated once all layers evaluate.
            </p>
          </div>
        )}

        {/* State: Error */}
        {!isLoading && error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Analysis Request Failed
              </h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {error}
              </p>
            </div>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Retry Analysis
              </Button>
            )}
          </div>
        )}

        {/* State 2: Empty State */}
        {!isLoading && !result && !error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]">
              <FileSearch className="w-8 h-8 text-[var(--primary-accent)]/70" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Your analysis will appear here
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">
                Paste email content or upload an email file on the left, then click{" "}
                <span className="text-[var(--primary-accent)] font-semibold">Analyze Email</span> to view the model classification and flagged indicators.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
                <Layers className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                PAHF-Net Availability-Gated Fusion Pipeline Ready
              </span>
            </div>
          </div>
        )}

        {/* State 3: Active Result */}
        {!isLoading && result && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Classification Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                result.prediction === "phishing"
                  ? "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
                  : result.prediction === "safe"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    result.prediction === "phishing"
                      ? "bg-red-500/20 text-red-400"
                      : result.prediction === "safe"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {result.prediction === "phishing" && <ShieldAlert className="w-6 h-6" />}
                  {result.prediction === "safe" && <ShieldCheck className="w-6 h-6" />}
                  {result.prediction === "needs_review" && <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                    Detection Result
                  </div>
                  <div className="text-lg font-extrabold tracking-tight">
                    {result.prediction === "phishing" && "PHISHING DETECTED"}
                    {result.prediction === "safe" && "SAFE / LEGITIMATE"}
                    {result.prediction === "needs_review" && "NEEDS HUMAN REVIEW"}
                  </div>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-current/20">
                <div className="text-[10px] uppercase tracking-wider font-semibold opacity-75">
                  Demo Confidence
                </div>
                <div className="text-xl font-black font-mono">
                  {result.confidence?.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs leading-relaxed space-y-1">
              <span className="font-semibold text-[var(--text-primary)] block">Summary Assessment:</span>
              <p className="text-[var(--text-muted)]">{result.summary}</p>
            </div>

            {/* Evidence & Indicators List */}
            {result.evidence.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                    Flagged Linguistic & Contextual Indicators ({result.evidence.length})
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Illustrative clues</span>
                </div>

                <div className="space-y-2">
                  {result.evidence.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[var(--bg-elevated)]/70 border border-[var(--border-color)] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono font-semibold text-red-700 dark:text-red-300 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/30 inline-block">
                          &quot;{item.text}&quot;
                        </span>
                        <p className="text-[11px] text-[var(--text-muted)]">{item.reason}</p>
                      </div>
                      <Badge
                        variant={item.severity === "critical" ? "threat" : "warning"}
                        size="sm"
                      >
                        {item.severity || "high"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analyzed Email Excerpt (Clean, unhighlighted per §3) */}
            {result.body && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[var(--text-primary)] block">
                  Analyzed Email Excerpt:
                </span>
                <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)] max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {result.body.split("\n").slice(0, 8).join("\n")}
                </div>
              </div>
            )}

            {/* Model & Metadata chip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]/70 text-[11px] text-[var(--text-muted)]">
              <span>Inference Time: {result.processingTimeMs} ms</span>
              <span className="font-mono text-[10px] bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)] px-2 py-0.5 rounded">
                Model: {result.modelVersion}
              </span>
            </div>

            {/* Result Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <Link href="/explainability" prefetch={true} className="w-full sm:w-auto flex-1">
                <Button variant="primary" size="md" className="w-full justify-center">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  View Explanation
                </Button>
              </Link>
              <Button
                variant={isSaved ? "secondary" : "outline"}
                size="md"
                onClick={handleSave}
                disabled={isSaved}
                className="w-full sm:w-auto"
              >
                <BookmarkCheck className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                {isSaved ? "Saved to History" : "Save to History"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={onClear}
                className="w-full sm:w-auto text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

