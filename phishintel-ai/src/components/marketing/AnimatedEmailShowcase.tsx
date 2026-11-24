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
    recipient: "resident@phishintel-demo.local",
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
    senderEmail: "sarah.chen@phishintel-internal.org",
    recipient: "research-team@phishintel-internal.org",
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
      value: "https://workspace.phishintel-internal.org/notes/arch-q4",
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

  // Dynamic pane height measurement and progressive reveal tracking (§4)
  const paneRef = useRef<HTMLDivElement>(null);
  const highlightRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const [revealedHighlights, setRevealedHighlights] = useState<Set<number>>(new Set());
  const [isLinkBadgeRevealed, setIsLinkBadgeRevealed] = useState(false);
  const [revealedSignalsCount, setRevealedSignalsCount] = useState<number>(0);

  const scanTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const signalTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear running step timer
  const clearCurrentTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Clear all progressive reveal timeouts (§4.6)
  const clearAllSubTimers = useCallback(() => {
    scanTimeoutsRef.current.forEach(clearTimeout);
    scanTimeoutsRef.current = [];
    signalTimeoutsRef.current.forEach(clearTimeout);
    signalTimeoutsRef.current = [];
  }, []);

  // Dynamically measure pane height and assign --pane-h CSS variable (§4.2)
  useEffect(() => {
    const updatePaneHeight = () => {
      if (paneRef.current) {
        const h = paneRef.current.offsetHeight || paneRef.current.clientHeight || 420;
        paneRef.current.style.setProperty("--pane-h", `${h}px`);
      }
    };

    updatePaneHeight();
    const observer = new ResizeObserver(updatePaneHeight);
    if (paneRef.current) {
      observer.observe(paneRef.current);
    }
    return () => observer.disconnect();
  }, [currentIndex]);

  // Sequence state machine (§4.5):
  // intro (1.8s) -> inspecting (1.8s) -> highlighting (1.8s) -> evidence (1.5s) -> verdict (1.5s) -> hold (1.8s) -> next
  useEffect(() => {
    clearCurrentTimer();

    if (isReducedMotion || !isPlaying) return;

    let delayMs = 1800;
    let nextPhase: ShowcasePhase = "inspecting";

    if (phase === "intro") {
      delayMs = 1800;
      nextPhase = "inspecting";
    } else if (phase === "inspecting") {
      delayMs = 1800;
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

  // Progressive highlight reveal synchronized with scan sweep (§4.3 & §4.4)
  useEffect(() => {
    scanTimeoutsRef.current.forEach(clearTimeout);
    scanTimeoutsRef.current = [];

    if (isReducedMotion) {
      setRevealedHighlights(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      setIsLinkBadgeRevealed(true);
      return;
    }

    if (effectivePhase === "inspecting") {
      const pane = paneRef.current;
      const paneH = pane?.offsetHeight || 420;

      // Stagger highlight reveals as scan line passes each phrase
      highlightRefs.current.forEach((el, pIdx) => {
        if (el) {
          const elTop = el.offsetTop;
          // Sweep duration is 1800ms. Calculate reveal intercept:
          const ratio = Math.max(0.12, Math.min(0.85, (elTop + 16) / Math.max(1, paneH)));
          const delay = Math.round(ratio * 1800);
          const t = setTimeout(() => {
            setRevealedHighlights((prev) => new Set(prev).add(pIdx));
          }, delay);
          scanTimeoutsRef.current.push(t);
        }
      });

      // Link badge animates in when the scan line reaches the bottom (~1600ms)
      const linkT = setTimeout(() => {
        setIsLinkBadgeRevealed(true);
      }, 1600);
      scanTimeoutsRef.current.push(linkT);
    } else if (effectivePhase === "intro") {
      setRevealedHighlights(new Set());
      setIsLinkBadgeRevealed(false);
    } else {
      // In highlighting, evidence, verdict, hold: all highlights & link badge are revealed
      setRevealedHighlights(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      setIsLinkBadgeRevealed(true);
    }

    return () => {
      scanTimeoutsRef.current.forEach(clearTimeout);
      scanTimeoutsRef.current = [];
    };
  }, [effectivePhase, isReducedMotion, currentIndex]);

  // Progressive signal cards reveal during Stage 3: "highlighting" (§4.5)
  useEffect(() => {
    signalTimeoutsRef.current.forEach(clearTimeout);
    signalTimeoutsRef.current = [];

    if (isReducedMotion) {
      setRevealedSignalsCount(3);
      return;
    }

    if (effectivePhase === "highlighting") {
      // Stage 3 reveals signal cards one at a time, 250ms apart
      setRevealedSignalsCount(1);
      const t1 = setTimeout(() => setRevealedSignalsCount(2), 250);
      const t2 = setTimeout(() => setRevealedSignalsCount(3), 500);
      signalTimeoutsRef.current = [t1, t2];
    } else if (
      effectivePhase === "evidence" ||
      effectivePhase === "verdict" ||
      effectivePhase === "hold"
    ) {
      setRevealedSignalsCount(3);
    } else {
      setRevealedSignalsCount(0);
    }

    return () => {
      signalTimeoutsRef.current.forEach(clearTimeout);
      signalTimeoutsRef.current = [];
    };
  }, [effectivePhase, isReducedMotion]);

  // Clean tab change handler (§4.6)
  const handleSelectExample = (index: number) => {
    clearCurrentTimer();
    clearAllSubTimers();
    setRevealedHighlights(new Set());
    setIsLinkBadgeRevealed(false);
    setRevealedSignalsCount(0);
    setCurrentIndex(index);
    setPhase("intro");
  };

  // State checks for showing elements
  const showScanBeam = effectivePhase === "inspecting" && !isReducedMotion;
  const showVerdict = effectivePhase === "verdict" || effectivePhase === "hold" || isReducedMotion;

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
      {/* Honest Contextual Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-[var(--primary-accent)] mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
            <span>Interactive detection demo</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
            See How PhishIntel Detects Threats
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
            Explore curated sample emails and observe how suspicious signals are identified in sequence.
          </p>
        </div>
      </div>

      {/* Main Interactive Showcase Window */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]/95 shadow-2xl dark:shadow-black/80 overflow-hidden backdrop-blur-sm">
        {/* Window Chrome Header with high-contrast preview badge (§3.F5) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-color)]/70 bg-[var(--bg-elevated)]/40">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
              phishintel.internal / showcase
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              style={{
                backgroundColor: "var(--pi-preview-bg)",
                color: "var(--pi-preview-fg)",
                border: "1px solid #b45309",
                fontWeight: 700,
              }}
              className="text-[11px] uppercase tracking-wide px-2.5 py-0.5 rounded shadow-xs"
            >
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
                    ex.category === "phishing" ? "bg-red-500" : "bg-emerald-500"
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

            {/* Email Container with full-pane scanning beam (§3.F6 & §4) */}
            <div
              ref={paneRef}
              className="relative rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] overflow-hidden p-4 flex-1 flex flex-col justify-start min-h-[380px]"
            >
              {/* Scan Beam Indicator spanning entire message pane (§4.1 & §4.2) */}
              {showScanBeam && (
                <div className="pi-scan-overlay" aria-hidden="true">
                  <div className="pi-scan" />
                </div>
              )}

              {/* Email Headers */}
              <div className="space-y-2 pb-3 border-b border-[var(--border-color)]/70 text-xs shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[var(--pi-text-muted)] truncate">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold text-[var(--pi-text)] truncate">
                      {currentExample.senderName}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--pi-text-muted)] truncate hidden sm:inline">
                      &lt;{currentExample.senderEmail}&gt;
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase text-[var(--pi-text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] shrink-0 border border-[var(--border-color)]/50">
                    {currentExample.dateLabel}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-[var(--pi-text-muted)] truncate sm:hidden">
                  From: {currentExample.senderEmail}
                </div>

                <div className="font-semibold text-sm text-[var(--pi-text)] tracking-tight">
                  {currentExample.subject}
                </div>
              </div>

              {/* Email Body with high-contrast progressive highlights (§3.F1 & §3.F6) */}
              <div
                className="mt-4 mb-4 text-xs sm:text-sm text-[var(--pi-text)] font-sans select-text"
                style={{ lineHeight: 1.75 }}
              >
                {currentExample.bodyParts.map((part, pIdx) => {
                  if (part.isHighlight) {
                    const isThreat = part.highlightType === "threat";
                    const isRevealed =
                      isReducedMotion ||
                      effectivePhase === "highlighting" ||
                      effectivePhase === "evidence" ||
                      effectivePhase === "verdict" ||
                      effectivePhase === "hold" ||
                      revealedHighlights.has(pIdx);

                    return (
                      <span
                        key={pIdx}
                        ref={(el) => {
                          if (el) highlightRefs.current.set(pIdx, el);
                          else highlightRefs.current.delete(pIdx);
                        }}
                        style={
                          isRevealed
                            ? isThreat
                              ? {
                                  color: "var(--pi-danger-strong)",
                                  backgroundColor: "var(--pi-danger-mark)",
                                  borderBottom: "2px solid var(--pi-danger-border)",
                                  borderRadius: "4px",
                                  padding: "1px 4px",
                                  fontWeight: 600,
                                }
                              : {
                                  color: "var(--pi-safe-strong)",
                                  backgroundColor: "var(--pi-safe-mark)",
                                  borderBottom: "2px solid var(--pi-safe-border)",
                                  borderRadius: "4px",
                                  padding: "1px 4px",
                                  fontWeight: 600,
                                }
                            : undefined
                        }
                        className={cn(
                          "relative inline transition-all duration-200",
                          !isRevealed && "text-[var(--pi-text)] font-normal"
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

              {/* Inert Link / Action Item pinned to bottom with accessible badge (§3.F4) */}
              {currentExample.inertLink && (
                <div className="mt-auto pt-3">
                  <div className="p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--pi-text-muted)] shrink-0" />
                      <span className="text-[var(--pi-text-muted)] font-medium shrink-0 hidden sm:inline">
                        {currentExample.inertLink.label}:
                      </span>
                      <span className="font-mono text-[11px] text-[var(--pi-text)] truncate font-semibold">
                        {currentExample.inertLink.value}
                      </span>
                    </div>
                    <span
                      style={
                        currentExample.inertLink.isSuspicious
                          ? {
                              backgroundColor: "var(--pi-badge-flag-bg)",
                              color: "var(--pi-badge-flag-fg)",
                              border: "1px solid var(--pi-danger-border)",
                              fontWeight: 700,
                            }
                          : {
                              backgroundColor: "var(--pi-badge-ok-bg)",
                              color: "var(--pi-badge-ok-fg)",
                              border: "1px solid var(--pi-safe-border)",
                              fontWeight: 700,
                            }
                      }
                      className={cn(
                        "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded shrink-0 flex items-center gap-1 transition-all duration-200 shadow-2xs",
                        isLinkBadgeRevealed || isReducedMotion
                          ? "scale-100 opacity-100"
                          : "scale-90 opacity-0"
                      )}
                    >
                      {currentExample.inertLink.isSuspicious ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-[var(--pi-badge-flag-fg)] shrink-0" />
                          <span>Flagged Link</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[var(--pi-badge-ok-fg)] shrink-0" />
                          <span>Verified Link</span>
                        </>
                      )}
                    </span>
                  </div>
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

            {/* Evidence & Signals Card with distinct Pending/Confirmed states (§3.F2) */}
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                  <span>Detected Signals</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {revealedSignalsCount >= 3
                      ? "3/3 signals analyzed"
                      : revealedSignalsCount > 0
                      ? `${revealedSignalsCount}/3 signals analyzed`
                      : "Extracting features…"}
                  </span>
                </div>

                <div className="space-y-2">
                  {currentExample.evidencePoints.map((ev, evIdx) => {
                    const isThreat = ev.variant === "threat";
                    const isRevealed = evIdx < revealedSignalsCount;

                    return (
                      <div
                        key={evIdx}
                        style={
                          isRevealed
                            ? isThreat
                              ? {
                                  backgroundColor: "var(--pi-danger-card)",
                                  border: "1px solid rgba(190, 18, 60, 0.35)",
                                }
                              : {
                                  backgroundColor: "var(--pi-safe-card)",
                                  border: "1px solid rgba(21, 128, 61, 0.35)",
                                }
                            : {
                                backgroundColor: "var(--bg-surface)",
                                border: "1px dashed var(--border-color)",
                                opacity: 0.85,
                              }
                        }
                        className={cn(
                          "p-2.5 rounded-lg text-xs transition-all duration-300",
                          isRevealed ? "translate-y-0 shadow-2xs" : "translate-y-0.5"
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-bold mb-0.5">
                          {isThreat ? (
                            <AlertTriangle
                              className="w-3.5 h-3.5 shrink-0"
                              style={{
                                color: isRevealed
                                  ? "var(--pi-danger-text)"
                                  : "var(--pi-text-muted)",
                              }}
                            />
                          ) : (
                            <CheckCircle2
                              className="w-3.5 h-3.5 shrink-0"
                              style={{
                                color: isRevealed
                                  ? "var(--pi-safe-text)"
                                  : "var(--pi-text-muted)",
                              }}
                            />
                          )}
                          <span
                            style={{
                              color: isRevealed
                                ? isThreat
                                  ? "var(--pi-danger-text)"
                                  : "var(--pi-safe-text)"
                                : "var(--pi-text-muted)",
                              fontWeight: 700,
                              fontSize: "0.8125rem",
                            }}
                          >
                            {ev.title}
                          </span>
                        </div>
                        <p
                          style={{
                            color: isRevealed
                              ? "var(--pi-text)"
                              : "var(--pi-text-muted)",
                            fontSize: "0.6875rem",
                            lineHeight: 1.5,
                          }}
                          className="pl-5"
                        >
                          {ev.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Classification Final Verdict Area (§3.F3) */}
              <div className="pt-3 border-t border-[var(--border-color)]/70">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center justify-between">
                  <span>Final Verdict</span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {showVerdict ? "Verdict confirmed" : "Synthesizing…"}
                  </span>
                </div>

                {showVerdict ? (
                  <div
                    style={
                      currentExample.verdict === "phishing"
                        ? {
                            backgroundColor: "var(--pi-danger-bg)",
                            border: "1.5px solid var(--pi-danger-border)",
                          }
                        : {
                            backgroundColor: "var(--pi-safe-bg)",
                            border: "1.5px solid var(--pi-safe-border)",
                          }
                    }
                    className="p-3 rounded-xl text-left transition-all duration-300 animate-in fade-in zoom-in-95 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {currentExample.verdict === "phishing" ? (
                        <>
                          <AlertTriangle
                            className="w-4 h-4 shrink-0"
                            style={{ color: "var(--pi-danger-strong)" }}
                          />
                          <span
                            style={{
                              color: "var(--pi-danger-strong)",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                              fontSize: "0.875rem",
                            }}
                          >
                            PHISHING DETECTED
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2
                            className="w-4 h-4 shrink-0"
                            style={{ color: "var(--pi-safe-strong)" }}
                          />
                          <span
                            style={{
                              color: "var(--pi-safe-strong)",
                              fontWeight: 800,
                              letterSpacing: "0.04em",
                              fontSize: "0.875rem",
                            }}
                          >
                            LEGITIMATE EMAIL
                          </span>
                        </>
                      )}
                    </div>
                    <p
                      style={{
                        color: "var(--pi-text)",
                        fontSize: "0.75rem",
                        lineHeight: 1.5,
                      }}
                      className="font-sans"
                    >
                      {currentExample.explanation}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-dashed border-[var(--border-color)] text-xs text-[var(--text-muted)] flex items-center justify-center gap-2 py-4 min-h-[74px]">
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
