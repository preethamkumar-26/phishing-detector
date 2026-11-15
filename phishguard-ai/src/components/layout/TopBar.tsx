"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  ShieldAlert,
  CheckCircle2,
  X,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getScanHistory } from "@/services/scanService";
import { ScanRecord } from "@/types/scan";
import { ClassificationBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
}

const PAGE_TITLES: Record<string, { title: string; category: string }> = {
  "/dashboard": { title: "Dashboard", category: "Overview" },
  "/analyzer": { title: "Phishing Scan", category: "Core Detection" },
  "/explainability": { title: "Explainable AI", category: "Research & Insights" },
  "/analytics": { title: "Model Evaluation", category: "Performance Metrics" },
  "/history": { title: "Scan History", category: "Audit & Logs" },
  "/research/datasets": { title: "Dataset Versions", category: "Research Lab" },
  "/research/architecture": { title: "Model Architecture", category: "Research Lab" },
  "/research/sources": { title: "Literature Sources", category: "Research Lab" },
  "/research/papers": { title: "Research Papers", category: "Research Lab" },
  "/settings": { title: "System Settings", category: "Preferences" },
  "/account": { title: "Account & Profile", category: "Security" },
};

const SUGGESTED_SEARCH_CHIPS = ["Urgent", "Password", "Invoice", "Safe", "Phishing"];

