"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { safeNext } from "@/lib/authRedirect";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"), "/dashboard");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let active = true;

    // Check for error parameters in URL from provider
    const urlError = searchParams.get("error_description") || searchParams.get("error");
    if (urlError) {
      setErrorMsg(urlError);
      return;
    }

    // Check current session or wait for auth state change
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!active) return;

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (session?.user) {
          try {
            window.localStorage.setItem("phishintel-session", session.user.email || "");
            document.cookie = `phishintel_session=${encodeURIComponent(session.user.email || "")}; Path=/; SameSite=Lax;`;
          } catch {}
          router.replace(next);
          return;
        }
      } catch (e) {
        if (!active) return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to verify authentication session.");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password");
        return;
      }
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
        try {
          window.localStorage.setItem("phishintel-session", session.user.email || "");
          document.cookie = `phishintel_session=${encodeURIComponent(session.user.email || "")}; Path=/; SameSite=Lax;`;
        } catch {}
        router.replace(next);
      }
    });

    checkSession();

    // Fallback timer: if nothing happens within 5 seconds, prompt user
    const timer = setTimeout(() => {
      if (active) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            router.replace(next);
          } else {
            setErrorMsg("Authentication timed out. No active session was established.");
          }
        }).catch(() => {});
      }
    }, 5000);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [next, router, searchParams]);

  const handleRetryGoogle = async () => {
    setRetrying(true);
    setErrorMsg(null);
    try {
      const siteUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to restart Google authentication.");
      setRetrying(false);
    }
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#e5e7d7] text-[#17211b] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#f1f2e7] rounded-2xl p-8 border border-[rgba(23,33,27,0.12)] shadow-xl text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold mb-2">Authentication Could Not Be Completed</h2>
          <p className="text-sm text-[#6f796e] mb-6 leading-relaxed">
            {errorMsg}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetryGoogle}
              disabled={retrying}
              className="w-full py-2.5 px-4 rounded-xl bg-[#f8761b] hover:bg-[#dd650f] text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
              Try Google again
            </button>
            <Link
              href={`/sign-in?next=${encodeURIComponent(next)}`}
              className="w-full py-2.5 px-4 rounded-xl border border-[rgba(23,33,27,0.18)] hover:bg-[rgba(23,33,27,0.05)] text-[#17211b] font-medium text-sm transition-colors text-center"
            >
              Sign in with email instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5e7d7] text-[#17211b] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#f1f2e7] rounded-2xl p-8 border border-[rgba(23,33,27,0.12)] shadow-xl text-center">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#f8761b]/10 border border-[#f8761b]/25 flex items-center justify-center text-[#f8761b] mb-4">
          <Shield className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold mb-1">Verifying Secure Session</h2>
        <p className="text-xs text-[#6f796e] mb-4">
          Confirming cryptographic token exchange with Supabase...
        </p>
        <div className="w-full bg-[rgba(23,33,27,0.10)] h-1.5 rounded-full overflow-hidden">
          <div className="h-full bg-[#f8761b] rounded-full animate-pulse w-3/4 mx-auto" />
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#e5e7d7] flex items-center justify-center">
        <div className="text-xs text-[#6f796e]">Loading session...</div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
