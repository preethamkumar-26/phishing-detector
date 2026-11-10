"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { DEMO_SCAN_ACTIVITY } from "@/data/demo-data";

export function ScanActivityChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Card className="h-full flex flex-col border-[#273449]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Scan Activity Trends</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Demo data
              </span>
            </CardTitle>
            <CardDescription>
              Daily email analysis volume and threat breakdown
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              Total Scans
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Threats
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-4">
        <div className="h-56 w-full">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEMO_SCAN_ACTIVITY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPhishing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#273449" vertical={false} opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#273449" }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#273449" }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl bg-[#151E31] border border-[#273449] p-3 shadow-2xl text-xs space-y-1">
                          <div className="font-bold text-[#F3F4F6] pb-1 border-b border-[#273449]">
                            {label}
                          </div>
                          <div className="text-violet-400 font-medium flex justify-between gap-4">
                            <span>Total Volume:</span>
                            <span className="font-bold">{payload[0]?.value}</span>
                          </div>
                          <div className="text-red-400 font-medium flex justify-between gap-4">
                            <span>Phishing:</span>
                            <span className="font-bold">{payload[1]?.value}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="phishing"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPhishing)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-[#9CA3AF]">
              Loading activity...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

