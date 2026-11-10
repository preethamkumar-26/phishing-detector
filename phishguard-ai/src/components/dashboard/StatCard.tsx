import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  trend?: string;
  isPositive?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-[#8B5CF6]",
  iconBg = "bg-violet-500/10 border-violet-500/20",
  trend,
  isPositive,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-[#273449] hover:border-slate-600 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[#9CA3AF] tracking-wide">
                {title}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/90 border border-amber-500/20">
                Demo
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-extrabold text-[#F3F4F6] tracking-tight">
              {value}
            </div>
          </div>
          <div
            className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0",
              iconBg
            )}
          >
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>

        {subtitle && (
          <div className="mt-3 pt-3 border-t border-[#273449]/60 flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>{subtitle}</span>
            {trend && (
              <span
                className={cn(
                  "font-medium text-[11px]",
                  isPositive ? "text-emerald-400" : "text-amber-400"
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

