"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Mail,
  User,
  Clock,
  Scan,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RubberSegment from "@/components/ui/RubberSegment";

export interface BodySegment {
  text: string;
  isHighlight?: boolean;
  highlightType?: "threat" | "safe";
  highlightLabel?: string;
}

export interface ShowcaseEvidence {
  title: string;
  detail: string;
  variant: "threat" | "safe";
}

export interface ShowcaseExample {
  id: string;
  category: "phishing" | "legitimate";
  displayLabel: string;
  scenarioTitle: string;
  senderName: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  dateLabel: string;
  bodyParts: BodySegment[];
  inertLink?: {
    label: string;
    value: string;
    isSuspicious: boolean;
  };
  evidencePoints: ShowcaseEvidence[];
  verdict: "phishing" | "legitimate";
  verdictLabel: string;
  explanation: string;
}

export const SHOWCASE_EXAMPLES: ShowcaseExample[] = [
  {
    id: "credential-harvesting",
    category: "phishing",
    displayLabel: "Credential phishing",
    scenarioTitle: "Urgent Account Suspension Notice",
    senderName: "Fictional ID Service",
    senderEmail: "security-alert@id-verify-auth.net",
    recipient: "alex.morgan@company.internal",
    subject: "Action Required: Verify Your Account",
    dateLabel: "Example message",
    bodyParts: [
      { text: "Your corporate account privileges " },
      {
        text: "will be suspended within 2 hours",
        isHighlight: true,
        highlightType: "threat",
        highlightLabel: "Severe urgency timeline",
      },
      { text: " due to unverified activity. Please " },
      {
        text: "verify your login credentials immediately",
        isHighlight: true,
        highlightType: "threat",
        highlightLabel: "Credential theft prompt",
      },
      { text: " to prevent unexpected interruption to your single sign-on access." },
    ],
    inertLink: {
      label: "Inert Link Target",
      value: "http://auth-verify-security-portal.tk/sso-login",
      isSuspicious: true,
    },
    evidencePoints: [
      {
        title: "Artificial Urgency Deadline",
        detail: "Timeline coercion (\"within 2 hours\") engineered to bypass rational verification.",
        variant: "threat",
      },
      {
        title: "Sender Domain Discrepancy",
        detail: "Origin @id-verify-auth.net fails standard corporate identity correlation.",
        variant: "threat",
      },
      {
        title: "Insecure Credential Target",
        detail: "Untrusted external top-level domain (.tk) soliciting single sign-on passwords.",
        variant: "threat",
      },
    ],
    verdict: "phishing",
    verdictLabel: "Phishing Detected",
    explanation:
      "The message uses urgency and an untrusted sender/link combination to pressure the recipient into revealing credentials.",
  },
  {
    id: "invoice-fraud",
    category: "phishing",
    displayLabel: "Invoice fraud",
    scenarioTitle: "Vendor Remittance Modification",
    senderName: "Apex Office Supplies Ltd",
    senderEmail: "billing-support@apex-supplies-direct.org",
    recipient: "accounts-payable@company.internal",
    subject: "Updated Invoice — Payment Required",
    dateLabel: "Example message",
    bodyParts: [
      { text: "Please find attached updated invoice #INV-8821 for recent supplies. Note that our " },
      {
        text: "remittance banking coordinates have changed effective immediately",
        isHighlight: true,
        highlightType: "threat",
        highlightLabel: "Unverified bank change",
      },
      { text: ". You must " },
      {
        text: "remit pending balance today",
        isHighlight: true,
        highlightType: "threat",
        highlightLabel: "Payment rush pressure",
      },
      { text: " to avoid automatic supplier hold on current orders." },
    ],
    inertLink: {
      label: "Beneficiary Coordinates",
      value: "IBAN: GB29-XCORP-8802-9912 (Unverified recipient)",
      isSuspicious: true,
    },
    evidencePoints: [
      {
        title: "Unprompted Account Redirection",
        detail: "Sudden change to payment beneficiary details without prior secondary confirmation.",
        variant: "threat",
      },
      {
        title: "Same-Day Wire Pressure",
        detail: "High urgency demanding instant settlement to avoid supplier review.",
        variant: "threat",
      },
      {
        title: "Unverified Billing Origin",
        detail: "Sender domain registered recently and detached from legitimate supplier records.",
        variant: "threat",
      },
    ],
    verdict: "phishing",
    verdictLabel: "Phishing Detected",
    explanation:
      "The unexpected payment change and urgency are strong warning signs that require independent verification.",
  },
  {
    id: "delivery-phishing",
    category: "phishing",
    displayLabel: "Delivery phishing",
    scenarioTitle: "Package Dispatch Interruption",
    senderName: "Global Parcel Express",
    senderEmail: "tracking-update@parcel-dispatch-center.xyz",
    recipient: "resident@phishguard-demo.local",
    subject: "Delivery Attempt Failed — Confirm Details",
    dateLabel: "Example message",
    bodyParts: [
      { text: "We could not deliver your parcel (#PX-49021) earlier today. " },
      {
        text: "A small redelivery fee of $1.85 is required",
        isHighlight: true,
        highlightType: "threat",
        highlightLabel: "Fee solicitation",
      },
      { text: " to reschedule your drop-off window. " },
      {
        text: "Confirm your card details within 24 hours",
        isHighlight: true,
        highlightType: "threat",
        highlightLabel: "Card prompt",
      },
      { text: " or package will be returned to origin." },
    ],
    inertLink: {
      label: "Tracking Portal",
      value: "http://parcel-dispatch-center.xyz/re-deliver?pkg=49021",
      isSuspicious: true,
    },
    evidencePoints: [
      {
        title: "Unsubstantiated Parcel Notice",
        detail: "Generic courier notice lacking authentic purchase tracking metadata.",
        variant: "threat",
      },
      {
        title: "Unexpected Redelivery Charge",
        detail: "Small fee prompt used as a lure to capture credit card and address information.",
        variant: "threat",
      },
      {
        title: "Untrusted Top-Level Domain",
        detail: "Unverified external domain (.xyz) typical of disposable phishing campaigns.",
        variant: "threat",
      },
    ],
    verdict: "phishing",
    verdictLabel: "Phishing Detected",
    explanation:
      "The message impersonates a delivery notification to collect sensitive information or payment details.",
  },
  {
    id: "legitimate-email",
    category: "legitimate",
    displayLabel: "Legitimate email",
    scenarioTitle: "Internal Team Collaboration",
    senderName: "Sarah Chen (Project Coordinator)",
    senderEmail: "sarah.chen@phishguard-internal.org",
    recipient: "research-team@phishguard-internal.org",
    subject: "Meeting Agenda for Thursday",
    dateLabel: "Example message",
    bodyParts: [
      { text: "Hi team, please find the discussion points for Thursday's architecture review in the project workspace. " },
      {
        text: "Let me know if you would like to add any items",
        isHighlight: true,
        highlightType: "safe",
        highlightLabel: "Routine collaboration",
      },
      { text: " before Wednesday afternoon so we can circulate the final version." },
    ],
    inertLink: {
      label: "Internal Workspace",
      value: "https://workspace.phishguard-internal.org/notes/arch-q4",
      isSuspicious: false,
    },
    evidencePoints: [
      {
        title: "Verified Internal Identity",
        detail: "Sender identity matches legitimate internal organization records.",
        variant: "safe",
      },
      {
        title: "Standard Business Context",
        detail: "Routine collaborative scheduling with zero coercive deadlines or threats.",
        variant: "safe",
      },
      {
        title: "Safe Internal Collaboration Link",
        detail: "Link strictly targets the company's authenticated internal documentation workspace.",
        variant: "safe",
      },
    ],
    verdict: "legitimate",
    verdictLabel: "Legitimate Email",
    explanation:
      "The message is consistent with its stated business purpose and does not show the suspicious signals demonstrated in the other examples.",
  },
];

