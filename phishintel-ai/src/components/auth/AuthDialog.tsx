"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LockKeyhole, Mail, Shield, UserRound } from "lucide-react";
import { AuthRateLimitError, useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import RubberSegment from "@/components/ui/RubberSegment";
import { PasswordInput } from "@/components/ui/PasswordInput";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { AuthModalMode, getAuthGateCopy } from "@/lib/authGate";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthModalMode;
  mode?: AuthModalMode;
  onModeChange?: (mode: AuthModalMode) => void;
  destination?: string | null;
  reason?: string | null;
  onAuthSuccess?: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function AuthDialog({
  open,
  onOpenChange,
  initialMode = "signIn",
  mode: controlledMode,
  onModeChange,
  destination = null,
  reason = null,
  onAuthSuccess,
  triggerRef,
}: AuthDialogProps) {
  const router = useRouter();
  const { register, signIn, resendConfirmation } = useAuth();
  const [uncontrolledMode, setUncontrolledMode] = useState<AuthModalMode>(initialMode);
  const mode = controlledMode ?? uncontrolledMode;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didAuthenticate, setDidAuthenticate] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const cooldownRemaining = cooldownEndsAt
    ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))
    : 0;
  const cooldownActive = cooldownRemaining > 0;

  useEffect(() => {
    if (!cooldownActive) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [cooldownActive]);

  useEffect(() => {
    if (cooldownEndsAt && cooldownRemaining === 0) setCooldownEndsAt(null);
  }, [cooldownEndsAt, cooldownRemaining]);

  const formatCooldown = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const { heading, description } = getAuthGateCopy(destination, mode);
  const resolvedDescription = reason?.trim() ? reason : description;

  const setActiveMode = (nextMode: AuthModalMode) => {
    if (onModeChange) {
      onModeChange(nextMode);
    } else {
      setUncontrolledMode(nextMode);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resending) return;
    setResending(true);
    setResendSuccess(false);
    try {
      await resendConfirmation(email.trim());
      setResendSuccess(true);
    } catch (resendErr) {
      setError(resendErr instanceof Error ? resendErr.message : "Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || (mode === "register" && cooldownActive)) return;
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        const regRes = await register(name, email, password);
        if (regRes?.requiresConfirmation) {
          setConfirmationNotice(true);
          return;
        }
      } else {
        await signIn(email, password);
      }
      setDidAuthenticate(true);
      setPassword("");
      setConfirmPassword("");
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        onOpenChange(false);
        router.push("/dashboard");
      }
    } catch (submitError) {
      if (submitError instanceof AuthRateLimitError) {
        setCooldownEndsAt(Date.now() + submitError.retryAfterSeconds * 1000);
        setNow(Date.now());
        setError("Too many registration attempts. Please wait for the cooldown to finish.");
      } else {
        setError(submitError instanceof Error ? submitError.message : "Unable to authenticate.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthModalMode) => {
    if (isSubmitting || nextMode === mode) return;
    setActiveMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setConfirmationNotice(false);
    setResendSuccess(false);
  };

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        if (isSubmitting) return;
        if (!controlledMode) {
          setUncontrolledMode(initialMode);
        }
        setPassword("");
        setConfirmPassword("");
        setError("");
        setDidAuthenticate(false);
        setConfirmationNotice(false);
        setResendSuccess(false);
      } else {
        setDidAuthenticate(false);
      }
      onOpenChange(nextOpen);
    },
    [controlledMode, initialMode, isSubmitting, onOpenChange]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      mobileSheet
      disableDismiss={isSubmitting}
      restoreFocusOnClose={!didAuthenticate}
      triggerRef={triggerRef}
      className="sm:max-w-[440px] shadow-[0_24px_64px_rgba(0,0,0,0.65),0_0_40px_rgba(37,99,235,0.10)] ring-1 ring-white/5"
    >
      <DialogHeader className="pg-auth-stagger-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary-accent)] to-[var(--secondary-accent)] flex items-center justify-center shadow-sm shadow-blue-900/20 shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-accent)] block leading-none mb-1">
                PhishIntel
              </span>
              <DialogTitle className="leading-tight">{heading}</DialogTitle>
            </div>
          </div>
          <DialogClose disabled={isSubmitting} onClose={() => handleOpenChange(false)} />
        </div>
        <DialogDescription className="pt-1">{resolvedDescription}</DialogDescription>
      </DialogHeader>

      <div className="pg-auth-stagger-2 mt-4 space-y-4">
        {/* Segmented Log In / Create Account Toggle via RubberSegment */}
        <div className="w-full">
          <RubberSegment
            items={[
              { value: "signIn", label: "Log In" },
              { value: "register", label: "Create Account" },
            ]}
            value={mode}
            onChange={(val) => switchMode(val as AuthModalMode)}
            disabled={isSubmitting}
            equalSlots
            size="md"
            radius={10}
            className="w-full"
            ariaLabel="Authentication mode"
          />
        </div>

        <div
          key={mode}
          id={mode === "signIn" ? "auth-panel-signin" : "auth-panel-register"}
          role="tabpanel"
          aria-labelledby={mode === "signIn" ? "auth-tab-signin" : "auth-tab-register"}
          className={mode === "register" ? "pg-auth-mode-signup" : "pg-auth-mode-signin"}
        >
          <form onSubmit={handleSubmit} className="space-y-3.5 scroll-pb-6">
            {mode === "register" && (
              <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                Full name
                <span className="relative block">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    data-autofocus="true"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-60"
                    placeholder="Your name"
                  />
                </span>
              </label>
            )}

            <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
              Email address
              <span className="relative block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  data-autofocus={mode === "signIn" ? "true" : undefined}
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-60"
                  placeholder="name@company.com"
                />
              </span>
            </label>

            {confirmationNotice ? (
              <div className="text-center py-4 space-y-3.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Check Your Inbox</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    We sent an activation link to <strong className="text-[var(--text-primary)]">{email}</strong>. Please check your inbox or spam folder to activate your account.
                  </p>
                </div>
                {resendSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Confirmation email resent successfully.
                  </p>
                )}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? "Sending link..." : "Resend confirmation email"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmationNotice(false);
                      switchMode("signIn");
                    }}
                    className="text-xs font-semibold text-[var(--primary-accent)] hover:underline pt-1"
                  >
                    Already confirmed? Log in
                  </button>
                </div>
              </div>
            ) : (
              <>
                <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                  Password
                  <PasswordInput
                    id="dialog-password"
                    autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    disabled={isSubmitting}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    leftIcon={<LockKeyhole className="h-4 w-4" />}
                    className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-60"
                    placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                  />
                </label>

                {mode === "register" && (
                  <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                    Confirm password
                    <PasswordInput
                      id="dialog-confirm-password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={isSubmitting}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      leftIcon={<LockKeyhole className="h-4 w-4" />}
                      className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-60"
                      placeholder="Re-enter your password"
                    />
                  </label>
                )}

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="flex flex-col gap-1.5 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                      <span>{error}</span>
                    </div>
                    {error.toLowerCase().includes("not been confirmed") && (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="text-left font-semibold text-[var(--primary-accent)] hover:underline pl-6"
                      >
                        {resending ? "Sending activation link..." : "Resend activation email"}
                      </button>
                    )}
                    {cooldownActive && (
                      <p className="pl-6 font-semibold tabular-nums text-red-700 dark:text-red-300">
                        You can try again in {formatCooldown(cooldownRemaining)}.
                      </p>
                    )}
                  </div>
                )}

                <DialogFooter className="mt-4 pt-4 flex-col items-stretch sm:flex-col">
                  <Button
                    type="submit"
                    size="md"
                    className="w-full justify-center"
                    isLoading={isSubmitting}
                    disabled={isSubmitting || (mode === "register" && cooldownActive)}
                  >
                    {mode === "register" && cooldownActive
                      ? `Try again in ${formatCooldown(cooldownRemaining)}`
                      : mode === "signIn" ? "Log In" : "Create Account"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          Account credentials and threat-analysis sessions are authenticated with Supabase Auth.
        </p>
      </div>
    </Dialog>
  );
}
