"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { usePhishGuard } from "@/context/PhishGuardContext";
import { useAuth } from "@/components/auth/AuthProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toasts } = usePhishGuard();
  const { status } = useAuth();
  const gPressedRef = useRef<number>(0);

  // Route guard: redirect unauthenticated users to the landing page.
  // "loading" is allowed through — the guard only fires once auth is resolved
  // so there is no flash of content for authenticated users.
  useEffect(() => {
    if (status === "unauthenticated") {
      // Use window.location for a hard redirect so the browser history entry
      // for the protected page is replaced — prevents back-button restore.
      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.replace("/");
      }
    }
  }, [status]);

  // Global keyboard shortcuts (G then A, H, O, E, S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (/input|textarea|select/i.test(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "g" || e.key === "G") {
        gPressedRef.current = Date.now();
        return;
      }

      if (Date.now() - gPressedRef.current < 900) {
        const key = e.key.toLowerCase();
        const routeMap: Record<string, string> = {
          a: "/analyzer",
          h: "/history",
          o: "/dashboard",
          e: "/explainability",
          s: "/settings",
        };
        if (routeMap[key]) {
          e.preventDefault();
          router.push(routeMap[key]);
          gPressedRef.current = 0;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div className="shell-root min-h-screen flex flex-col justify-between" data-shell="root">
      <TopBar />
      <div className="shell flex-1 flex flex-col justify-between">
        <main className="page" id="main-content">
          {/* While auth is loading or unauthenticated redirect is in progress, render nothing
              to prevent flashing protected content. */}
          {status === "loading" || status === "unauthenticated" ? null : children}
        </main>

        <footer className="foot" role="contentinfo">
          <span className="mono">PhishIntel · research build</span>
        </footer>
      </div>

      {/* Floating toast notifications */}
      <div className="toasts" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.warn ? "warn" : ""}`} role="status">
            <i aria-hidden="true" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
