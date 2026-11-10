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

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);

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
      <header className="h-16 px-4 md:px-6 bg-[#090D18]/90 backdrop-blur-md border-b border-[#273449] flex items-center justify-between gap-4 sticky top-0 z-20">
        {/* Left: Sidebar toggle & breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#151E31] md:hidden transition-colors"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#151E31] hidden md:flex transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          <div className="h-4 w-px bg-[#273449] hidden md:block" />

          {/* Page breadcrumb / title */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              {pageInfo.category}
            </div>
            <h1 className="text-sm md:text-base font-bold text-[#F3F4F6] tracking-tight">
              {pageInfo.title}
            </h1>
          </div>
        </div>

        {/* Right: Quick Search, Notifications, Profile */}
        <div className="flex items-center gap-2">
          {/* Quick search input */}
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search scans, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
              className="w-48 lg:w-64 h-9 pl-9 pr-3 text-xs bg-[#151E31] text-[#F3F4F6] placeholder-[#9CA3AF] rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-all"
            />
          </div>

          {/* Mobile search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#151E31] sm:hidden"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notification dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#151E31] transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#273449] bg-[#151E31] shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-[#273449]">
                  <span className="text-xs font-bold text-[#F3F4F6]">Notifications</span>
                  <span className="text-[10px] bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full font-medium">
                    2 New Demo Alerts
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3 p-2 rounded-xl bg-[#1B2740]/60 border border-[#273449]/50 text-xs">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-200">High Urgency Campaign</div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        Scan #SCN-9041 flagged with 96.4% phishing probability.
                      </div>
                      <div className="text-[10px] text-[#9CA3AF]/60 mt-1">10 mins ago</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-2 rounded-xl bg-[#1B2740]/40 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-200">MGO Checkpoint Ready</div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        BERT-CNN-GRU validation epoch 10 reached 97.4% accuracy.
                      </div>
                      <div className="text-[10px] text-[#9CA3AF]/60 mt-1">1 hour ago</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#273449] text-center">
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[11px] text-[#8B5CF6] hover:underline font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl bg-[#151E31] hover:bg-[#1B2740] border border-[#273449] transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8B5CF6] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                AM
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-[#F3F4F6] leading-none">
                  Alex Morgan
                </div>
                <div className="text-[10px] text-[#9CA3AF] leading-none mt-1">
                  Security Researcher
                </div>
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#273449] bg-[#151E31] shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95">
                <div className="p-3 border-b border-[#273449] mb-1">
                  <p className="text-xs font-bold text-[#F3F4F6]">Alex Morgan</p>
                  <p className="text-[11px] text-[#9CA3AF] truncate">
                    alex.morgan@cyber-research.org
                  </p>
                  <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium">
                    Demo Mode · Not signed in
                  </span>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/account");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1B2740] transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    Account Profile
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      router.push("/settings");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1B2740] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Preferences
                  </button>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setSignOutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    Sign out (Demo)
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
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="e.g. URGENT, Password, Bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm bg-[#101729] text-[#F3F4F6] rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6]"
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

      {/* Sign out demo confirmation */}
      <Dialog open={signOutModalOpen} onOpenChange={setSignOutModalOpen}>
        <DialogHeader>
          <DialogTitle>Sign Out (Prototype Mode)</DialogTitle>
          <DialogDescription>
            This frontend prototype runs locally with demo session storage. No actual authentication session is active.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-xs text-[#9CA3AF] bg-[#101729] p-4 rounded-xl border border-[#273449] mt-3">
          When connected to the production backend, signing out will invalidate the JSON Web Token (JWT) and clear cached user credentials.
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSignOutModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSignOutModalOpen(false);
              router.push("/");
            }}
          >
            Return to Landing
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

