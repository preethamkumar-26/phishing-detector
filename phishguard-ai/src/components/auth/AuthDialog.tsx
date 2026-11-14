"use client";

import React, { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LockKeyhole, Mail, Shield, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import RubberSegment from "@/components/ui/RubberSegment";
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
  const { register, signIn } = useAuth();
  const [uncontrolledMode, setUncontrolledMode] = useState<AuthModalMode>(initialMode);
  const mode = controlledMode ?? uncontrolledMode;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didAuthenticate, setDidAuthenticate] = useState(false);

  const { heading, description } = getAuthGateCopy(destination, mode);
  const resolvedDescription = reason?.trim() ? reason : description;

  const setActiveMode = (nextMode: AuthModalMode) => {
    if (onModeChange) {
      onModeChange(nextMode);
    } else {
      setUncontrolledMode(nextMode);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await register(name, email, password);
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
      setError(submitError instanceof Error ? submitError.message : "Unable to authenticate.");
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
                PhishGuard AI
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

            <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
              Password
              <span className="relative block">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  disabled={isSubmitting}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-60"
                  placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
                />
              </span>
            </label>

            {mode === "register" && (
              <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                Confirm password
                <span className="relative block">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={isSubmitting}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-60"
                    placeholder="Re-enter your password"
                  />
                </span>
              </label>
            )}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="mt-4 pt-4 flex-col items-stretch sm:flex-col">
              <Button
                type="submit"
                size="md"
                className="w-full justify-center"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {mode === "signIn" ? "Log In" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-[var(--text-muted)]">
          This client-only account is stored in this browser and is not a server-secured identity.
        </p>
      </div>
    </Dialog>
  );
}