export function TopBar({
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = sessionStorage.getItem("pg_recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isMac] = useState(() => {
    if (typeof window === "undefined") return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  });

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setSearchDropdownOpen(false);
    setSearchOpen(false);
  }

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const userInitials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  const pageInfo = PAGE_TITLES[pathname] || {
    title: "PhishGuard AI",
    category: "Application",
  };

  const saveRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 4);
      try {
        sessionStorage.setItem("pg_recent_searches", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    try {
      sessionStorage.removeItem("pg_recent_searches");
    } catch {}
    setRecentSearches([]);
  }, []);

  // Live client-side search across authenticated user's scan records
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const history = getScanHistory();
    return history.filter((scan) => {
      const matchSubject = scan.subject?.toLowerCase().includes(q);
      const matchSender = scan.sender?.toLowerCase().includes(q);
      const matchId = scan.id?.toLowerCase().includes(q);
      const matchPred = scan.prediction?.toLowerCase().includes(q);
      return matchSubject || matchSender || matchId || matchPred;
    }).slice(0, 5);
  }, [searchQuery]);

  // Global Cmd+K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchDropdownOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Click outside listener for search popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = useCallback((scan: ScanRecord) => {
    saveRecentSearch(scan.subject || scan.id);
    router.push(`/history?scanId=${encodeURIComponent(scan.id)}`);
    setSearchDropdownOpen(false);
    setSearchOpen(false);
  }, [router, saveRecentSearch]);

  const handleSearchSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedResultIndex >= 0 && searchResults[selectedResultIndex]) {
      handleSelectResult(searchResults[selectedResultIndex]);
      return;
    }
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    router.push(`/history?q=${encodeURIComponent(trimmed)}`);
    setSearchDropdownOpen(false);
    setSearchOpen(false);
  }, [handleSelectResult, router, saveRecentSearch, searchQuery, searchResults, selectedResultIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedResultIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedResultIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === "Escape") {
      setSearchDropdownOpen(false);
      searchInputRef.current?.focus();
    } else if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <>
      <header className="h-16 px-4 md:px-6 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] flex items-center justify-between gap-4 sticky top-0 z-20">
        {/* Left: Sidebar toggle & breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] md:hidden transition-colors"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hidden md:flex transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          <div className="h-4 w-px bg-[var(--border-color)] hidden md:block" />

          {/* Page breadcrumb / title */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {pageInfo.category}
            </div>
            <h1 className="text-sm md:text-base font-bold text-[var(--text-primary)] tracking-tight">
              {pageInfo.title}
            </h1>
          </div>
        </div>

        {/* Right: Glass Quick Search, Notifications, Profile */}
        <div className="flex items-center gap-2">
          {/* Quick search input with glass pill styling & animated popover card */}
          <div ref={searchContainerRef} className="relative hidden sm:block">
            <div
              className={cn(
                "relative flex items-center h-9 rounded-full transition-all duration-200 ease-out",
                "bg-slate-900/[0.04] dark:bg-[#141D2E]/70 hover:bg-slate-900/[0.07] dark:hover:bg-[#1B263B]/80",
                "border border-slate-200/90 dark:border-blue-500/20 hover:border-slate-300 dark:hover:border-blue-500/40",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md",
                "focus-within:bg-white dark:focus-within:bg-[#141D2E]/95",
                "focus-within:border-[var(--primary-accent)] dark:focus-within:border-blue-500",
                "focus-within:ring-2 focus-within:ring-[var(--primary-accent)]/20 focus-within:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
                "w-56 lg:w-72 focus-within:w-64 lg:focus-within:w-84"
              )}
            >
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
              <input
                ref={searchInputRef}
                type="text"
                role="combobox"
                aria-expanded={searchDropdownOpen}
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-controls="topbar-search-listbox"
                aria-label="Search scan records"
                placeholder="Search scans, keywords..."
                value={searchQuery}
                onFocus={() => setSearchDropdownOpen(true)}
                onClick={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                  setSelectedResultIndex(-1);
                }}
                onKeyDown={handleInputKeyDown}
                className="w-full h-full pl-9 pr-16 text-xs bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 rounded-full focus:outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedResultIndex(-1);
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <kbd className="pointer-events-none px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)]/90 border border-[var(--border-color)]/70 rounded-full shadow-xs">
                  {isMac ? "⌘K" : "Ctrl K"}
                </kbd>
              </div>
            </div>

            {/* Glass Popover Card with Real Scan History and Filter Suggestions */}
            {searchDropdownOpen && (
              <div
                id="topbar-search-listbox"
                role="listbox"
                className="absolute right-0 top-full mt-2 w-[390px] lg:w-[440px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--bg-surface)]/95 dark:bg-[#141D2E]/95 backdrop-blur-xl border border-[var(--border-color)] dark:border-blue-500/25 shadow-2xl z-50 p-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ease-out"
              >
                {searchQuery.trim().length === 0 ? (
                  <div className="p-2 space-y-3">
                    {/* Guidance header */}
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                        Search Scan History
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        Search across email subjects, sender addresses, verdicts, or scan IDs (e.g. <span className="font-mono text-[var(--text-primary)]">SCN-9041</span>).
                      </p>
                    </div>

                    {/* Recent Searches (if available) */}
                    {recentSearches.length > 0 && (
                      <div className="pt-1 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Recent Searches
                          </span>
                          <button
                            type="button"
                            onClick={clearRecentSearches}
                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors lowercase font-normal"
                          >
                            clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setSearchQuery(item);
                                searchInputRef.current?.focus();
                              }}
                              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-elevated)]/90 text-[var(--text-primary)] hover:bg-[var(--bg-elevated-hover)] transition-all border border-[var(--border-color)] hover:-translate-y-px shadow-xs flex items-center gap-1"
                            >
                              <span className="text-[var(--text-muted)]">#</span>
                              <span className="truncate max-w-[140px]">{item}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Search Query Chips */}
                    <div className="pt-1 border-t border-[var(--border-subtle)]">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                        Suggested Filter Chips
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_SEARCH_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setSearchQuery(chip);
                              searchInputRef.current?.focus();
                            }}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-elevated)]/80 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated-hover)] transition-all border border-[var(--border-color)] hover:-translate-y-px shadow-xs"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Keyboard navigation hints */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]/80">
                      <span>↑↓ navigate</span>
                      <span>↵ select</span>
                      <span>esc close</span>
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5">
                      <span>Matching Scans ({searchResults.length})</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">↵ to view</span>
                    </div>

                    <div className="space-y-1">
                      {searchResults.map((scan, idx) => {
                        const isSelected = idx === selectedResultIndex;
                        return (
                          <div
                            key={scan.id}
                            role="option"
                            aria-selected={isSelected}
                            onMouseEnter={() => setSelectedResultIndex(idx)}
                            onClick={() => handleSelectResult(scan)}
                            className={cn(
                              "p-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2.5 text-xs",
                              isSelected
                                ? "bg-[var(--primary-accent)]/15 border border-[var(--primary-accent)]/35 text-[var(--text-primary)] shadow-xs -translate-y-px"
                                : "hover:bg-[var(--bg-elevated)]/80 text-[var(--text-primary)] border border-transparent"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate text-[var(--text-primary)]">
                                {scan.subject}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1.5 mt-1">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)]">
                                  {scan.id}
                                </span>
                                <span>•</span>
                                <span className="truncate">{scan.sender}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0 gap-1.5 pt-0.5">
                              <ClassificationBadge prediction={scan.prediction} size="sm" />
                              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                {scan.confidence.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="w-full mt-2 pt-2 border-t border-[var(--border-color)] text-[11px] font-medium text-[var(--primary-accent)] hover:underline flex items-center justify-between px-2 py-1 text-left group/all transition-colors"
                    >
                      <span>View all matching scans in History</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/all:translate-x-1" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)] space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        No matching scans found
                      </p>
                      <p className="text-[11px] mt-0.5">
                        No recorded scans matched &ldquo;{searchQuery}&rdquo;.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearchSubmit()}
                      className="mt-1 text-xs"
                    >
                      Open full Scan History →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] sm:hidden transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notification dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--primary-accent)] animate-pulse" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Notifications</span>
                  <span className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-medium">
                    2 New Demo Alerts
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)]/60 border border-[var(--border-subtle)] text-xs">
                    <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">High Urgency Campaign</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Scan #SCN-9041 flagged with 96.4% phishing probability.
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]/60 mt-1">10 mins ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[var(--bg-elevated)]/40 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[var(--text-primary)]">Validation Threshold Calibrated</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        5-Branch Fusion + Custom Residual Network reached 97.4% accuracy (T=0.58).
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]/60 mt-1">1 hour ago</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[var(--border-color)] text-center">
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[11px] text-[var(--primary-accent)] hover:underline font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-label="Open account menu"
              className="flex items-center gap-2.5 p-1 pl-1.5 pr-3 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--primary-accent)]/30 transition-all shadow-xs"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--primary-accent)] to-[var(--secondary-accent)] flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {userInitials ? userInitials : <User className="w-3.5 h-3.5 text-white/90" />}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-[var(--text-primary)] leading-none">
                  {user?.name}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] leading-none mt-1">
                  {user?.email}
                </div>
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95">
                <div className="p-3 border-b border-[var(--border-color)] mb-1">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{user?.name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {user?.email}
                  </p>
                  <span className="inline-block mt-1.5 text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-medium">
                    Signed in
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/account");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                    Account Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    Preferences
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setSignOutError("");
                      setSignOutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile search modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogHeader>
          <DialogTitle>Search Scan Records</DialogTitle>
          <DialogDescription>
            Search recent email records, subjects, senders, or scan IDs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSearchSubmit} className="mt-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              aria-label="Search scan records"
              placeholder="e.g. URGENT, SCN-9041, Password..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-10 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-full border border-[var(--border-color)] focus:outline-none focus:border-[var(--primary-accent)] focus:ring-2 focus:ring-[var(--primary-accent)]/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-full"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchQuery.trim().length > 0 && (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => handleSelectResult(scan)}
                    className="p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] cursor-pointer flex items-start justify-between gap-2 text-xs border border-[var(--border-subtle)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--text-primary)] truncate">
                        {scan.subject}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                        <span className="font-mono">{scan.id}</span> • {scan.sender}
                      </div>
                    </div>
                    <ClassificationBadge prediction={scan.prediction} size="sm" />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                  No recorded scans match &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              View All in History
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Sign out confirmation modal */}
      <Dialog open={signOutModalOpen} onOpenChange={setSignOutModalOpen}>
        <DialogHeader>
          <DialogTitle>Sign out</DialogTitle>
          <DialogDescription>
            Sign out of your PhishGuard AI account on this browser.
          </DialogDescription>
        </DialogHeader>
        {signOutError && <p role="alert" className="mt-4 text-xs text-red-500">{signOutError}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSignOutModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              try {
                signOut();
                setSignOutModalOpen(false);
                router.replace("/");
              } catch (error) {
                setSignOutError(error instanceof Error ? error.message : "Unable to sign out.");
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
