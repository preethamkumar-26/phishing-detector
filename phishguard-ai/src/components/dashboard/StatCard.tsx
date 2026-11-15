import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { CountUpNumber } from "@/components/ui/CountUpNumber";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  isPositive?: boolean;
  animateCount?: boolean;
  staggerIndex?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-[var(--primary-accent)]",
  iconBg = "bg-blue-500/10 border-blue-500/20",
  trend,
  isPositive,
  animateCount = false,
  staggerIndex = 0,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-[var(--border-color)] hover:border-[var(--primary-accent)]/50 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[var(--text-muted)] tracking-wide uppercase">
                {title}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Demo
              </span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)] tracking-tight">
              {animateCount ? (
                <CountUpNumber
                  value={value}
                  delay={staggerIndex * 80}
                  duration={1050}
                />
              ) : (
                value
              )}
            </div>
          </div>
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
              iconBg
            )}
          >
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>

        {subtitle && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{subtitle}</span>
            {trend && (
              <span
                className={cn(
                  "font-medium text-[11px] font-mono",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}
              >
                {trend}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
