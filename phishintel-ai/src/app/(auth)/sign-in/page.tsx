"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { GoogleIcon } from "@/components/ui/BrandIcons";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeNext } from "@/lib/authRedirect";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/dashboard");
  const { status, signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(next);
    }
  }, [status, next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not sign you in with those details.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication could not be completed.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e5e7d7] text-[#17211b] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-[#f1f2e7] rounded-3xl border border-[rgba(23,33,27,0.12)] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Form Card (md: 7 cols) */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
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
                Secure Console
              </span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17211b] mb-2">
              Sign in to PhishIntel
            </h1>
            <p className="text-sm text-[#6f796e] mb-6 leading-relaxed">
              Access your private threat-analysis workspace, retained scan evidence, and explainable models.
            </p>

            {/* Error Announcement */}
            <div aria-live="polite">
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 rounded-xl border border-[rgba(23,33,27,0.15)] bg-white hover:bg-neutral-50 text-[#17211b] font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:ring-offset-2 focus:ring-offset-[#f1f2e7]"
            >
              <GoogleIcon className="w-4 h-4" />
              <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(23,33,27,0.12)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-[#f1f2e7] px-3 text-[#6f796e] font-medium">
                  or sign in with email
                </span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1.5"
                >
                  Work or Analyst Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f796e]" />
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@organization.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signin-password"
                  className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f796e]" />
                  <input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#f8761b] hover:bg-[#dd650f] text-white font-semibold text-sm transition-all shadow-md shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:ring-offset-2 focus:ring-offset-[#f1f2e7]"
              >
                <span>{loading ? "Signing in..." : "Sign in to workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Footer Switch */}
          <div className="mt-8 pt-4 border-t border-[rgba(23,33,27,0.08)] text-center text-xs text-[#6f796e]">
            Don&apos;t have an account?{" "}
            <Link
              href={`/sign-up?next=${encodeURIComponent(next)}`}
              className="font-semibold text-[#f8761b] hover:underline"
            >
              Create secure workspace
            </Link>
          </div>
        </div>

        {/* Right Context Panel (md: 5 cols) - Forest Dark Surface */}
        <div className="hidden md:flex md:col-span-5 bg-[#101914] text-[#edf0e8] p-8 lg:p-10 flex-col justify-between relative overflow-hidden">
          {/* Subtle dark ambient glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f8761b]/10 blur-3xl rounded-full pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b2820] border border-[rgba(237,240,232,0.1)] text-xs text-[#26a875] mb-8 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#26a875] animate-pulse" />
              <span>Private threat-analysis workspace</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-3 tracking-tight">
              Explainable Detection at Scale
            </h2>
            <p className="text-xs text-[#8d9a8f] leading-relaxed mb-6">
              PAHF-Net availability-gated hierarchical fusion dynamically evaluates linguistic signals, header structures, and URL indicators with full model explainability.
            </p>

            {/* Mini preview card */}
            <div className="p-4 rounded-2xl bg-[#16221b] border border-[rgba(237,240,232,0.08)] space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8d9a8f]">
                <span>PAHF-Net Modal Encoders</span>
                <span className="text-[#26a875]">Calibrated</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[rgba(237,240,232,0.05)]">
                  <span className="text-[#edf0e8]/80">Text (DeBERTa-v3)</span>
                  <span className="font-mono text-[11px] text-[#26a875]">256-d · g_t</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[rgba(237,240,232,0.05)]">
                  <span className="text-[#edf0e8]/80">URL &amp; Domain Rep</span>
                  <span className="font-mono text-[11px] text-[#26a875]">32-d · g_u</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#edf0e8]/80">Layout &amp; Headers</span>
                  <span className="font-mono text-[11px] text-[#26a875]">32-d · g_s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="pt-6 border-t border-[rgba(237,240,232,0.08)]">
            <div className="flex items-start gap-2.5 text-xs text-[#8d9a8f] leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-[#26a875] flex-shrink-0 mt-0.5" />
              <span>
                Your email scans, indicator logs, and threat reports are bound to your user ID and protected by Row Level Security.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#e5e7d7] flex items-center justify-center">
        <div className="text-xs text-[#6f796e]">Loading sign in...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
