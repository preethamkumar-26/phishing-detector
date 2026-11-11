import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "threat" | "safe" | "warning" | "accent" | "neutral" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    threat: "bg-red-500/15 text-red-400 border border-red-500/30",
    safe: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    accent: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    neutral: "bg-slate-800 text-slate-300 border border-slate-700",
    outline: "border border-[var(--border-color)] text-slate-300 bg-transparent",
  };

  const sizeStyles = {
    sm: "text-xs px-2 py-0.5 rounded-full font-medium",
    md: "text-xs px-2.5 py-1 rounded-md font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function ClassificationBadge({
  prediction,
  size = "md",
  className,
}: {
  prediction: "phishing" | "safe" | "needs_review";
  size?: "sm" | "md";
  className?: string;
}) {
  if (prediction === "phishing") {
    return (
      <Badge variant="threat" size={size} className={cn("font-semibold tracking-wide uppercase", className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Phishing
      </Badge>
    );
  }
  if (prediction === "safe") {
    return (
      <Badge variant="safe" size={size} className={cn("font-semibold tracking-wide uppercase", className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Safe
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size={size} className={cn("font-semibold tracking-wide uppercase", className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Needs Review
    </Badge>
  );
}

