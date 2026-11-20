"use client";

import React, { useState } from "react";
import { User, LogOut, ShieldCheck, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function ProfileSummaryCard() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
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

  return (
    <>
      <div className="w-full xl:w-72 shrink-0 space-y-4">
        {/* Profile Card from Sketch */}
        <Card phase={5} className="p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Account Profile
            </span>
          </div>

          <div className="pt-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-[var(--primary-accent)] via-[#6366F1] to-[var(--secondary-accent)] flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-900/30 ring-4 ring-[var(--bg-elevated)]">
              {userInitials ? userInitials : <User className="w-8 h-8 text-white/90" />}
            </div>

            <div className="mt-3">
              <div className="text-sm font-bold text-[var(--text-primary)]">{user?.name}</div>
              {user?.designation ? (
                <div className="text-xs text-[var(--text-muted)]">
                  {user.designation}
                </div>
              ) : null}
            </div>

            <div className="w-full mt-4 pt-3 border-t border-[var(--border-color)]/70 space-y-2 text-left text-xs">
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Email
                </span>
                <span className="text-[var(--text-primary)] font-mono text-[11px] truncate max-w-[140px]">
                  {user?.email}
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--primary-accent)]" /> Plan Tier
                </span>
                <span className="text-[var(--primary-accent)] font-medium text-[11px]">
                  Research Prototype
                </span>
              </div>
              <div className="flex items-center justify-between text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[var(--secondary-accent)]" /> API Limits
                </span>
                <span className="text-[var(--text-primary)] text-[11px]">
                  Non-metered
                </span>
              </div>
            </div>

            <div className="w-full mt-5 pt-3 border-t border-[var(--border-color)] flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center text-xs"
                onClick={() => router.push("/account")}
              >
                <User className="w-3.5 h-3.5" />
                Manage Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  setSignOutError("");
                  setSignOutOpen(true);
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Model Info Widget */}
        <Card phase={6} className="p-4 space-y-2 text-xs shadow-sm">
          <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
            <span>Inference Model</span>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              Model ON
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            PAHF-Net: Availability-Gated Hierarchical Fusion (DeBERTa-v3 256d + 3×32d) with Class-Conditional DANN.
          </div>
          <div className="pt-2 text-[10px] text-[var(--text-muted)]/70 flex items-center justify-between">
            <span>Latency: ~42ms</span>
            <span>Seed: 42</span>
          </div>
        </Card>
      </div>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogHeader>
          <DialogTitle>Sign Out</DialogTitle>
          <DialogDescription>
            Sign out of your PhishIntel account on this browser.
          </DialogDescription>
        </DialogHeader>
        {signOutError && <p role="alert" className="mt-4 text-xs text-red-500">{signOutError}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSignOutOpen(false)}>
            Stay Here
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              try {
                setSignOutOpen(false);
                await signOut();
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
