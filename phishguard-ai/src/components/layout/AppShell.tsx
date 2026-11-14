"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { wasManualSignOutRecently, useAuth } from "@/components/auth/AuthProvider";
import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { isAllowedInternalRoute } from "@/lib/authGate";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, error } = useAuth();
  const { openAuthGateForRedirect } = useAuthGate();
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auto-collapse sidebar on tablet screens (< 1024px)
  useEffect(() => {
    if (status === "unauthenticated") {
      const isManual = wasManualSignOutRecently();
      const search = typeof window !== "undefined" ? window.location.search : "";
      const fullPath = `${pathname}${search}`;
      router.replace("/");
      if (!isManual && isAllowedInternalRoute(fullPath)) {
        openAuthGateForRedirect(fullPath);
      }
    }
  }, [openAuthGateForRedirect, pathname, router, status]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarPinned(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll and handle Escape key for mobile drawer
  useEffect(() => {
    if (mobileSidebarOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileSidebarOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [mobileSidebarOpen]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-sm text-[var(--text-muted)]" role="status">
        Loading your secure workspace…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Unable to load your account</h1>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
          <button onClick={() => router.replace("/")} className="text-sm font-semibold text-[var(--primary-accent)] hover:underline">
            Return to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-x-hidden antialiased">
      {/* Desktop Persistent Sidebar (toggle-based: collapsed icon rail ↔ expanded via TopBar button) */}
      <div
        className={cn(
          "hidden md:block shrink-0 sticky top-0 h-screen transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] z-30",
          sidebarPinned ? "w-64" : "w-20"
        )}
      >
        <Sidebar
          isPinned={sidebarPinned}
          onTogglePin={() => setSidebarPinned(!sidebarPinned)}
        />
      </div>

      {/* Mobile Slide-over Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 h-full bg-[var(--bg-sidebar)] shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              isMobile
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar
          sidebarCollapsed={!sidebarPinned}
          onToggleSidebar={() => setSidebarPinned(!sidebarPinned)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main
          key={pathname}
          className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto pg-page-enter"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
