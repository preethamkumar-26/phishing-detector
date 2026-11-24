"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { PasswordInput } from "@/components/ui/PasswordInput";

type AuthState = "verifying" | "authorized" | "unauthorized" | "success";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authState, setAuthState] = useState<AuthState>("verifying");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authorizedUserId, setAuthorizedUserId] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const exchangedRef = useRef(false);

  // Validate recovery authorization
  useEffect(() => {
    // If update has already succeeded, do not re-verify
    if (authState === "success") return;

    let isMounted = true;

    async function verifyRecoverySession() {
      try {
        // 1. Check for URL error parameters from Supabase
        const urlError = searchParams.get("error_description") || searchParams.get("error");
        if (urlError) {
          if (isMounted) {
            setAuthState("unauthorized");
            setAuthError(urlError);
          }
          return;
        }

        // 2. PKCE code exchange if present in query parameters
        const code = searchParams.get("code");
        if (code && !exchangedRef.current) {
          exchangedRef.current = true;
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!isMounted) return;

          if (error) {
            setAuthState("unauthorized");
            setAuthError(
              "This password reset link is invalid, expired, or has already been used. Please request a new link."
            );
            return;
          }

          if (data?.session?.user) {
            setAuthorizedUserId(data.session.user.id);
            setAuthState("authorized");
            return;
          }
        }

        // 3. Check existing active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (sessionError) {
          setAuthState("unauthorized");
          setAuthError(sessionError.message);
          return;
        }

        // Check if there is an active session
        if (session?.user) {
          setAuthorizedUserId(session.user.id);
          setAuthState("authorized");
          return;
        }

        // 4. Check URL hash for implicit recovery tokens (e.g. #type=recovery&access_token=...)
        if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
          // Supabase auth client parses hash asynchronously, wait for onAuthStateChange
          return;
        }

        // If no code, no session, and no recovery hash was detected within a short timeout
        const timeoutId = setTimeout(() => {
          if (isMounted && authState === "verifying") {
            setAuthState("unauthorized");
            setAuthError(
              "No valid password recovery authorization was detected. For your security, password resets can only be performed by following the secure link sent to your registered email address."
            );
          }
        }, 1500);

        return () => clearTimeout(timeoutId);
      } catch (err) {
        if (isMounted) {
          setAuthState("unauthorized");
          setAuthError(
            err instanceof Error ? err.message : "Failed to verify recovery authorization."
          );
        }
      }
    }

    // Auth state change listener for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || (session?.user && event === "SIGNED_IN")) {
        if (session?.user?.id) {
          setAuthorizedUserId(session.user.id);
        }
        setAuthState("authorized");
        setAuthError(null);
      }
    });

    verifyRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      setFormError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      // 1. Update the password for the current authenticated recovery user
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error("Unable to confirm password update with Supabase Auth.");
      }

      // 2. Explicitly verify that the updated user ID matches the original recovery user ID
      if (authorizedUserId && data.user.id !== authorizedUserId) {
        throw new Error("Security verification failed: User identity mismatch after update.");
      }

      // 3. Explicitly terminate the temporary recovery session so the user must
      // authenticate fresh using their newly configured credentials
      try {
        await supabase.auth.signOut();
        window.localStorage.removeItem("phishintel-session");
        for (const key of Object.keys(window.localStorage)) {
          if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
            window.localStorage.removeItem(key);
          }
        }
        document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
      } catch {}

      setAuthState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      if (msg.toLowerCase().includes("session") || msg.toLowerCase().includes("expired")) {
        setAuthState("unauthorized");
        setAuthError("Your recovery session has expired. Please request a new reset link.");
      } else {
        setFormError(msg);
      }
    } finally {
      setSaving(false);
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
              Credential Reset
            </span>
          </div>

          {/* State 1: Verifying Recovery Token */}
          {authState === "verifying" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#f8761b]/10 border border-[#f8761b]/25 flex items-center justify-center text-[#f8761b]">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#17211b]">
                  Verifying recovery authorization...
                </h2>
                <p className="text-xs text-[#6f796e] mt-1.5 leading-relaxed">
                  Cryptographically validating your secure password-reset link.
                </p>
              </div>
            </div>
          )}

          {/* State 2: Unauthorized / Invalid / Expired Link */}
          {authState === "unauthorized" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-700 mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-[#17211b]">
                  Invalid or Expired Link
                </h2>
                <p className="text-xs text-[#6f796e] mt-2 leading-relaxed">
                  {authError ||
                    "This password reset link is invalid, expired, or has already been used. For your security, password resets require an active recovery authorization link."}
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Link
                  href="/forgot-password"
                  className="w-full py-3 px-4 rounded-xl bg-[#f8761b] hover:bg-[#dd650f] text-white font-semibold text-sm transition-all shadow-md shadow-orange-900/20 flex items-center justify-center gap-2 text-center"
                >
                  <span>Request a new reset link</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/sign-in"
                  className="w-full py-2.5 px-4 rounded-xl border border-[rgba(23,33,27,0.18)] hover:bg-[rgba(23,33,27,0.05)] text-[#17211b] font-medium text-xs transition-colors text-center"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          )}

          {/* State 3: Password Successfully Updated */}
          {authState === "success" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-[#17211b]">
                  Password Updated Successfully
                </h2>
                <p className="text-xs text-[#6f796e] mt-2 leading-relaxed">
                  Your credentials have been securely updated. You can now sign in to your PhishIntel workspace using your new password.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/sign-in"
                  className="w-full py-3 px-4 rounded-xl bg-[#f8761b] hover:bg-[#dd650f] text-white font-semibold text-sm transition-all shadow-md shadow-orange-900/20 flex items-center justify-center gap-2 text-center"
                >
                  <span>Return to sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* State 4: Authorized - Display New Password Form */}
          {authState === "authorized" && (
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17211b] mb-2">
                Set new password
              </h1>
              <p className="text-sm text-[#6f796e] mb-6 leading-relaxed">
                Choose a strong password with at least 8 characters for your account.
              </p>

              {/* Form Error Banner */}
              {formError && (
                <div
                  aria-live="polite"
                  className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1.5"
                  >
                    New Password (8+ chars)
                  </label>
                  <PasswordInput
                    id="reset-new-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-xs font-semibold text-[#17211b] uppercase tracking-wider mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <PasswordInput
                    id="reset-confirm-password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl border border-[rgba(23,33,27,0.18)] bg-white text-sm text-[#17211b] placeholder:text-[#6f796e]/60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:border-[#f8761b] transition-all disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-[#f8761b] hover:bg-[#dd650f] text-white font-semibold text-sm transition-all shadow-md shadow-orange-900/20 flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#f8761b] focus:ring-offset-2 focus:ring-offset-[#f1f2e7]"
                >
                  <span>{saving ? "Saving new password..." : "Save new password"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Back to sign in */}
              <div className="mt-8 pt-4 border-t border-[rgba(23,33,27,0.08)] text-center text-xs text-[#6f796e]">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 font-semibold text-[#f8761b] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel and return to sign in</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#e5e7d7] flex items-center justify-center">
          <div className="text-xs text-[#6f796e]">Loading password reset...</div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
