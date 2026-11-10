"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  BrainCircuit,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Lock,
  ChevronRight,
  FileText,
  Mail,
  ExternalLink,
  Cpu,
  BarChart3,
  Search,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/BrandIcons";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { PUBLIC_NAV_ITEMS } from "@/config/navigation";

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#090D18] text-[#F3F4F6] selection:bg-[#8B5CF6]/30 selection:text-white">
      {/* Top Public Navigation Bar */}
      <nav className="border-b border-[#273449]/80 bg-[#090D18]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-violet-900/30 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[#F3F4F6]">
                PhishGuard <span className="text-[#8B5CF6]">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Research Prototype
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#9CA3AF]">
            {PUBLIC_NAV_ITEMS.map((item) => {
              if (item.href === "#contact") {
                return (
                  <button
                    key={item.title}
                    onClick={() => setContactOpen(true)}
                    className="hover:text-[#F3F4F6] transition-colors"
                  >
                    {item.title}
                  </button>
                );
              }
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="hover:text-[#F3F4F6] transition-colors"
                >
                  {item.title}
                </Link>
              );
            })}
          </div>

          {/* Sign In / Dashboard CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSignInOpen(true)}
              className="text-xs font-semibold text-[#9CA3AF] hover:text-[#F3F4F6] px-3 py-1.5 transition-colors hidden sm:block"
            >
              Sign In
            </button>
            <Link href="/dashboard">
              <Button variant="primary" size="sm">
                Open Dashboard
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#8B5CF6]/15 via-[#3B82F6]/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#151E31] border border-[#273449] text-xs text-violet-300 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Explainable AI-Based Phishing Email Detection</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#F3F4F6] tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Detect Phishing. <br />
            <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#3B82F6] bg-clip-text text-transparent">
              Understand the Threat.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
            An explainable AI-based email analysis experience powered by hybrid BERT contextual representations, Multi-Head Attention mapping, and 1D-CNN/Bi-GRU sequence models.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/analyzer">
              <Button variant="primary" size="lg" className="shadow-xl shadow-violet-900/30">
                <BrainCircuit className="w-5 h-5 mr-2" />
                Analyze an Email
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" size="lg">
                <BarChart3 className="w-5 h-5 mr-2 text-[#3B82F6]" />
                Explore the Research
              </Button>
            </Link>
          </div>

          {/* Prototype Preview / UI Mockup */}
          <div className="mt-14 max-w-5xl mx-auto relative group">
            <div className="rounded-2xl border border-[#273449] bg-[#101729]/90 shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-sm p-4 sm:p-6 text-left">
              {/* Window chrome */}
              <div className="flex items-center justify-between pb-4 border-b border-[#273449]/70">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono text-[#9CA3AF]">
                    phishguard-ai.internal / analyzer
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Example preview — not a live model result
                </span>
              </div>

              {/* Composed mini-preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Left Mini Panel */}
                <div className="p-4 rounded-xl bg-[#151E31] border border-[#273449] space-y-3">
                  <div className="text-xs font-bold text-[#F3F4F6] flex items-center justify-between">
                    <span>Input: Suspicious Security Alert</span>
                    <Badge variant="threat" size="sm">Urgent Clue</Badge>
                  </div>
                  <div className="p-3 bg-[#090D18] rounded-lg font-mono text-[11px] text-[#9CA3AF] leading-relaxed">
                    "Your corporate account privileges will be suspended within 2 hours. Verify your login credentials at http://auth-verify-security-portal.tk..."
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-[#9CA3AF]">
                    <span>Length: 148 chars</span>
                    <span className="text-emerald-400 font-semibold">Ready for inference</span>
                  </div>
                </div>

                {/* Right Mini Panel */}
                <div className="p-4 rounded-xl bg-[#151E31] border border-[#273449] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F3F4F6]">Neural Verdict</span>
                    <span className="text-xs font-bold text-red-400 font-mono">96.4% Threat Prob</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    PHISHING DETECTED
                  </div>
                  <div className="space-y-1.5 text-[11px] text-[#9CA3AF]">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-red-400" />
                      <span>Severe urgency timeline detected ("within 2 hours")</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-red-400" />
                      <span>Credential theft prompt & suspicious domain structure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Overview Section */}
      <section className="py-16 border-t border-[#273449] bg-[#090D18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F4F6]">
              Engineered for Transparent Threat Intelligence
            </h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              Moving beyond opaque black-box classifiers to explainable, multi-scale language understanding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-[#151E31]/80 hover:border-slate-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[#8B5CF6] mb-4">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F3F4F6] mb-2">
                Contextual Text Representation
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Utilizes BERT's deep contextual token embeddings combined with 1D-CNN local n-gram filters and Bi-GRU sequential modeling to detect evolving social engineering tactics.
              </p>
            </Card>

            <Card className="p-6 bg-[#151E31]/80 hover:border-slate-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#3B82F6] mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F3F4F6] mb-2">
                Explainable Detection Insights
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Provides Multi-Head Attention mapping and token importance scoring to reveal exactly which phrases, urgency cues, or credential requests triggered the security verdict.
              </p>
            </Card>

            <Card className="p-6 bg-[#151E31]/80 hover:border-slate-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#F3F4F6] mb-2">
                Evaluation & Research Transparency
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Benchmark tracking across multiple datasets (Kaggle Phishing, Enron, Nazario) with rigorous validation splits and hyperparameter tuning via Mountain Gazelle Optimization.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works (3-step) */}
      <section className="py-16 border-t border-[#273449] bg-[#101729]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F4F6]">
              How PhishGuard AI Works
            </h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              Three straightforward steps from raw email text to actionable security verdict.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="p-6 rounded-2xl bg-[#151E31] border border-[#273449] relative">
              <div className="w-8 h-8 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-[#F3F4F6] mb-2">
                Submit Email Text
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Paste suspicious email subject and body, or upload `.txt` or `.eml` files into the two-panel analysis workspace.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#151E31] border border-[#273449] relative">
              <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-xs mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-[#F3F4F6] mb-2">
                Analyze Linguistic Patterns
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                The neural pipeline processes semantic relationships, detects urgency deadlines, and surfaces credential harvesting indicators.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#151E31] border border-[#273449] relative">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-[#F3F4F6] mb-2">
                Review Verdict & Explanation
              </h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Inspect confidence levels, flagged phrases, attention heatmaps, and save findings directly to scan history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Research Architecture Preview */}
      <section className="py-16 border-t border-[#273449] bg-[#090D18]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="accent" size="sm" className="mb-4">
            Research Architecture
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F4F6] mb-4">
            Multi-Scale Neural Architecture Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-[#9CA3AF] max-w-xl mx-auto mb-10">
            A cohesive hybrid pipeline designed to combine transformer contextual semantics with convolution n-grams and recurrent sequence memory.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#151E31] border border-[#273449] text-center">
              <span className="text-[10px] uppercase font-bold text-[#8B5CF6] block mb-1">Step 1</span>
              <div className="font-bold text-sm text-[#F3F4F6]">BERT Backbone</div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">Contextual Token Embeddings</div>
            </div>

            <div className="p-4 rounded-xl bg-[#151E31] border border-[#273449] text-center">
              <span className="text-[10px] uppercase font-bold text-[#3B82F6] block mb-1">Step 2</span>
              <div className="font-bold text-sm text-[#F3F4F6]">Multi-Head Attention</div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">Feature Relationships</div>
            </div>

            <div className="p-4 rounded-xl bg-[#151E31] border border-[#273449] text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Step 3</span>
              <div className="font-bold text-sm text-[#F3F4F6]">1D-CNN + Bi-GRU</div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">N-Gram & Sequence Modeling</div>
            </div>

            <div className="p-4 rounded-xl bg-[#151E31] border border-[#273449] text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Step 4</span>
              <div className="font-bold text-sm text-[#F3F4F6]">Classifier Output</div>
              <div className="text-[11px] text-[#9CA3AF] mt-1">Tuned via MGO Optimizer</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#273449] bg-[#090D18] py-12 text-xs text-[#9CA3AF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] flex items-center justify-center text-white font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-[#F3F4F6]">PhishGuard AI</span>
              <p className="text-[11px] text-[#9CA3AF]">
                Explainable AI-Based Phishing Email Detection Prototype
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/analytics" className="hover:text-white transition-colors">
              Research Analytics
            </Link>
            <Link href="/explainability" className="hover:text-white transition-colors">
              Explainability
            </Link>
            <button
              onClick={() => setContactOpen(true)}
              className="hover:text-white transition-colors"
            >
              Contact Us
            </button>
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              GitHub
            </Link>
          </div>
        </div>
      </footer>

      {/* Contact Us Modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogHeader>
          <DialogTitle>Contact the Research Team</DialogTitle>
          <DialogDescription>
            PhishGuard AI is an academic and industry research initiative exploring transparent phishing email detection.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-[#101729] border border-[#273449] space-y-1">
            <span className="font-bold text-[#F3F4F6] block">Project Inquiries:</span>
            <p className="text-[#9CA3AF]">research@phishguard-ai.internal</p>
          </div>
          <div className="p-3 rounded-xl bg-[#101729] border border-[#273449] space-y-1">
            <span className="font-bold text-[#F3F4F6] block">Lab Location:</span>
            <p className="text-[#9CA3AF]">Advanced Cybersecurity & Deep Learning Research Group</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="primary" size="sm" onClick={() => setContactOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Sign In Prototype Modal */}
      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogHeader>
          <DialogTitle>Sign In (Prototype Mode)</DialogTitle>
          <DialogDescription>
            Authentication is not enabled in this frontend demo milestone. You can access the entire application workspace directly.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-xs text-[#9CA3AF] bg-[#101729] p-3 rounded-xl border border-[#273449]">
          Click "Enter Dashboard" to explore the application as a pre-authenticated Security Researcher.
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSignInOpen(false)}>
            Cancel
          </Button>
          <Link href="/dashboard">
            <Button variant="primary" size="sm" onClick={() => setSignInOpen(false)}>
              Enter Dashboard
            </Button>
          </Link>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

