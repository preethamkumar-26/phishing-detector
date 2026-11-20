"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { GoogleIcon } from "@/components/ui/BrandIcons";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeNext } from "@/lib/authRedirect";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/dashboard");
  const { status, register, signInWithGoogle } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (status === "authenticated") {
      router.replace(next);
    }
  }, [status, next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name or analyst handle.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register(name.trim(), email.trim(), password);
      // If registration completed and session is established, navigate
      router.replace(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to complete registration.";
      // Check if email confirmation is required by Supabase project settings
      if (msg.toLowerCase().includes("check your email") || msg.toLowerCase().includes("confirmation")) {
        setConfirmationNotice(true);
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication could not be completed.");
      setGoogleLoading(false);
    }
  };

  if (confirmationNotice) {
    return (
      <div className="min-h-screen bg-[#e5e7d7] text-[#17211b] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#f1f2e7] rounded-3xl p-8 sm:p-10 border border-[rgba(23,33,27,0.12)] shadow-2xl text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#26a875]/10 border border-[#26a875]/25 flex items-center justify-center text-[#26a875] mb-5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Check Your Inbox</h1>
          <p className="text-sm text-[#6f796e] mb-6 leading-relaxed">
            We sent a verification link to <strong className="text-[#17211b]">{email}</strong>. Click the link in the message to activate your workspace and complete setup.
          </p>
          <div className="pt-4 border-t border-[rgba(23,33,27,0.08)]">
            <Link
              href={`/sign-in?next=${encodeURIComponent(next)}`}
              className="text-xs font-semibold text-[#f8761b] hover:underline"
            >
              Already confirmed? Sign in to workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5e7d7] text-[#17211b] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl bg-[#f1f2e7] rounded-3xl border border-[rgba(23,33,27,0.12)] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
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
                New Workspace
              </span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17211b] mb-2">
              Create your secure workspace
            </h1>
            <p className="text-sm text-[#6f796e] mb-6 leading-relaxed">
              Register an account to evaluate suspicious messages and retain explainable detection evidence.
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
              onClick={handleGoogleSignUp}
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
                  or register with email
                </span>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1"
                >
                  Name or Analyst Handle
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f796e]" />
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1"
                >
                  Work or Analyst Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f796e]" />
                  <input
                    id="signup-email"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1"
                  >
                    Password (8+ chars)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f796e]" />
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6f796e]" />
                    <input
                      id="signup-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-[#f8761b] hover:bg-[#dd650f] text-white font-semibold text-sm transition-all shadow-md shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:ring-offset-2 focus:ring-offset-[#f1f2e7]"
              >
                <span>{loading ? "Creating workspace..." : "Create secure workspace"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Footer Switch */}
          <div className="mt-6 pt-4 border-t border-[rgba(23,33,27,0.08)] text-center text-xs text-[#6f796e]">
            Already have an account?{" "}
            <Link
              href={`/sign-in?next=${encodeURIComponent(next)}`}
              className="font-semibold text-[#f8761b] hover:underline"
            >
              Sign in to workspace
            </Link>
          </div>
        </div>

        {/* Right Context Panel (md: 5 cols) - Forest Dark Surface */}
        <div className="hidden md:flex md:col-span-5 bg-[#101914] text-[#edf0e8] p-8 lg:p-10 flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#f8761b]/10 blur-3xl rounded-full pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b2820] border border-[rgba(237,240,232,0.1)] text-xs text-[#26a875] mb-8 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#26a875] animate-pulse" />
              <span>Isolated analyst environment</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-3 tracking-tight">
              Built for Security Analysts &amp; Teams
            </h2>
            <p className="text-xs text-[#8d9a8f] leading-relaxed mb-6">
              Every account receives an isolated threat database with Row Level Security. Retain audit-ready evidence with complete data privacy.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#16221b] border border-[rgba(237,240,232,0.08)]">
                <span className="font-semibold text-white block mb-0.5">Automated Scan Ownership</span>
                <span className="text-[#8d9a8f]">Each analyzed email is securely indexed to your unique cryptographic user ID.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#16221b] border border-[rgba(237,240,232,0.08)]">
                <span className="font-semibold text-white block mb-0.5">Explainable AI Reasoning</span>
                <span className="text-[#8d9a8f]">Gain visibility into modal gate weights, linguistic urgency, and domain verification.</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[rgba(237,240,232,0.08)]">
            <div className="flex items-start gap-2.5 text-xs text-[#8d9a8f] leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-[#26a875] flex-shrink-0 mt-0.5" />
              <span>
                By creating a workspace, your analysis sessions remain private and unshared with external parties.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#e5e7d7] flex items-center justify-center">
        <div className="text-xs text-[#6f796e]">Loading sign up...</div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}
