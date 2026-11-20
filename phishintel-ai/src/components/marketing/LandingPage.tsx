"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ArrowRight,
  BrainCircuit,
  Eye,
  Layers,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { GithubIcon } from "@/components/ui/BrandIcons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { PUBLIC_NAV_ITEMS } from "@/config/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import DotField from "@/components/ui/DotField";
import FoldText from "@/components/ui/FoldText";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { isAllowedInternalRoute } from "@/lib/authGate";
import { markFromLanding, recordPathTransition } from "@/lib/navTracker";
import { AnimatedEmailShowcase } from "@/components/marketing/AnimatedEmailShowcase";

export interface LandingPageProps {
  className?: string;
}

export function LandingPage({ className = "" }: LandingPageProps) {
  const router = useRouter();
  const { status, user } = useAuth();
  const { requireAuth, openAuthDialog } = useAuthGate();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    recordPathTransition("/");
    markFromLanding();
  }, []);

  const handleProtectedNav = (
    e: React.MouseEvent<HTMLElement>,
    destination: string,
    mode: "signIn" | "register" = "signIn"
  ) => {
    // Mark navigation from landing page to dashboard for count-up animation
    if (destination === "/dashboard") {
      markFromLanding();
    }
    if (status === "authenticated") return;
    e.preventDefault();
    router.push(`/sign-in?next=${encodeURIComponent(destination)}`);
  };

  const handleHeaderAuthClick = (
    e: React.MouseEvent<HTMLElement>,
    mode: "signIn" | "register"
  ) => {
    markFromLanding();
    if (status === "authenticated") {
      router.push("/dashboard");
      return;
    }
    router.push(mode === "signIn" ? "/sign-in" : "/sign-up");
  };

  return (
    <div
      className={`relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-[var(--primary-accent)]/30 selection:text-[var(--text-primary)] ${className}`.trim()}
    >
      {/* Interactive DotField Background (Landing Page Only) */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <DotField
          gradientFrom={isLight ? "#2563eb" : "#3b82f6"}
          gradientTo={isLight ? "#4f46e5" : "#38bdf8"}
          dotRadius={1.5}
          dotSpacing={16}
          cursorRadius={240}
          bulgeStrength={0.6}
          glowRadius={160}
          glowColor={isLight ? "#2563eb" : "#ffffff"}
          baseOpacity={isLight ? 0.28 : 0.42}
          waveAmplitude={2.5}
          speed={0.8}
          lightMode={isLight}
          interactive={true}
        />
      </div>

      {/* Top Public Navigation Bar */}
      <nav className="relative z-40 border-b border-[var(--border-color)]/80 bg-[var(--bg-primary)]/85 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-accent)] to-[var(--secondary-accent)] flex items-center justify-center shadow-md shadow-blue-900/25 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
                PhishIntel
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded-full bg-blue-500/10 text-[var(--primary-accent)] border border-blue-500/20">
                Research Prototype
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-muted)]">
            {PUBLIC_NAV_ITEMS.map((item) => {
              if (item.href === "#contact") {
                return (
                  <button
                    key={item.title}
                    onClick={() => setContactOpen(true)}
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    {item.title}
                  </button>
                );
              }
              const requiresAuth = isAllowedInternalRoute(item.href);
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={requiresAuth ? (e) => handleProtectedNav(e, item.href) : undefined}
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  {item.title}
                </Link>
              );
            })}
          </div>

          {/* Sign In / Dashboard CTA */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={(e) => handleHeaderAuthClick(e, "signIn")}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] px-3.5 py-1.5 rounded-full hover:bg-[var(--bg-elevated)] transition-colors hidden sm:block"
            >
              {user ? "Account" : "Login"}
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => handleHeaderAuthClick(e, "register")}
              disabled={status === "loading"}
            >
              {user ? "Dashboard" : "Sign up"}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[var(--primary-accent)]/15 via-[var(--secondary-accent)]/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm font-medium text-[var(--primary-accent)] mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            <span>Explainable AI-Based Phishing Email Detection</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--text-primary)] tracking-tight max-w-4xl mx-auto leading-[1.15]">
            <span className="block">
              <FoldText
                text="Detect Phishing."
                foldStyle="paper"
                splitBy="char"
                hinge="top"
                trigger="mount"
                foldAngle={92}
                duration={0.65}
                stagger={0.035}
                staggerFrom="start"
                ease="power3.out"
                hoverRefold={true}
                refoldRadius={140}
                refoldAngle={45}
                perspective={700}
                creaseShading={0.55}
                fontSize="inherit"
                fontWeight="inherit"
                color="var(--text-primary)"
              />
            </span>
            <span className="block mt-1 sm:mt-2">
              <FoldText
                text="Understand the Threat."
                foldStyle="paper"
                splitBy="char"
                hinge="top"
                trigger="mount"
                foldAngle={92}
                duration={0.65}
                stagger={0.035}
                staggerFrom="start"
                ease="power3.out"
                hoverRefold={true}
                refoldRadius={140}
                refoldAngle={45}
                perspective={700}
                creaseShading={0.55}
                fontSize="inherit"
                fontWeight="inherit"
                className="fold-text-gradient"
              />
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            An explainable AI email security platform powered by PAHF-Net: availability-gated hierarchical fusion (DeBERTa-v3 256d + 3×32d encoders) with class-conditional domain adversarial training (DANN) and validation-calibrated decision thresholding.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {status === "authenticated" ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                >
                  <Button variant="primary" size="lg" className="shadow-md shadow-blue-900/20" tabIndex={-1}>
                    <BrainCircuit className="w-5 h-5 mr-2" />
                    Open Dashboard
                  </Button>
                </Link>
                <Link
                  href="/analyzer"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                >
                  <Button variant="outline" size="lg" tabIndex={-1}>
                    <ArrowRight className="w-5 h-5 mr-2 text-[var(--primary-accent)]" />
                    Analyze an Email
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                >
                  <Button variant="primary" size="lg" className="shadow-md shadow-blue-900/20" tabIndex={-1}>
                    <Shield className="w-5 h-5 mr-2" />
                    Create Secure Workspace
                  </Button>
                </Link>
                <Link
                  href="/sign-in"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                >
                  <Button variant="outline" size="lg" tabIndex={-1}>
                    <ArrowRight className="w-5 h-5 mr-2 text-[var(--primary-accent)]" />
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Animated Email Detection Showcase */}
          <div className="mt-14 max-w-5xl mx-auto relative group">
            <AnimatedEmailShowcase />
          </div>
        </div>
      </section>

      {/* Feature Overview Section */}
      <section className="relative z-10 py-16 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/75 backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              Engineered for Transparent Threat Intelligence
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Moving beyond opaque black-box classifiers to explainable, multi-scale language understanding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-[var(--bg-surface)]/80 hover:border-slate-500 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[var(--primary-accent)] mb-4">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                Multi-Branch Modality Encoding
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Encodes 4 specialized modalities: Text representations via DeBERTa-v3 (256-d), URL signals (32-d), Structural layout &amp; header indicators (32-d), and Linguistic urgency cues (32-d).
              </p>
            </Card>

            <Card className="p-6 bg-[var(--bg-surface)]/80 hover:border-slate-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[var(--secondary-accent)] mb-4">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                Availability-Gated Hierarchical Fusion &amp; DANN
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Dynamically weights available modalities through learned gates (g_t, g_u, g_s, g_l) with modality dropout (p=0.2) and class-conditional domain adversarial training across source and target email distributions.
              </p>
            </Card>

            <Card className="p-6 bg-[var(--bg-surface)]/80 hover:border-slate-500 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                Calibrated Decision &amp; Explainability
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Delivers high-precision verdicts using a validation-tuned threshold rule (P_phish &ge; T) coupled with transparent explainability: modality gate contributions, DeBERTa-v3 semantic signals, and human-readable reasoning.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works (3-step) */}
      <section className="relative z-10 py-16 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]/35 backdrop-blur-[2px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              How PhishIntel Works
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Three straightforward steps from raw email text to actionable security verdict.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] relative">
              <div className="w-8 h-8 rounded-full bg-[var(--primary-accent)] text-white flex items-center justify-center font-bold text-xs mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                Submit Email Text
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Paste suspicious email subject and body, or upload `.txt` or `.eml` files into the two-panel analysis workspace.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] relative">
              <div className="w-8 h-8 rounded-full bg-[var(--primary-accent)] text-white flex items-center justify-center font-bold text-xs mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                Analyze Linguistic Patterns
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                The neural pipeline processes semantic relationships, detects urgency deadlines, and surfaces credential harvesting indicators.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] relative">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                Review Verdict & Explanation
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Inspect confidence levels, flagged phrases, attention heatmaps, and save findings directly to scan history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Research Architecture Preview */}
      <section className="relative z-10 py-16 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/75 backdrop-blur-[2px]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="accent" size="sm" className="mb-4">
            Research Architecture
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
            PAHF-Net Architecture Pipeline
          </h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xl mx-auto mb-10">
            Availability-Gated Hierarchical Fusion with Class-Conditional Domain Adversarial Training (DANN) and validation-calibrated decision thresholding.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--primary-accent)] block mb-1">Step 1</span>
              <div className="font-bold text-sm text-[var(--text-primary)]">Multi-Branch Encoding</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">DeBERTa-v3 (256d) + 3×32d</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--secondary-accent)] block mb-1">Step 2</span>
              <div className="font-bold text-sm text-[var(--text-primary)]">Availability Gating</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Gates (g_t, g_u, g_s, g_l) · Mask (m_i)</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">Step 3</span>
              <div className="font-bold text-sm text-[var(--text-primary)]">Class-Conditional DANN</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">GRL + Dual Source Discriminators</div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1">Step 4</span>
              <div className="font-bold text-sm text-[var(--text-primary)]">Decision Head</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">Calibrated Probability (P &ge; T)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-[2px] py-12 text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-accent)] to-[var(--secondary-accent)] flex items-center justify-center text-white font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-[var(--text-primary)]">PhishIntel</span>
              <p className="text-[11px] text-[var(--text-muted)]">
                Explainable AI-Based Phishing Email Detection Prototype
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/analytics"
              onClick={(e) => handleProtectedNav(e, "/analytics")}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Research Analytics
            </Link>
            <Link
              href="/explainability"
              onClick={(e) => handleProtectedNav(e, "/explainability")}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Explainability
            </Link>
            <button
              onClick={() => setContactOpen(true)}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Contact Us
            </button>
            <Link
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
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
            PhishIntel is an academic and industry research initiative exploring transparent phishing email detection.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
            <span className="font-bold text-[var(--text-primary)] block">Project Inquiries:</span>
            <p className="text-[var(--text-muted)]">research@phishintel.internal</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
            <span className="font-bold text-[var(--text-primary)] block">Lab Location:</span>
            <p className="text-[var(--text-muted)]">Advanced Cybersecurity & Deep Learning Research Group</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="primary" size="sm" onClick={() => setContactOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default LandingPage;
