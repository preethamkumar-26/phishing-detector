"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ClassificationBadge } from "@/components/ui/Badge";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import RubberSegment from "@/components/ui/RubberSegment";
import { DEMO_EXPLAINABILITY_SAMPLE } from "@/data/demo-data";
import { Info } from "lucide-react";

export default function ExplainabilityPage() {
  const [method, setMethod] = useState<"attention" | "shap" | "lime">("attention");
  const [selectedToken, setSelectedToken] = useState<string | null>("Re-authenticate");

  return (
    <div className="space-y-6">
      {/* Prominent Demo Notice */}
      <DemoDataNotice
        message="Demo Visualization — Not connected to the trained model. Illustrative token heatmap and feature attribution for research interface validation."
        variant="banner"
      />

      <PageHeader
        title="Explainable AI (XAI)"
        description="Linguistic feature attribution, attention distributions, and interpretability mechanisms."
      >
        {/* Explanation Method Selector via RubberSegment */}
        <RubberSegment
          items={[
            { value: "attention", label: "Multi-Head Attention" },
            { value: "shap", label: "SHAP Attribution" },
            { value: "lime", label: "LIME Local" },
          ]}
          value={method}
          onChange={(val) => setMethod(val as "attention" | "shap" | "lime")}
          size="sm"
          radius={10}
          ariaLabel="Select explanation method"
        />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Token Heatmap & Feature Ranking */}
        <div className="lg:col-span-8 space-y-6">
          {/* Interactive Token Heatmap Panel */}
          <Card className="border-[var(--border-color)]">
            <CardHeader className="p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Token Importance Heatmap</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      {method.toUpperCase()} weights
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Darker highlights indicate tokens with higher contribution toward the phishing classification. Click any token to inspect its weight.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>Low Weight</span>
                  <div className="w-16 h-2 rounded-full bg-gradient-to-r from-[var(--border-color)] via-blue-500 to-red-500" />
                  <span>High Impact</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-3 space-y-4">
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] font-mono text-xs leading-loose tracking-wide select-none">
                {DEMO_EXPLAINABILITY_SAMPLE.tokens.map((item, idx) => {
                  const isSelected = selectedToken === item.token;
                  // Color intensity based on weight
                  let bgClass = "bg-transparent text-[var(--text-primary)]";
                  if (item.weight > 0.8) {
                    bgClass = "bg-red-500/25 dark:bg-red-500/35 text-red-900 dark:text-red-100 border border-red-500/60";
                  } else if (item.weight > 0.6) {
                    bgClass = "bg-blue-500/20 dark:bg-blue-500/30 text-blue-900 dark:text-blue-100 border border-blue-500/50";
                  } else if (item.weight > 0.3) {
                    bgClass = "bg-slate-200 dark:bg-slate-700/40 text-slate-800 dark:text-slate-200";
                  }

                  return (
                    <span
                      key={idx}
                      onClick={() => setSelectedToken(item.token)}
                      className={`inline-block mx-0.5 my-1 px-1.5 py-0.5 rounded cursor-pointer transition-all ${bgClass} ${
                        isSelected ? "ring-2 ring-[var(--primary-accent)] dark:ring-white scale-105 font-bold" : "hover:opacity-80"
                      }`}
                      title={`Weight: ${(item.weight * 100).toFixed(1)}%`}
                    >
                      {item.token}
                    </span>
                  );
                })}
              </div>

              {selectedToken && (
                <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)]">Selected Token:</span>
                    <span className="font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                      &ldquo;{selectedToken}&rdquo;
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-mono text-xs">
                    <span>Attribution score:</span>
                    <span className="font-bold">
                      {DEMO_EXPLAINABILITY_SAMPLE.tokens.find((t) => t.token === selectedToken)?.weight
                        ? `${(DEMO_EXPLAINABILITY_SAMPLE.tokens.find((t) => t.token === selectedToken)!.weight * 100).toFixed(1)}%`
                        : "76.4%"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Contributing Phrases Table */}
          <Card className="border-[var(--border-color)]">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold">
                Ranked Feature Attributions
              </CardTitle>
              <CardDescription>
                Strongest linguistic signals identified by the hybrid model
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="space-y-2.5">
                {DEMO_EXPLAINABILITY_SAMPLE.topFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-mono text-[10px] text-[var(--text-muted)]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-mono font-bold text-red-700 dark:text-red-300 text-sm">
                          &ldquo;{feat.name}&rdquo;
                        </span>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{feat.type}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Visual progress bar */}
                      <div className="w-28 sm:w-36 h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-red-500 rounded-full"
                          style={{ width: `${feat.importance * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-[var(--text-primary)] w-12 text-right">
                        {(feat.importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 4 Cols: Prediction Summary & Limitations Disclaimer */}
        <div className="lg:col-span-4 space-y-6">
          {/* Verdict Summary Card */}
          <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]">
            <CardHeader className="p-5 pb-3 border-b border-[var(--border-color)]">
              <CardTitle className="text-sm font-bold">Inference Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[var(--text-muted)] uppercase text-[10px] font-semibold tracking-wider">
                  Classification
                </span>
                <div>
                  <ClassificationBadge prediction="phishing" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[var(--text-muted)] uppercase text-[10px] font-semibold tracking-wider">
                  Model Confidence
                </span>
                <div className="text-2xl font-black text-[var(--text-primary)] font-mono">
                  96.4% <span className="text-xs text-[var(--text-muted)] font-normal">(Demo)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] space-y-2 text-[var(--text-muted)]">
                <div className="flex justify-between">
                  <span>Explainer Model:</span>
                  <span className="text-[var(--text-primary)] font-medium">Integrated Gradients + MHA</span>
                </div>
                <div className="flex justify-between">
                  <span>Baseline Target:</span>
                  <span className="text-[var(--text-primary)] font-medium">Legitimate Corpus Mean</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens Evaluated:</span>
                  <span className="text-[var(--text-primary)] font-mono">148 tokens</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Research Faithfulness Note */}
          <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]/80">
            <CardContent className="p-5 space-y-3 text-xs leading-relaxed text-[var(--text-muted)]">
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <Info className="w-4 h-4 text-[var(--primary-accent)]" />
                Scientific Faithfulness Note
              </div>
              <p>
                In empirical NLP literature, raw attention weights do not always correspond to causal model rationales. Attention maps reveal internal routing rather than guaranteed counterfactual necessity.
              </p>
              <p className="text-[11px] text-[var(--text-muted)]/80">
                Future project phases will include systematic erasure tests and SHAP perturbation checks to validate explanation fidelity.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

