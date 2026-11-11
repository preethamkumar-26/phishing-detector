"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmailInputPanel } from "@/components/analyzer/EmailInputPanel";
import { AnalysisResultsPanel } from "@/components/analyzer/AnalysisResultsPanel";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { analyzeEmail } from "@/services/scanService";
import { ScanResult } from "@/types/scan";
import { Cpu, ShieldCheck } from "lucide-react";

function AnalyzerContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "upload" ? "upload" : "paste";

  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!body.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await analyzeEmail({
        subject,
        sender,
        body,
      });
      setResult(response);
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSubject("");
    setSender("");
    setBody("");
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <DemoDataNotice
        message="Prototype Analyzer Notice — Results are generated via heuristic simulation to model the planned BERT-Attention-CNN-GRU backend."
        variant="banner"
      />

      <PageHeader
        title="Email Analyzer"
        description="Inspect suspicious emails with multi-layer neural language understanding and feature mapping."
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Model Ready
          </span>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-xl border border-[var(--border-color)] font-mono hidden sm:inline-block">
            BERT-MHA-CNN-GRU-v0.1
          </span>
        </div>
      </PageHeader>

      {/* Exact Two-Panel Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start min-h-[680px]">
        {/* Left Panel: Email Input */}
        <div className="h-full">
          <EmailInputPanel
            subject={subject}
            sender={sender}
            body={body}
            onSubjectChange={setSubject}
            onSenderChange={setSender}
            onBodyChange={setBody}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            initialMode={initialMode}
          />
        </div>

        {/* Right Panel: Analysis Results */}
        <div className="h-full">
          <AnalysisResultsPanel
            result={result}
            isLoading={isLoading}
            onClear={handleClear}
          />
        </div>
      </div>
    </div>
  );
}

export default function AnalyzerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading analyzer...</div>}>
      <AnalyzerContent />
    </Suspense>
  );
}

