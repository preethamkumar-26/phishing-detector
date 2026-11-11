"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "signIn" | "register";
}

export function AuthDialog({ open, onOpenChange, initialMode = "signIn" }: AuthDialogProps) {
  const router = useRouter();
  const { register, signIn } = useAuth();
  const [mode, setMode] = useState<"signIn" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      onOpenChange(false);
      router.push("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to authenticate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: "signIn" | "register") => {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setMode(initialMode);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogHeader>
        <DialogTitle>{mode === "signIn" ? "Sign in to PhishGuard AI" : "Create your account"}</DialogTitle>
        <DialogDescription>
          {mode === "signIn"
            ? "Enter the email and password associated with your account."
            : "Create an account to access your PhishGuard AI workspace."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === "register" && (
          <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
            Full name
            <span className="relative block">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
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
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
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
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                placeholder="Re-enter your password"
              />
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            {error}
          </p>
        )}

        <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center">
          <Button type="submit" className="w-full sm:w-auto" isLoading={isSubmitting}>
            {mode === "signIn" ? "Sign in" : "Create account"}
          </Button>
        </DialogFooter>
      </form>

      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        {mode === "signIn" ? "New to PhishGuard AI?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => switchMode(mode === "signIn" ? "register" : "signIn")}
          className="font-semibold text-[var(--primary-accent)] hover:underline"
        >
          {mode === "signIn" ? "Create an account" : "Sign in"}
        </button>
      </p>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--text-muted)]">
        This client-only account is stored in this browser and is not a server-secured identity.
      </p>
    </Dialog>
  );
}
