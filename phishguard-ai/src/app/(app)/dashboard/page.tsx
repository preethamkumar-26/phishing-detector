"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ThreatDistributionChart } from "@/components/dashboard/ThreatDistributionChart";
import { ScanActivityChart } from "@/components/dashboard/ScanActivityChart";
import { RecentScansTable } from "@/components/dashboard/RecentScansTable";
import { ProfileSummaryCard } from "@/components/layout/ProfileSummaryCard";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { Button } from "@/components/ui/Button";
import {
  ScanSearch,
  Mail,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("Last 14 days");

  return (
    <div className="space-y-6">
      {/* Demo Notice Banner */}
      <DemoDataNotice
        message="Demo Data Mode — All statistical metrics, scan volumes, and threat counts represent simulated research records."
        variant="banner"
      />

      {/* Dashboard Page Header */}
      <PageHeader
        title="Dashboard"
        description="Real-time threat monitoring and heuristic neural inference telemetry."
      >
        <div className="flex items-center gap-2">
          {/* Optional date range selector */}
          <div className="relative hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#151E31] rounded-xl border border-[#273449] text-xs text-[#9CA3AF]">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-[#F3F4F6] focus:outline-none cursor-pointer"
            >
              <option value="Today" className="bg-[#151E31]">Today</option>
              <option value="Last 7 days" className="bg-[#151E31]">Last 7 days</option>
              <option value="Last 14 days" className="bg-[#151E31]">Last 14 days</option>
              <option value="Last 30 days" className="bg-[#151E31]">Last 30 days</option>
            </select>
          </div>

          <Link href="/analyzer">
            <Button variant="primary" size="md">
              <ScanSearch className="w-4 h-4 mr-1.5" />
              New Scan
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Main Grid: Left/Center Analytics & Right Profile Panel */}
      <div className="flex flex-col xl:flex-row items-start gap-6">
        {/* Left/Center Main Content */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Emails Scanned"
              value="1,428"
              subtitle="All evaluated samples"
              icon={Mail}
              iconColor="text-violet-400"
              iconBg="bg-violet-500/10 border-violet-500/20"
              trend="+12% this week"
              isPositive={true}
            />
            <StatCard
              title="Phishing Detected"
              value="384"
              subtitle="High confidence threats"
              icon={ShieldAlert}
              iconColor="text-red-400"
              iconBg="bg-red-500/10 border-red-500/20"
              trend="26.9% threat rate"
            />
            <StatCard
              title="Safe Emails"
              value="972"
              subtitle="Legitimate messages"
              icon={ShieldCheck}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-500/10 border-emerald-500/20"
              trend="68.1% of traffic"
              isPositive={true}
            />
            <StatCard
              title="Needs Review"
              value="72"
              subtitle="Ambiguous / uncertain"
              icon={AlertTriangle}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              trend="5.0% queue"
            />
          </div>

          {/* Visualizations: 2 Columns on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <ThreatDistributionChart />
            </div>
            <div className="lg:col-span-7">
              <ScanActivityChart />
            </div>
          </div>

          {/* Sketch-specific Workspace: Recent Email Scans */}
          <div>
            <RecentScansTable />
          </div>
        </div>

        {/* Right-Side Desktop Profile Panel (From hand-drawn sketch) */}
        <div className="w-full xl:w-auto xl:sticky xl:top-24">
          <ProfileSummaryCard />
        </div>
      </div>
    </div>
  );
}

