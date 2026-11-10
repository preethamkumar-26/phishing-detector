import React from "react";
import { cn } from "@/lib/utils";
import { Info, AlertCircle } from "lucide-react";

interface DemoDataNoticeProps {
  message?: string;
  variant?: "banner" | "badge" | "subtle";
  className?: string;
}

export function DemoDataNotice({
  message = "Demo Data & Prototype UI — Simulated metrics for scientific review; not connected to live production backend.",
  variant = "subtle",
  className,
}: DemoDataNoticeProps) {
  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30",
          className
        )}
      >
        <AlertCircle className="w-3 h-3" />
        Demo Data
      </span>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-sm",
          className
        )}
      >
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 font-medium">{message}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] bg-[#101729] px-2.5 py-1 rounded-lg border border-[#273449]",
        className
      )}
    >
      <Info className="w-3.5 h-3.5 text-amber-400" />
      <span>{message}</span>
    </div>
  );
}

