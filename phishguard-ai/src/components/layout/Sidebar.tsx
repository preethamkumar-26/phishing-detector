"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "@/config/navigation";
import {
  Home,
  FileUp,
  ScanSearch,
  History,
  FlaskConical,
  Database,
  ChartNoAxesCombined,
  Network,
  FolderGit2,
  BookOpen,
  FileText,
  Settings,
  UserRound,
  ChevronDown,
  Shield,
  ExternalLink,
  LogOut,
  X,
  Pin,
  PinOff,
} from "lucide-react";
import { GithubIcon, YoutubeIcon } from "@/components/ui/BrandIcons";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";

export interface SidebarProps {
  isPinned?: boolean;
  onTogglePin?: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean; // backwards compatibility
}

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  FileUp,
  ScanSearch,
  History,
  FlaskConical,
  Database,
  ChartNoAxesCombined,
  Network,
  FolderGit2,
  Youtube: YoutubeIcon,
  BookOpen,
  Github: GithubIcon,
  FileText,
  Settings,
  UserRound,
};

function renderNavIcon(name: string, className?: string) {
  const IconComponent = ICON_MAP[name] || Shield;
  return <IconComponent className={cn("w-4 h-4 shrink-0", className)} />;
}

export function Sidebar({
  isPinned = false,
  onTogglePin,
  isMobile = false,
  onCloseMobile,
  collapsed: legacyCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Optimistic navigation state: responds immediately (0ms) to clicks before route settles
  const [optimisticTarget, setOptimisticTarget] = useState<{ target: string; from: string } | null>(null);

  // Declaratively derive current active path: while on 'from' path, display 'target' immediately
  const currentPath =
    optimisticTarget && optimisticTarget.from === pathname
      ? optimisticTarget.target
      : pathname;

  // Background idle prefetching of primary app routes to make navigation near-instant
  useEffect(() => {
    const prefetchRoutes = [
      "/dashboard",
      "/analyzer",
      "/explainability",
      "/analytics",
      "/history",
      "/research/architecture",
      "/research/datasets",
      "/research/papers",
      "/settings",
      "/account",
    ];

    const prefetchAll = () => {
      prefetchRoutes.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {
          // Ignore prefetch errors in unsupported environments
        }
      });
    };

    if (typeof window !== "undefined") {
      const win = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (typeof win.requestIdleCallback === "function") {
        const id = win.requestIdleCallback(prefetchAll, { timeout: 1500 });
        return () => {
          if (win.cancelIdleCallback) win.cancelIdleCallback(id);
        };
      } else {
        const timer = setTimeout(prefetchAll, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [router]);

  const handleNavClick = (href: string) => {
    setOptimisticTarget({ target: href, from: pathname });
    if (onCloseMobile) onCloseMobile();
  };

  const handleNavPrefetch = (href: string) => {
    if (!href.startsWith("http")) {
      try {
        router.prefetch(href);
      } catch {
        // Ignore prefetch errors
      }
    }
  };

  // If caller used legacy collapsed prop and not isPinned, respect it
  const effectivePinned = isPinned || (legacyCollapsed === false && isMobile === false);

  const [researchOpen, setResearchOpen] = useState(true);
  const [ourWorkOpen, setOurWorkOpen] = useState(true);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  // Expanded state: mobile always expanded, desktop controlled by pin toggle
  const isExpanded = isMobile || effectivePinned;

  // Keep parent groups expanded if a child route is active
  const isResearchActive =
    currentPath.startsWith("/research/datasets") ||
    currentPath.startsWith("/analytics") ||
    currentPath.startsWith("/research/architecture");

  const isOurWorkActive =
    currentPath.startsWith("/research/sources") ||
    currentPath.startsWith("/research/papers");

  const isResearchExpanded = researchOpen || isResearchActive;
  const isOurWorkExpanded = ourWorkOpen || isOurWorkActive;

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return currentPath === "/dashboard";
    }
    if (href === "/analyzer") {
      if (currentPath === "/analyzer") {
        if (typeof window !== "undefined" && window.location.search.includes("mode=upload")) {
          return false;
        }
        return true;
      }
      return false;
    }
    if (href === "/analyzer?mode=upload") {
      if (currentPath === "/analyzer") {
        if (typeof window !== "undefined" && window.location.search.includes("mode=upload")) {
          return true;
        }
      }
      return false;
    }
    if (href !== "/" && currentPath.startsWith(href)) {
      return true;
    }
    return false;
  };

  const userInitials = user?.name
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AM";

  return (
    <>
      <aside
        aria-label="Application sidebar"
        className={cn(
          "h-full flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] select-none pg-sidebar-transition",
          isExpanded ? "w-[264px]" : "w-20",
          isMobile && "w-full shadow-none relative"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--border-subtle)] shrink-0">
          <Link
            href="/dashboard"
            prefetch={true}
            className="flex items-center gap-3 overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] rounded-xl"
            onClick={() => handleNavClick("/dashboard")}
            onMouseEnter={() => handleNavPrefetch("/dashboard")}
            onFocus={() => handleNavPrefetch("/dashboard")}
            title={!isExpanded ? "PhishGuard AI Dashboard" : undefined}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-accent)] to-[var(--secondary-accent)] flex items-center justify-center shadow-md shadow-blue-900/25 shrink-0 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div
              className={cn(
                "flex flex-col whitespace-nowrap overflow-hidden pg-sidebar-label-transition",
                isExpanded
                  ? "opacity-100 translate-x-0 max-w-[180px]"
                  : "opacity-0 -translate-x-2 max-w-0 pointer-events-none"
              )}
            >
              <span className="font-bold text-base tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
                PhishGuard <span className="text-[var(--primary-accent)]">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
                Research Prototype
              </span>
            </div>
          </Link>

          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Desktop pin toggle (visible when expanded) */}
          {!isMobile && onTogglePin && isExpanded && (
            <button
              onClick={onTogglePin}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              title={effectivePinned ? "Unpin sidebar (auto-collapse)" : "Pin sidebar expanded"}
              aria-label={effectivePinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              {effectivePinned ? (
                <PinOff className="w-4 h-4 text-[var(--primary-accent)]" />
              ) : (
                <Pin className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Scrollable Body */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main Navigation">
          {/* Main Navigation (Primary Core Actions) */}
          <div className="space-y-1">
            <div
              className={cn(
                "px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/70 pg-sidebar-label-transition overflow-hidden whitespace-nowrap",
                isExpanded ? "opacity-100 max-h-6" : "opacity-0 max-h-0 pointer-events-none py-0"
              )}
            >
              Analysis Core
            </div>

            <ul className="space-y-1 list-none p-0 m-0">
              {SIDEBAR_ITEMS.primary.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      prefetch={true}
                      onClick={() => handleNavClick(item.href)}
                      onMouseEnter={() => handleNavPrefetch(item.href)}
                      onFocus={() => handleNavPrefetch(item.href)}
                      aria-current={active ? "page" : undefined}
                      title={!isExpanded ? item.title : undefined}
                      className={cn(
                        "flex items-center h-11 px-3 rounded-xl text-sm font-medium transition-colors duration-150 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]",
                        active
                          ? "bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] dark:text-white border border-[var(--primary-accent)]/30 font-semibold shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      )}
                    >
                      {/* Active vertical marker indicator */}
                      {active && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--primary-accent)] shadow-[0_0_8px_var(--accent-glow)]"
                          aria-hidden="true"
                        />
                      )}

                      {/* Icon container - kept aligned in exact column */}
                      <span className="w-5 h-5 flex items-center justify-center shrink-0">
                        {renderNavIcon(
                          item.iconName,
                          active
                            ? "text-[var(--primary-accent)] dark:text-white"
                            : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                        )}
                      </span>

                      {/* Text Label */}
                      <div
                        className={cn(
                          "flex-1 flex items-center justify-between whitespace-nowrap overflow-hidden pg-sidebar-label-transition",
                          isExpanded
                            ? "opacity-100 translate-x-0 ml-3 max-w-[170px]"
                            : "opacity-0 -translate-x-2 ml-0 max-w-0 pointer-events-none"
                        )}
                      >
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0 ml-2">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Dot badge in collapsed mode */}
                      {!isExpanded && item.badge && (
                        <span
                          className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[var(--bg-sidebar)]"
                          title={item.badge}
                          aria-label={item.badge}
                        />
                      )}
                    </Link>

                    {/* Collapsed floating tooltip on hover */}
                    {!isExpanded && !isMobile && (
                      <div
                        role="tooltip"
                        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
                      >
                        {item.title}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Research Group (Expandable) */}
          <div className="space-y-1">
            {isExpanded ? (
              <button
                onClick={() => setResearchOpen(!isResearchExpanded)}
                aria-expanded={isResearchExpanded}
                className="w-full px-3 py-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/70 hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <FlaskConical className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                  {SIDEBAR_ITEMS.research.title}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isResearchExpanded ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
            ) : (
              <div
                className="w-full flex flex-col items-center py-1 group relative cursor-pointer"
                onClick={() => {
                  setResearchOpen(true);
                  if (onTogglePin) onTogglePin();
                }}
                title={SIDEBAR_ITEMS.research.title}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--primary-accent)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <FlaskConical className="w-4 h-4" />
                </div>
                {!isMobile && (
                  <div
                    role="tooltip"
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
                  >
                    Research Lab
                  </div>
                )}
              </div>
            )}

            {(isResearchExpanded || !isExpanded) && (
              <ul className="space-y-1 list-none p-0 m-0 pg-sidebar-group-transition">
                {SIDEBAR_ITEMS.research.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href} className="relative">
                      <Link
                        href={item.href}
                        prefetch={true}
                        onClick={() => handleNavClick(item.href)}
                        onMouseEnter={() => handleNavPrefetch(item.href)}
                        onFocus={() => handleNavPrefetch(item.href)}
                        aria-current={active ? "page" : undefined}
                        title={!isExpanded ? item.title : undefined}
                        className={cn(
                          "flex items-center h-10 px-3 rounded-xl text-sm font-medium transition-colors duration-150 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]",
                          isExpanded && "pl-4",
                          active
                            ? "bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] dark:text-white border border-[var(--primary-accent)]/30 font-semibold shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                        )}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--primary-accent)] shadow-[0_0_8px_var(--accent-glow)]"
                            aria-hidden="true"
                          />
                        )}

                        <span className="w-5 h-5 flex items-center justify-center shrink-0">
                          {renderNavIcon(
                            item.iconName,
                            active
                              ? "text-[var(--primary-accent)] dark:text-white"
                              : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                          )}
                        </span>

                        <div
                          className={cn(
                            "flex-1 whitespace-nowrap overflow-hidden pg-sidebar-label-transition",
                            isExpanded
                              ? "opacity-100 translate-x-0 ml-3 max-w-[170px]"
                              : "opacity-0 -translate-x-2 ml-0 max-w-0 pointer-events-none"
                          )}
                        >
                          <span className="truncate">{item.title}</span>
                        </div>
                      </Link>

                      {!isExpanded && !isMobile && (
                        <div
                          role="tooltip"
                          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
                        >
                          {item.title}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Our Work Group (Expandable) */}
          <div className="space-y-1">
            {isExpanded ? (
              <button
                onClick={() => setOurWorkOpen(!isOurWorkExpanded)}
                aria-expanded={isOurWorkExpanded}
                className="w-full px-3 py-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]/70 hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-[var(--secondary-accent)]" />
                  {SIDEBAR_ITEMS.ourWork.title}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isOurWorkExpanded ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
            ) : (
              <div
                className="w-full flex flex-col items-center py-1 group relative cursor-pointer"
                onClick={() => {
                  setOurWorkOpen(true);
                  if (onTogglePin) onTogglePin();
                }}
                title={SIDEBAR_ITEMS.ourWork.title}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--secondary-accent)] hover:bg-[var(--bg-elevated)] transition-colors">
                  <FolderGit2 className="w-4 h-4" />
                </div>
                {!isMobile && (
                  <div
                    role="tooltip"
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
                  >
                    Our Work
                  </div>
                )}
              </div>
            )}

            {(isOurWorkExpanded || !isExpanded) && (
              <ul className="space-y-1 list-none p-0 m-0 pg-sidebar-group-transition">
                {SIDEBAR_ITEMS.ourWork.items.map((item) => {
                  const active = isActive(item.href);
                  const isExternal = item.isExternal;
                  return (
                    <li key={item.title} className="relative">
                      <Link
                        href={item.href}
                        prefetch={!isExternal}
                        onClick={() => {
                          if (!isExternal) handleNavClick(item.href);
                          else if (onCloseMobile) onCloseMobile();
                        }}
                        onMouseEnter={() => handleNavPrefetch(item.href)}
                        onFocus={() => handleNavPrefetch(item.href)}
                        target={isExternal && item.href.startsWith("http") ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        aria-current={active ? "page" : undefined}
                        title={!isExpanded ? item.title : undefined}
                        className={cn(
                          "flex items-center h-10 px-3 rounded-xl text-sm font-medium transition-colors duration-150 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]",
                          isExpanded && "pl-4",
                          active
                            ? "bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] dark:text-white border border-[var(--primary-accent)]/30 font-semibold shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                        )}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--primary-accent)] shadow-[0_0_8px_var(--accent-glow)]"
                            aria-hidden="true"
                          />
                        )}

                        <span className="w-5 h-5 flex items-center justify-center shrink-0">
                          {renderNavIcon(
                            item.iconName,
                            active
                              ? "text-[var(--primary-accent)] dark:text-white"
                              : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                          )}
                        </span>

                        <div
                          className={cn(
                            "flex-1 flex items-center justify-between whitespace-nowrap overflow-hidden pg-sidebar-label-transition",
                            isExpanded
                              ? "opacity-100 translate-x-0 ml-3 max-w-[170px]"
                              : "opacity-0 -translate-x-2 ml-0 max-w-0 pointer-events-none"
                          )}
                        >
                          <span className="truncate">{item.title}</span>
                          {isExternal && (
                            <ExternalLink className="w-3 h-3 text-[var(--text-muted)]/50 group-hover:text-[var(--text-muted)] ml-1 shrink-0" />
                          )}
                        </div>
                      </Link>

                      {!isExpanded && !isMobile && (
                        <div
                          role="tooltip"
                          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
                        >
                          {item.title}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </nav>

        {/* Bottom / Account Area (§3, §12) */}
        <div className="p-3 border-t border-[var(--border-subtle)] space-y-1 bg-[var(--bg-primary)]/40 shrink-0">
          {/* Settings */}
          {SIDEBAR_ITEMS.footer.map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  prefetch={true}
                  onClick={() => handleNavClick(item.href)}
                  onMouseEnter={() => handleNavPrefetch(item.href)}
                  onFocus={() => handleNavPrefetch(item.href)}
                  aria-current={active ? "page" : undefined}
                  title={!isExpanded ? item.title : undefined}
                  className={cn(
                    "flex items-center h-10 px-3 rounded-xl text-sm font-medium transition-colors duration-150 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]",
                    active
                      ? "bg-[var(--primary-accent)]/15 text-[var(--primary-accent)] dark:text-white border border-[var(--primary-accent)]/30 font-semibold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[var(--primary-accent)] shadow-[0_0_8px_var(--accent-glow)]"
                      aria-hidden="true"
                    />
                  )}

                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    {renderNavIcon(
                      item.iconName,
                      active
                        ? "text-[var(--primary-accent)] dark:text-white"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                    )}
                  </span>

                  <div
                    className={cn(
                      "flex-1 whitespace-nowrap overflow-hidden pg-sidebar-label-transition",
                      isExpanded
                        ? "opacity-100 translate-x-0 ml-3 max-w-[170px]"
                        : "opacity-0 -translate-x-2 ml-0 max-w-0 pointer-events-none"
                    )}
                  >
                    <span className="truncate">{item.title}</span>
                  </div>
                </Link>

                {!isExpanded && !isMobile && (
                  <div
                    role="tooltip"
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
                  >
                    {item.title}
                  </div>
                )}
              </div>
            );
          })}

          {/* User Profile snippet (links to /account) */}
          <div className="relative group">
            <Link
              href="/account"
              prefetch={true}
              onClick={() => handleNavClick("/account")}
              onMouseEnter={() => handleNavPrefetch("/account")}
              onFocus={() => handleNavPrefetch("/account")}
              className={cn(
                "flex items-center h-11 px-2.5 rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]",
                isActive("/account")
                  ? "bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/30"
                  : "hover:bg-[var(--bg-elevated)]"
              )}
              title={!isExpanded ? `Account: ${user?.name || "Alex Morgan"}` : undefined}
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-[var(--primary-accent)] font-bold flex items-center justify-center text-xs border border-blue-500/30 shrink-0">
                {userInitials}
              </div>

              <div
                className={cn(
                  "flex-1 flex flex-col min-w-0 text-left whitespace-nowrap overflow-hidden pg-sidebar-label-transition",
                  isExpanded
                    ? "opacity-100 translate-x-0 ml-3 max-w-[160px]"
                    : "opacity-0 -translate-x-2 ml-0 max-w-0 pointer-events-none"
                )}
              >
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {user?.name || "Alex Morgan"}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] truncate">
                  {user?.email || "alex.morgan@phishguard.ai"}
                </span>
              </div>
            </Link>

            {!isExpanded && !isMobile && (
              <div
                role="tooltip"
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
              >
                Account: {user?.name || "Alex Morgan"}
              </div>
            )}
          </div>

          {/* Sign Out Action */}
          <div className="relative group">
            <button
              onClick={() => {
                setSignOutError("");
                setSignOutOpen(true);
              }}
              className={cn(
                "w-full flex items-center h-10 px-3 rounded-xl text-sm font-medium transition-all text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              )}
              title={!isExpanded ? "Sign out" : undefined}
              aria-label="Sign out of your account"
            >
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
              </span>

              <div
                className={cn(
                  "flex-1 text-left whitespace-nowrap overflow-hidden pg-sidebar-label-transition",
                  isExpanded
                    ? "opacity-100 translate-x-0 ml-3 max-w-[170px]"
                    : "opacity-0 -translate-x-2 ml-0 max-w-0 pointer-events-none"
                )}
              >
                <span>Sign out</span>
              </div>
            </button>

            {!isExpanded && !isMobile && (
              <div
                role="tooltip"
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-red-500/30 text-xs font-semibold text-red-400 shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap"
              >
                Sign out
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Sign Out Confirmation Dialog (§2, §3, §12) */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogHeader>
          <DialogTitle>Sign Out</DialogTitle>
          <DialogDescription>
            Sign out of your PhishGuard AI account on this browser.
          </DialogDescription>
        </DialogHeader>

        {signOutError && (
          <p role="alert" className="mt-4 text-xs text-red-500">
            {signOutError}
          </p>
        )}

        <DialogFooter className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setSignOutOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              try {
                signOut();
                setSignOutOpen(false);
                if (onCloseMobile) onCloseMobile();
              } catch (err) {
                setSignOutError(err instanceof Error ? err.message : "Unable to sign out.");
              }
            }}
          >
            Sign out
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
