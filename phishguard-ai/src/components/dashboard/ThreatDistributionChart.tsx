"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { DEMO_THREAT_DISTRIBUTION } from "@/data/demo-data";
import { ShieldAlert, ShieldCheck, HelpCircle } from "lucide-react";

export function ThreatDistributionChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const total = DEMO_THREAT_DISTRIBUTION.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <Card className="h-full flex flex-col border-[var(--border-color)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Threat Distribution</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Demo data
              </span>
            </CardTitle>
            <CardDescription>
              Proportion of evaluated emails across classification categories
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-2">
        <div className="h-48 w-full relative">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DEMO_THREAT_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {DEMO_THREAT_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const pct = ((data.value / total) * 100).toFixed(1);
                      return (
                        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-2.5 shadow-xl text-xs">
                          <div className="font-bold text-[var(--text-primary)]">{data.name}</div>
                          <div className="text-[var(--text-muted)] mt-0.5">
                            {data.value.toLocaleString()} emails ({pct}%)
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-[var(--text-muted)]">
              Loading chart...
            </div>
          )}

          {/* Central count badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-extrabold text-[var(--text-primary)]">{total.toLocaleString()}</span>
            <span className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">Evaluated</span>
          </div>
        </div>

        {/* Custom Legend */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border-color)]/70 text-xs">
          <div className="p-2 rounded-xl bg-[var(--bg-surface)]/40 border border-[var(--border-color)]/40 text-center">
            <div className="flex items-center justify-center gap-1.5 text-red-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Phishing
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">384</div>
            <div className="text-[10px] text-[var(--text-muted)]">26.9%</div>
          </div>

          <div className="p-2 rounded-xl bg-[var(--bg-surface)]/40 border border-[var(--border-color)]/40 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Safe
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">972</div>
            <div className="text-[10px] text-[var(--text-muted)]">68.1%</div>
          </div>

          <div className="p-2 rounded-xl bg-[var(--bg-surface)]/40 border border-[var(--border-color)]/40 text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Review
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">72</div>
            <div className="text-[10px] text-[var(--text-muted)]">5.0%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
