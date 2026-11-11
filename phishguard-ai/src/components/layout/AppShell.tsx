"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, error } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auto-collapse sidebar on tablet screens (< 1024px)
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [router, status]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block shrink-0 sticky top-0 h-screen">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Mobile Slide-over Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-[var(--bg-surface)] shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              collapsed={false}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
