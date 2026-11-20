"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePhishGuard } from "@/context/PhishGuardContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { LiquidNavbar, LiquidNavItem } from "@/components/ui/liquid-glass-navbar";

export function TopBar() {
  const pathname = usePathname();
  const { serviceStatus, settings, profile } = usePhishGuard();
  // Use live Supabase session user as the primary identity source for the avatar.
  // Falls back to PhishGuardContext.profile for backwards-compat with legacy sessions.
  const { user: authUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prefer Supabase session name → PhishGuardContext profile name → fallback
  const displayName = useMemo(() => {
    if (!mounted) return "Analyst";
    return authUser?.name || profile.name || "Analyst";
  }, [mounted, authUser?.name, profile.name]);

  const initials = useMemo(() => {
    if (!mounted) return "AN";
    const raw = displayName.trim();
    if (!raw) return "AN";
    const w = raw.split(/\s+/);
    return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }, [mounted, displayName]);

  const avatarTitle = useMemo(() => {
    if (!mounted || !displayName || displayName === "Analyst") return "Open profile";
    return `${displayName} · Open profile`;
  }, [mounted, displayName]);

  const svcLabel = useMemo(() => {
    if (!mounted) return "Model service · not connected";
    if (serviceStatus === "ok") return "Model service · connected";
    if (serviceStatus === "err") return "Model service · unreachable";
    if (settings.useService && settings.endpoint.trim()) return "Model service · configured";
    return "Model service · not connected";
  }, [mounted, serviceStatus, settings.endpoint, settings.useService]);

  const svcClass = useMemo(() => {
    if (!mounted) return "svc";
    if (serviceStatus === "ok") return "svc on";
    if (serviceStatus === "err") return "svc err";
    return "svc";
  }, [mounted, serviceStatus]);

  const activeIdx = useMemo(() => {
    if (!pathname || pathname === "/" || pathname === "/dashboard") return 0;
    if (pathname.startsWith("/analyzer")) return 1;
    if (pathname.startsWith("/explainability")) return 2;
    if (pathname.startsWith("/analytics") || pathname.startsWith("/evaluation")) return 3;
    if (pathname.startsWith("/history")) return 4;
    if (pathname.startsWith("/profile") || pathname.startsWith("/account")) return 5;
    return -1;
  }, [pathname]);

  const isSettings = pathname === "/settings";
  const isProfile = pathname === "/profile" || pathname === "/account";

  const navItems: LiquidNavItem[] = useMemo(
    () => [
      {
        label: "Overview",
        href: "/dashboard",
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.5 11.2 12 4l8.5 7.2" />
            <path d="M6 9.6V20h12V9.6" />
            <path className="nv-door" d="M10 20v-5h4v5Z" />
          </svg>
        ),
        fx: "glow",
      },
      {
        label: "Email analyzer",
        href: "/analyzer",
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        ),
        fx: "drop",
      },
      {
        label: "Explainability",
        href: "/explainability",
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5-2.1 2.1m-8.8 8.8-2.1 2.1m0-13 2.1 2.1m8.8 8.8 2.1 2.1" />
          </svg>
        ),
        fx: "spin",
      },
      {
        label: "Evaluation",
        href: "/evaluation",
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        ),
        fx: "wave",
      },
      {
        label: "Scan history",
        href: "/history",
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
        fx: "pop",
      },
      {
        label: "Profile",
        href: "/profile",
        icon: (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8" />
            <path d="M4.8 20c1.2-3.4 4-5 7.2-5s6 1.6 7.2 5" />
          </svg>
        ),
        fx: "wave",
      },
    ],
    []
  );

  return (
    <header className="topbar-wrap" role="banner" data-shell="topbar">
      <div className="topbar">
        {/* Brand logo & title */}
        <Link href="/dashboard" className="brand" aria-label="PhishIntel home">
          <svg
            width="24"
            height="26"
            viewBox="0 0 24 26"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 1.5 2.5 5v7.2c0 6 4.1 10.4 9.5 12.3 5.4-1.9 9.5-6.3 9.5-12.3V5L12 1.5Z"
              stroke="#EF6A1E"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <path
              d="M12 7.5 7.5 9.2v3.3c0 2.9 1.9 5 4.5 6"
              stroke="#EF6A1E"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            Phish<b>Intel</b>
          </span>
        </Link>

        {/* Liquid Glass Navigation Bar with WebGL waterline & interactive physics */}
        <LiquidNavbar
          items={navItems}
          active={activeIdx >= 0 ? activeIdx : undefined}
          tone="light"
          sound={false}
          className="main-liquid-navbar"
        />

        {/* Utility / status controls on right */}
        <div className="tools">
          <span className={svcClass} title="Inference service status" suppressHydrationWarning>
            <i aria-hidden="true" />
            <span>{svcLabel}</span>
          </span>

          <Link href="/analyzer" className="chip-btn" aria-label="Start new scan">
            New scan
          </Link>

          <Link
            href="/settings"
            className={`icon-btn ${isSettings ? "active" : ""}`}
            aria-current={isSettings ? "page" : undefined}
            aria-label="Settings"
            title="Settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </Link>

          <Link
            href="/profile"
            className={`avatar ${isProfile ? "active" : ""}`}
            aria-current={isProfile ? "page" : undefined}
            aria-label="Open profile"
            title={avatarTitle}
            suppressHydrationWarning
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  );
}
