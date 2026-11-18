"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { usePhishGuard } from "@/context/PhishGuardContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toasts } = usePhishGuard();
  const gPressedRef = useRef<number>(0);

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

  // Proactively warm up all primary section routes in browser idle time
  useEffect(() => {
    if (typeof window === "undefined") return;
    const routes = [
      "/dashboard",
      "/analyzer",
      "/explainability",
      "/analytics",
      "/history",
      "/profile",
      "/settings",
    ];

    const warmRoutes = () => {
      routes.forEach((r) => {
        try {
          router.prefetch(r);
        } catch {}
      });
    };

    if ("requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(warmRoutes, { timeout: 1200 });
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const timer = setTimeout(warmRoutes, 400);
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <div className="shell-root min-h-screen flex flex-col justify-between">
      <TopBar />
      <div className="shell flex-1 flex flex-col justify-between">
        <main className="page" id="main-content">
          {children}
        </main>

        <footer className="foot" role="contentinfo">
          <span>Overview figures reflect the sample workspace and are illustrative.</span>
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
