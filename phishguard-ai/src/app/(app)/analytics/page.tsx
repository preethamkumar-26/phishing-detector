"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  DEMO_RESEARCH_METRICS,
  DEMO_CONFUSION_MATRIX,
  DEMO_MODEL_COMPARISON,
  DEMO_LOSS_CURVES,
  DEMO_ROC_CURVE,
} from "@/data/demo-data";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Database,
  Sliders,
  Sparkles,
  Info,
  Zap,
  HardDrive,
} from "lucide-react";

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const cm = DEMO_CONFUSION_MATRIX;
  const totalCM = cm.truePositive + cm.falsePositive + cm.trueNegative + cm.falseNegative;

  return (
    <div className="space-y-6">
      <DemoDataNotice
        message="Demo Research Evaluation — Metrics, loss curves, and confusion tables reflect illustrative progress targets based on project synthesis."
        variant="banner"
      />

      <PageHeader
        title="Model Performance & Evaluation"
        description="Comprehensive evaluation metrics, ROC-AUC trajectories, loss curves, and comparative architecture benchmarks."
      >
        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-[var(--border-color)] font-mono">
          Optimizer: Mountain Gazelle (MGO)
        </span>
      </PageHeader>

      {/* 4 Primary Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Test Accuracy"
          value={`${DEMO_RESEARCH_METRICS.accuracy}%`}
          subtitle="Overall correct predictions"
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          trend="Target: >97.0%"
          isPositive={true}
        />
        <StatCard
          title="Precision (Phishing)"
          value={`${DEMO_RESEARCH_METRICS.precision}%`}
          subtitle="Low false positive rate"
          icon={TrendingUp}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10 border-blue-500/20"
          trend="FP: 45 samples"
          isPositive={true}
        />
        <StatCard
          title="Recall (Sensitivity)"
          value={`${DEMO_RESEARCH_METRICS.recall}%`}
          subtitle="Threat capture rate"
          icon={Zap}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10 border-violet-500/20"
          trend="FN: 27 samples"
          isPositive={true}
        />
        <StatCard
          title="Macro F1-Score"
          value={`${DEMO_RESEARCH_METRICS.f1Score}%`}
          subtitle="Harmonic mean of P & R"
          icon={Cpu}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10 border-amber-500/20"
          trend="Champion metric"
          isPositive={true}
        />
      </div>

      {/* Confusion Matrix & ROC Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Confusion Matrix Interactive Visual Widget */}
        <div className="lg:col-span-5">
          <Card className="h-full border-[var(--border-color)]">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Confusion Matrix (Test Split)</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  N = {totalCM.toLocaleString()}
                </span>
              </CardTitle>
              <CardDescription>
                Cross-tabulation of ground truth versus predicted labels
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                {/* True Positive */}
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    True Positive (TP)
                  </div>
                  <div className="text-2xl font-black text-[var(--text-primary)] font-mono mt-1">
                    {cm.truePositive.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Phishing correctly flagged
                  </div>
                </div>

                {/* False Positive */}
                <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30">
                  <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    False Positive (FP)
                  </div>
                  <div className="text-2xl font-black text-[var(--text-primary)] font-mono mt-1">
                    {cm.falsePositive.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Legitimate flagged as threat
                  </div>
                </div>

                {/* False Negative */}
                <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30">
                  <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider">
                    False Negative (FN)
                  </div>
                  <div className="text-2xl font-black text-[var(--text-primary)] font-mono mt-1">
                    {cm.falseNegative.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Missed phishing emails
                  </div>
                </div>

                {/* True Negative */}
                <div className="p-4 rounded-xl bg-blue-500/15 border border-blue-500/30">
                  <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                    True Negative (TN)
                  </div>
                  <div className="text-2xl font-black text-[var(--text-primary)] font-mono mt-1">
                    {cm.trueNegative.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Legitimate correctly passed
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-muted)] space-y-1">
                <div className="flex justify-between">
                  <span>Specificity:</span>
                  <span className="font-mono text-[var(--text-primary)] font-bold">
                    {((cm.trueNegative / (cm.trueNegative + cm.falsePositive)) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>False Alarm Rate:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {((cm.falsePositive / (cm.trueNegative + cm.falsePositive)) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Training & Validation Loss Chart */}
        <div className="lg:col-span-7">
          <Card className="h-full border-[var(--border-color)]">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    Training & Validation Loss Convergence
                  </CardTitle>
                  <CardDescription>
                    Binary cross-entropy loss over 10 optimization epochs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2">
              <div className="h-64 w-full">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={DEMO_LOSS_CURVES} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                      <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 0.7]} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 shadow-xl text-xs space-y-1">
                                <div className="font-bold text-[var(--text-primary)]">Epoch {label}</div>
                                <div className="text-violet-400">
                                  Train Loss: {payload[0]?.value}
                                </div>
                                <div className="text-emerald-400">
                                  Val Loss: {payload[1]?.value}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Line
                        type="monotone"
                        dataKey="trainLoss"
                        name="Training Loss"
                        stroke="var(--primary-accent)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="valLoss"
                        name="Validation Loss"
                        stroke="#22C55E"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                    Loading convergence plot...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Model Comparison Table */}
      <Card className="border-[var(--border-color)]">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold">
            Architecture Comparison & Ablation Study
          </CardTitle>
          <CardDescription>
            Performance baseline models vs. proposed BERT + Attention + CNN/GRU hybrid
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]/60 text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Model Architecture</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Accuracy</th>
                  <th className="py-3 px-4 font-semibold">F1-Score</th>
                  <th className="py-3 px-4 font-semibold">Inference Latency</th>
                  <th className="py-3 px-4 font-semibold">Parameters</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {DEMO_MODEL_COMPARISON.map((m, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-[var(--bg-surface)]/40 transition-colors ${
                      m.status.includes("Champion") ? "bg-[var(--primary-accent)]/5" : ""
                    }`}
                  >
                    <td className="py-3.5 px-5 font-semibold text-[var(--text-primary)]">
                      {m.model}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)]">{m.type}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)]">
                      {m.accuracy}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-violet-300">
                      {m.f1Score}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">{m.latency}</td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">{m.parameters}</td>
                    <td className="py-3.5 px-4">
                      {m.status.includes("Champion") ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40">
                          {m.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {m.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dataset & Experiment Metadata Card */}
      <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]/60">
        <CardHeader className="p-5 pb-3 border-b border-[var(--border-color)]">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--primary-accent)]" />
            Dataset Split & Reproducibility Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Dataset Corpus</span>
              <span className="text-[var(--text-primary)] font-medium mt-0.5 block truncate" title={DEMO_RESEARCH_METRICS.dataset}>
                Kaggle + Enron
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Total Samples</span>
              <span className="text-[var(--text-primary)] font-mono font-medium mt-0.5 block">
                {DEMO_RESEARCH_METRICS.totalSamples.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Train / Val / Test</span>
              <span className="text-[var(--text-primary)] font-mono font-medium mt-0.5 block">
                70 / 15 / 15
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Random Seed</span>
              <span className="text-[var(--text-primary)] font-mono font-medium mt-0.5 block">
                {DEMO_RESEARCH_METRICS.randomSeed}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Base Transformer</span>
              <span className="text-[var(--text-primary)] font-mono font-medium mt-0.5 block">
                {DEMO_RESEARCH_METRICS.backbone}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Max Sequence</span>
              <span className="text-[var(--text-primary)] font-mono font-medium mt-0.5 block">
                {DEMO_RESEARCH_METRICS.sequenceLength} tokens
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
