"use client";

import React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { ArrowDown, Cpu, Layers, GitMerge, Zap, ShieldCheck } from "lucide-react";

export default function ArchitecturePage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <DemoDataNotice
        message="Model Pipeline Blueprint — Visual specification for the hybrid neural architecture proposed in the research plan."
        variant="banner"
      />

      <PageHeader
        title="Model Architecture"
        description="Detailed multi-layer neural network diagram: BERT representation, Multi-Head Attention, CNN-1D, and Bi-GRU sequence modeling."
      />

      <div className="space-y-4">
        {/* Step 1: Input & Tokenizer */}
        <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-[var(--primary-accent)] shrink-0 font-bold">
              1
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Input Preprocessing & Tokenization</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Raw email text is cleaned, normalized, and converted into subword tokens via `bert-base-uncased` WordPiece tokenizer (max sequence length = 256).
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center text-slate-600">
          <ArrowDown className="w-5 h-5 text-violet-400" />
        </div>

        {/* Step 2: BERT Transformer Backbone */}
        <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-[var(--primary-accent)] shrink-0 font-bold">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">BERT Contextual Language Representation</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                12 transformer encoder layers generate deep 768-dimensional contextual embeddings that capture linguistic subtleties, social engineering triggers, and contextual semantics.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center text-slate-600">
          <ArrowDown className="w-5 h-5 text-blue-400" />
        </div>

        {/* Step 3: Multi-Head Attention */}
        <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
              3
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Multi-Head Attention Layer</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Explicit self-attention heads compute cross-token relevance matrices to focus specifically on correlated threat cues (e.g. associating urgency adverbs with credential prompts).
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center text-slate-600">
          <ArrowDown className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Step 4: Hybrid CNN-1D & Bi-GRU */}
        <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              4
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">1D-CNN + Bidirectional GRU Hybrid Block</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                1D Convolutional filters capture local n-gram patterns, while bidirectional GRU units maintain recurrent sequence memory across both forward and backward textual context.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center text-slate-600">
          <ArrowDown className="w-5 h-5 text-amber-400" />
        </div>

        {/* Step 5: Optimization & Classification */}
        <Card className="border-[var(--border-color)] bg-[var(--bg-surface)]">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 font-bold">
              5
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Classification Head & MGO Tuning</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Fully connected dense layers with sigmoid output produce final phishing probability scores. Hyperparameters (learning rates, dropout, filter sizes) are tuned via the Mountain Gazelle Optimizer (MGO).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

