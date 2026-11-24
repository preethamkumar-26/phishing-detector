"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Shield, Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const RESEND_COOLDOWN_SECONDS = 60;

function ForgotPasswordForm() {
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend UI cooldown management
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const remainingSeconds = cooldownEndsAt
    ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))
    : 0;
  const isCooldownActive = remainingSeconds > 0;

  useEffect(() => {
    if (!isCooldownActive) return;
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [isCooldownActive]);

  useEffect(() => {
    if (cooldownEndsAt && remainingSeconds === 0) {
      setCooldownEndsAt(null);
    }
  }, [cooldownEndsAt, remainingSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your work or analyst email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPasswordForEmail(cleanEmail);
      setSubmitted(true);
      setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process your request at this time. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (isCooldownActive || loading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setLoading(true);
    setError(null);

    try {
      await resetPasswordForEmail(cleanEmail);
      setCooldownEndsAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend reset email. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e5e7d7] text-[#17211b] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-[#f1f2e7] rounded-3xl border border-[rgba(23,33,27,0.12)] shadow-2xl p-6 sm:p-10">
        <div>
          {/* Header Brand */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#f8761b] flex items-center justify-center text-white shadow-md shadow-orange-900/20 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-lg tracking-tight text-[#17211b]">
                PhishIntel
              </span>
            </Link>
            <span className="text-[11px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full bg-[rgba(23,33,27,0.06)] text-[#6f796e] border border-[rgba(23,33,27,0.08)]">
              Recovery
            </span>
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17211b] mb-2">
            Reset your password
          </h1>
          <p className="text-sm text-[#6f796e] mb-6 leading-relaxed">
            Enter your account email. If an account exists, a secure password-reset link will be sent to your inbox.
          </p>

          {/* Error Message */}
          {error && (
            <div
              aria-live="polite"
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            /* Privacy-preserving Success State */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs leading-relaxed flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-emerald-900">
                    Reset request submitted
                  </p>
                  <p>
                    If an account exists for this email address, we&apos;ll send a password-reset link. Check your inbox and spam folder.
                  </p>
                </div>
              </div>

              {/* Resend Action with Cooldown */}
              <div className="pt-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isCooldownActive || loading}
                  className="w-full py-2.5 px-4 rounded-xl border border-[rgba(23,33,27,0.18)] hover:bg-[rgba(23,33,27,0.05)] text-[#17211b] font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCooldownActive ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-[#6f796e]" />
                      <span>Resend available in {remainingSeconds}s</span>
                    </>
                  ) : loading ? (
                    <span>Sending...</span>
                  ) : (
                    <span>Resend reset link</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setError(null);
                  }}
                  className="text-xs text-[#6f796e] hover:text-[#17211b] hover:underline"
                >
                  Use a different email address
                </button>
              </div>
            </div>
          ) : (
            /* Email Input Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1.5"
                >
                  Work or Analyst Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f796e]" />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@organization.com"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#f8761b] hover:bg-[#dd650f] text-white font-semibold text-sm transition-all shadow-md shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:ring-offset-2 focus:ring-offset-[#f1f2e7]"
              >
                <span>{loading ? "Sending reset link..." : "Send reset link"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Footer Link Back to Sign In */}
        <div className="mt-8 pt-4 border-t border-[rgba(23,33,27,0.08)] text-center text-xs text-[#6f796e]">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 font-semibold text-[#f8761b] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#e5e7d7] flex items-center justify-center">
          <div className="text-xs text-[#6f796e]">Loading password recovery...</div>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
