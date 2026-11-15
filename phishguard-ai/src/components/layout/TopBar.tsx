"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePhishGuard } from "@/context/PhishGuardContext";

export function TopBar() {
  const pathname = usePathname();
  const { serviceStatus, settings, profile } = usePhishGuard();

  const initials = useMemo(() => {
    const w = (profile.name || "Analyst").trim().split(/\s+/);
    return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }, [profile.name]);

  const svcLabel = useMemo(() => {
    if (serviceStatus === "ok") return "Model service · connected";
    if (serviceStatus === "err") return "Model service · unreachable";
    if (settings.useService && settings.endpoint.trim()) return "Model service · configured";
    return "Model service · not connected";
  }, [serviceStatus, settings.endpoint, settings.useService]);

  const svcClass = useMemo(() => {
    if (serviceStatus === "ok") return "svc on";
    if (serviceStatus === "err") return "svc err";
    return "svc";
  }, [serviceStatus]);

  const isOverview = pathname === "/" || pathname === "/dashboard";
  const isAnalyzer = pathname === "/analyzer";
  const isExplain = pathname === "/explainability";
  const isEval = pathname === "/analytics" || pathname === "/evaluation";
  const isHistory = pathname === "/history";
  const isSettings = pathname === "/settings";
  const isAccount = pathname === "/account";

  return (
    <header className="topbar" role="banner">
      {/* Brand logo & title */}
      <Link href="/dashboard" className="brand" aria-label="PhishGuard AI home">
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
          Phish<b>Guard</b>
        </span>
      </Link>

      {/* Horizontal Nav Tabs: 5 Primary Destinations (Dataset & Architecture completely removed) */}
      <nav className="tabs" aria-label="Primary navigation">
        <Link
          href="/dashboard"
          className={`tab ${isOverview ? "active" : ""}`}
          aria-current={isOverview ? "page" : undefined}
        >
          Overview
        </Link>
        <Link
          href="/analyzer"
          className={`tab ${isAnalyzer ? "active" : ""}`}
          aria-current={isAnalyzer ? "page" : undefined}
        >
          Email analyzer
        </Link>
        <Link
          href="/explainability"
          className={`tab ${isExplain ? "active" : ""}`}
          aria-current={isExplain ? "page" : undefined}
        >
          Explainability
        </Link>
        <Link
          href="/analytics"
          className={`tab ${isEval ? "active" : ""}`}
          aria-current={isEval ? "page" : undefined}
        >
          Evaluation
        </Link>
        <Link
          href="/history"
          className={`tab ${isHistory ? "active" : ""}`}
          aria-current={isHistory ? "page" : undefined}
        >
          Scan history
        </Link>
      </nav>

      {/* Utility / status controls on right */}
      <div className="tools">
        <span className={svcClass} title="Inference service status">
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
          href="/account"
          className="avatar"
          aria-current={isAccount ? "page" : undefined}
          aria-label={`Account (${profile.name || "Analyst"})`}
          title={`${profile.name || "Analyst"} · ${profile.role || "Security analyst"}`}
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
