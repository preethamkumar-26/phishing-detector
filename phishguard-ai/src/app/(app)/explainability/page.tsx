"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, ClassificationBadge } from "@/components/ui/Badge";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { DEMO_EXPLAINABILITY_SAMPLE } from "@/data/demo-data";
import {
  Sparkles,
  Layers,
  Info,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

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
        {/* Explanation Method Selector */}
        <div className="flex items-center gap-1 p-1 bg-[#151E31] rounded-xl border border-[#273449]">
          <button
            onClick={() => setMethod("attention")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              method === "attention"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
          >
            Multi-Head Attention
          </button>
          <button
            onClick={() => setMethod("shap")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              method === "shap"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
          >
            SHAP Attribution
          </button>
          <button
            onClick={() => setMethod("lime")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              method === "lime"
                ? "bg-[#8B5CF6] text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
          >
            LIME Local
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Token Heatmap & Feature Ranking */}
        <div className="lg:col-span-8 space-y-6">
          {/* Interactive Token Heatmap Panel */}
          <Card className="border-[#273449]">
            <CardHeader className="p-5 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Token Importance Heatmap</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {method.toUpperCase()} weights
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Darker highlights indicate tokens with higher contribution toward the phishing classification. Click any token to inspect its weight.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
                  <span>Low Weight</span>
                  <div className="w-16 h-2 rounded-full bg-gradient-to-r from-slate-700 via-violet-500 to-red-500" />
                  <span>High Impact</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-3 space-y-4">
              <div className="p-4 rounded-xl bg-[#101729] border border-[#273449] font-mono text-xs leading-loose tracking-wide select-none">
                {DEMO_EXPLAINABILITY_SAMPLE.tokens.map((item, idx) => {
                  const isSelected = selectedToken === item.token;
                  // Color intensity based on weight
                  let bgClass = "bg-transparent text-slate-300";
                  if (item.weight > 0.8) {
                    bgClass = "bg-red-500/35 text-red-100 border border-red-500/60";
                  } else if (item.weight > 0.6) {
                    bgClass = "bg-violet-500/30 text-violet-100 border border-violet-500/50";
                  } else if (item.weight > 0.3) {
                    bgClass = "bg-slate-700/40 text-slate-200";
                  }

                  return (
                    <span
                      key={idx}
                      onClick={() => setSelectedToken(item.token)}
                      className={`inline-block mx-0.5 my-1 px-1.5 py-0.5 rounded cursor-pointer transition-all ${bgClass} ${
                        isSelected ? "ring-2 ring-white scale-105 font-bold" : "hover:opacity-80"
                      }`}
                      title={`Weight: ${(item.weight * 100).toFixed(1)}%`}
                    >
                      {item.token}
                    </span>
                  );
                })}
              </div>

              {selectedToken && (
                <div className="p-3 rounded-xl bg-[#1B2740]/60 border border-[#273449] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#9CA3AF]">Selected Token:</span>
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-[#273449]">
                      "{selectedToken}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-violet-300 font-mono text-xs">
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
          <Card className="border-[#273449]">
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
                    className="p-3 rounded-xl bg-[#101729] border border-[#273449] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#1B2740] flex items-center justify-center font-mono text-[10px] text-[#9CA3AF]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-mono font-bold text-red-300 text-sm">
                          "{feat.name}"
                        </span>
                        <div className="text-[11px] text-[#9CA3AF] mt-0.5">{feat.type}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Visual progress bar */}
                      <div className="w-28 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-red-500 rounded-full"
                          style={{ width: `${feat.importance * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-white w-12 text-right">
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
          <Card className="border-[#273449] bg-[#151E31]">
            <CardHeader className="p-5 pb-3 border-b border-[#273449]">
              <CardTitle className="text-sm font-bold">Inference Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[#9CA3AF] uppercase text-[10px] font-semibold tracking-wider">
                  Classification
                </span>
                <div>
                  <ClassificationBadge prediction="phishing" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[#9CA3AF] uppercase text-[10px] font-semibold tracking-wider">
                  Model Confidence
                </span>
                <div className="text-2xl font-black text-[#F3F4F6] font-mono">
                  96.4% <span className="text-xs text-[#9CA3AF] font-normal">(Demo)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#273449] space-y-2 text-[#9CA3AF]">
                <div className="flex justify-between">
                  <span>Explainer Model:</span>
                  <span className="text-[#F3F4F6] font-medium">Integrated Gradients + MHA</span>
                </div>
                <div className="flex justify-between">
                  <span>Baseline Target:</span>
                  <span className="text-[#F3F4F6] font-medium">Legitimate Corpus Mean</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens Evaluated:</span>
                  <span className="text-[#F3F4F6] font-mono">148 tokens</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Research Faithfulness Note */}
          <Card className="border-[#273449] bg-[#101729]/80">
            <CardContent className="p-5 space-y-3 text-xs leading-relaxed text-[#9CA3AF]">
              <div className="flex items-center gap-2 font-bold text-[#F3F4F6]">
                <Info className="w-4 h-4 text-violet-400" />
                Scientific Faithfulness Note
              </div>
              <p>
                In empirical NLP literature, raw attention weights do not always correspond to causal model rationales. Attention maps reveal internal routing rather than guaranteed counterfactual necessity.
              </p>
              <p className="text-[11px] text-[#9CA3AF]/80">
                Future project phases will include systematic erasure tests and SHAP perturbation checks to validate explanation fidelity.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