type ShowcasePhase = "intro" | "inspecting" | "highlighting" | "evidence" | "verdict" | "hold";

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function AnimatedEmailShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<ShowcasePhase>("intro");
  const isPlaying = true;

  const isReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const effectivePhase: ShowcasePhase = isReducedMotion ? "hold" : phase;

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentExample = SHOWCASE_EXAMPLES[currentIndex];

  // Clear running timer
  const clearCurrentTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Sequence state machine:
  // intro (1.8s) -> inspecting (1.5s) -> highlighting (1.8s) -> evidence (1.5s) -> verdict (1.5s) -> hold (1.6s) -> next
  useEffect(() => {
    clearCurrentTimer();

    if (isReducedMotion || !isPlaying) return;

    let delayMs = 1800;
    let nextPhase: ShowcasePhase = "inspecting";

    if (phase === "intro") {
      delayMs = 1800;
      nextPhase = "inspecting";
    } else if (phase === "inspecting") {
      delayMs = 1500;
      nextPhase = "highlighting";
    } else if (phase === "highlighting") {
      delayMs = 1800;
      nextPhase = "evidence";
    } else if (phase === "evidence") {
      delayMs = 1500;
      nextPhase = "verdict";
    } else if (phase === "verdict") {
      delayMs = 1500;
      nextPhase = "hold";
    } else if (phase === "hold") {
      delayMs = 1800;
      // Advance to next example
      timerRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % SHOWCASE_EXAMPLES.length);
        setPhase("intro");
      }, delayMs);
      return;
    }

    timerRef.current = setTimeout(() => {
      setPhase(nextPhase);
    }, delayMs);

    return () => {
      clearCurrentTimer();
    };
  }, [phase, isPlaying, isReducedMotion, currentIndex, clearCurrentTimer]);

  const handleSelectExample = (index: number) => {
    clearCurrentTimer();
    setCurrentIndex(index);
    setPhase("intro");
  };

  // State checks for showing elements
  const showScanBeam = effectivePhase === "inspecting" && !isReducedMotion;
  const showHighlights =
    effectivePhase === "highlighting" ||
    effectivePhase === "evidence" ||
    effectivePhase === "verdict" ||
    effectivePhase === "hold";
  const showEvidence =
    effectivePhase === "evidence" ||
    effectivePhase === "verdict" ||
    effectivePhase === "hold";
  const showVerdict = effectivePhase === "verdict" || effectivePhase === "hold";

  // Stage description badge
  const getStageInfo = () => {
    if (isReducedMotion) {
      return { step: "Curated Showcase", label: "Interactive Inspection Complete" };
    }
    switch (effectivePhase) {
      case "intro":
        return { step: "Stage 1 of 4", label: "Example email loaded" };
      case "inspecting":
        return { step: "Stage 2 of 4", label: "Scanning linguistic structure & tokens" };
      case "highlighting":
        return { step: "Stage 3 of 4", label: "Correlating flagged phrases & signals" };
      case "evidence":
        return { step: "Stage 4 of 4", label: "Synthesizing evidence rationales" };
      case "verdict":
      case "hold":
        return { step: "Completed", label: "Classification verdict confirmed" };
      default:
        return { step: "Demo", label: "Analyzing message" };
    }
  };

  const stage = getStageInfo();

  return (
    <div className="w-full text-left space-y-4">
      {/* Honest Contextual Header (§9) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-[var(--primary-accent)] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            <span>Interactive detection demo</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
            See How PhishGuard AI Detects Threats
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Explore curated sample emails and observe how suspicious signals are identified in sequence.
          </p>
        </div>
      </div>

      {/* Main Interactive Showcase Window */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]/95 shadow-2xl dark:shadow-black/80 overflow-hidden backdrop-blur-sm">
        {/* Window Chrome Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)]/70 bg-[var(--bg-elevated)]/40">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
              phishguard-ai.internal / showcase
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              Example preview — not a live model result
            </span>
          </div>
        </div>

        {/* Curated Scenario Selector via RubberSegment */}
        <div className="px-4 py-2.5 border-b border-[var(--border-color)]/60 bg-[var(--bg-elevated)]/20 overflow-x-auto">
          <RubberSegment
            items={SHOWCASE_EXAMPLES.map((ex, index) => ({
              value: String(index),
              label: `${index + 1}. ${ex.displayLabel}`,
              icon: (
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    ex.category === "phishing" ? "bg-red-400" : "bg-emerald-400"
                  )}
                />
              ),
            }))}
            value={String(currentIndex)}
            onChange={(val) => handleSelectExample(Number(val))}
            size="sm"
            radius={10}
            ariaLabel="Demonstration email examples"
          />
        </div>

        {/* Two-Column Demonstration Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6">
          {/* LEFT: Email Preview Window (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                Example Message #{currentIndex + 1}
              </span>
              <span className="font-mono text-[11px] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                {currentExample.scenarioTitle}
              </span>
            </div>

            {/* Email Container with scanning beam */}
            <div className="relative rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] overflow-hidden p-4 flex-1 flex flex-col justify-between">
              {/* Scan Beam Indicator */}
              {showScanBeam && (
                <div
                  className="pg-scan-beam absolute inset-x-0 h-16 pointer-events-none z-10 bg-gradient-to-b from-transparent via-blue-500/20 to-blue-500/35 border-b border-blue-400 shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
                  aria-hidden="true"
                />
              )}

              {/* Email Headers */}
              <div className="space-y-2 pb-3 border-b border-[var(--border-color)]/70 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)] truncate">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {currentExample.senderName}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)] truncate hidden sm:inline">
                      &lt;{currentExample.senderEmail}&gt;
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] shrink-0 border border-[var(--border-color)]/50">
                    {currentExample.dateLabel}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-[var(--text-muted)] truncate sm:hidden">
                  From: {currentExample.senderEmail}
                </div>

                <div className="font-semibold text-sm text-[var(--text-primary)] tracking-tight">
                  {currentExample.subject}
                </div>
              </div>

              {/* Email Body with contextual animated highlights */}
              <div className="py-4 text-xs sm:text-sm text-[var(--text-primary)]/90 leading-relaxed font-sans min-h-[90px]">
                {currentExample.bodyParts.map((part, pIdx) => {
                  if (part.isHighlight && showHighlights) {
                    const isThreat = part.highlightType === "threat";
                    return (
                      <span
                        key={pIdx}
                        className={cn(
                          "relative inline-block px-1 py-0.5 rounded font-medium transition-all duration-300",
                          isThreat
                            ? "bg-red-500/20 text-red-900 dark:text-red-200 border-b-2 border-red-500 shadow-[0_1px_6px_rgba(239,68,68,0.15)]"
                            : "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-b-2 border-emerald-500 shadow-[0_1px_6px_rgba(34,197,94,0.15)]"
                        )}
                        title={part.highlightLabel}
                      >
                        {part.text}
                      </span>
                    );
                  }
                  return <span key={pIdx}>{part.text}</span>;
                })}
              </div>

              {/* Inert Link / Action Item */}
              {currentExample.inertLink && (
                <div className="mt-2 p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span className="text-[var(--text-muted)] shrink-0 hidden sm:inline">
                      {currentExample.inertLink.label}:
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-primary)] truncate">
                      {currentExample.inertLink.value}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0",
                      currentExample.inertLink.isSuspicious
                        ? "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                    )}
                  >
                    {currentExample.inertLink.isSuspicious ? "Flagged Link" : "Verified Link"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Inspection & Verdict Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            {/* Stage Progress Banner */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                Analysis Pipeline
              </span>
              <span className="font-mono text-[11px] text-[var(--primary-accent)] font-bold">
                {stage.step}
              </span>
            </div>

            {/* Evidence & Signals Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                  <span>Detected Signals</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {showEvidence ? "3/3 signals analyzed" : "Extracting features..."}
                  </span>
                </div>

                <div className="space-y-2">
                  {currentExample.evidencePoints.map((ev, evIdx) => {
                    const isVisible = showEvidence;
                    const isThreat = ev.variant === "threat";
                    return (
                      <div
                        key={evIdx}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs transition-all duration-300",
                          isVisible ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1",
                          isThreat
                            ? "bg-red-500/5 border-red-500/20 text-[var(--text-primary)]"
                            : "bg-emerald-500/5 border-emerald-500/20 text-[var(--text-primary)]"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold mb-0.5">
                          {isThreat ? (
                            <AlertTriangle className="w-3 h-3 text-red-500 dark:text-red-400 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          )}
                          <span
                            className={isThreat ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}
                          >
                            {ev.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed pl-4.5">
                          {ev.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Classification Verdict Area */}
              <div className="pt-3 border-t border-[var(--border-color)]/70">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center justify-between">
                  <span>Final Verdict</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {showVerdict ? "Verdict confirmed" : "Synthesizing..."}
                  </span>
                </div>

                {showVerdict ? (
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all duration-300 animate-in fade-in zoom-in-95",
                      currentExample.verdict === "phishing"
                        ? "bg-red-500/10 border-red-500/35 text-red-800 dark:text-red-200"
                        : "bg-emerald-500/10 border-emerald-500/35 text-emerald-800 dark:text-emerald-200"
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-black tracking-wide mb-1.5">
                      {currentExample.verdict === "phishing" ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                          <span>PHISHING DETECTED</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          <span>LEGITIMATE EMAIL</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-primary)]/90 leading-relaxed font-sans">
                      {currentExample.explanation}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] text-xs text-[var(--text-muted)] flex items-center justify-center gap-2 py-4">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating linguistic context & signals…</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Timeline Indicator Bar */}
        <div className="px-4 py-2 border-t border-[var(--border-color)]/60 bg-[var(--bg-elevated)]/30 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]">
              {stage.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {SHOWCASE_EXAMPLES.map((_, dotIdx) => (
              <span
                key={dotIdx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  dotIdx === currentIndex
                    ? "w-4 bg-[var(--primary-accent)]"
                    : "bg-[var(--border-color)]"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
