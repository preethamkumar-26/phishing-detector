"use client";

import React, { useState } from "react";
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
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const userInitials = user?.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "U";

  const pageInfo = PAGE_TITLES[pathname] || {
    title: "PhishGuard AI",
    category: "Application",
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/history?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
  };

  return (
    <>
      <header className="h-16 px-4 md:px-6 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between gap-4 sticky top-0 z-20">
        {/* Left: Sidebar toggle & breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] md:hidden transition-colors"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] hidden md:flex transition-colors"
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

        {/* Right: Quick Search, Notifications, Profile */}
        <div className="flex items-center gap-2">
          {/* Quick search input */}
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scans, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
              className="w-48 lg:w-64 h-9 pl-9 pr-3 text-xs bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-xl border border-[var(--border-color)] focus:outline-none focus:border-[var(--primary-accent)] focus:ring-1 focus:ring-[var(--primary-accent)] transition-all"
            />
          </div>

          {/* Mobile search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] sm:hidden"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notification dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--primary-accent)] animate-pulse" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Notifications</span>
                  <span className="text-[10px] bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full font-medium">
                    2 New Demo Alerts
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-xl bg-[var(--bg-surface)]/60 border border-[var(--border-color)]/50 text-xs">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-200">High Urgency Campaign</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Scan #SCN-9041 flagged with 96.4% phishing probability.
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]/60 mt-1">10 mins ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-xl bg-[var(--bg-surface)]/40 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-200">MGO Checkpoint Ready</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        BERT-CNN-GRU validation epoch 10 reached 97.4% accuracy.
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

          {/* User Profile dropdown */}
          <ThemeToggle />
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-expanded={profileMenuOpen}
              aria-label="Open account menu"
              className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[var(--primary-accent)] to-[var(--primary-accent)] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {userInitials}
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
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium">
                    Signed in
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/account");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[var(--primary-accent)]" />
                    Account Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Preferences
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setSignOutError("");
                      setSignOutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
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
          <DialogTitle>Search PhishGuard AI Scans</DialogTitle>
          <DialogDescription>
            Search recent email records, subjects, or mock indicators.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSearchSubmit} className="mt-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="e.g. URGENT, Password, Bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)] focus:outline-none focus:border-[var(--primary-accent)]"
            />
          </div>
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
              Search Scans
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

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
