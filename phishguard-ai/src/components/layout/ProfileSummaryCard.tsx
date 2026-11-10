"use client";

import React, { useState } from "react";
import { User, LogOut, ShieldCheck, Mail, KeyRound, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { useRouter } from "next/navigation";

export function ProfileSummaryCard() {
  const router = useRouter();
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <>
      <div className="w-full xl:w-72 shrink-0 space-y-4">
        {/* Profile Card from Sketch */}
        <div className="rounded-2xl border border-[#273449] bg-[#151E31] p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-[#273449]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Account Profile
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>

          <div className="pt-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] via-[#6366F1] to-[#3B82F6] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-900/40 ring-4 ring-[#101729]">
              AM
            </div>

            <div className="mt-3">
              <div className="text-sm font-bold text-[#F3F4F6]">Alex Morgan</div>
              <div className="text-xs text-[#9CA3AF]">Security Analyst & ML Researcher</div>
            </div>

            <div className="w-full mt-4 pt-3 border-t border-[#273449]/70 space-y-2 text-left text-xs">
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                </span>
                <span className="text-[#F3F4F6] font-mono text-[11px] truncate max-w-[140px]">
                  alex.morgan@cyber.io
                </span>
              </div>
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-400" /> Access Tier
                </span>
                <span className="text-[#8B5CF6] font-medium text-[11px]">
                  Level 3 (Full Lab)
                </span>
              </div>
              <div className="flex items-center justify-between text-[#9CA3AF]">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" /> API Quota
                </span>
                <span className="text-[#F3F4F6] font-mono text-[11px]">
                  5,000 req/day
                </span>
              </div>
            </div>

            <div className="w-full mt-5 pt-3 border-t border-[#273449] flex flex-col gap-2">
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
                className="w-full justify-center text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => setSignOutOpen(true)}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Model Info Widget */}
        <div className="rounded-2xl border border-[#273449] bg-[#101729]/80 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-[#F3F4F6]">
            <span>Inference Model</span>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
              Model ON
            </span>
          </div>
          <div className="text-[11px] text-[#9CA3AF]">
            BERT-Base + Multi-Head Attention + CNN-1D + Bi-GRU tuned via Mountain Gazelle Optimizer (MGO).
          </div>
          <div className="pt-2 text-[10px] text-[#9CA3AF]/70 flex items-center justify-between">
            <span>Latency: ~42ms</span>
            <span>Seed: 42</span>
          </div>
        </div>
      </div>

      {/* Sign Out Modal */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogHeader>
          <DialogTitle>Sign Out</DialogTitle>
          <DialogDescription>
            You are using the PhishGuard AI frontend prototype.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3 text-xs text-[#9CA3AF] bg-[#101729] p-3 rounded-xl border border-[#273449] my-2">
          Demo session will end and navigate back to the product landing page.
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSignOutOpen(false)}>
            Stay Here
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setSignOutOpen(false);
              router.push("/");
            }}
          >
            Sign out
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

