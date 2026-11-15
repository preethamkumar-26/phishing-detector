"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { ThreatDistributionChart } from "@/components/dashboard/ThreatDistributionChart";
import { ScanActivityChart } from "@/components/dashboard/ScanActivityChart";
import { RecentScansTable } from "@/components/dashboard/RecentScansTable";
import { ProfileSummaryCard } from "@/components/layout/ProfileSummaryCard";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { Button } from "@/components/ui/Button";
import { GlideSelect, GlideSelectOptionItem } from "@/components/ui/GlideSelect";
import { useKpiAnimation } from "@/context/KpiAnimationContext";
import { markDashboardAnimated } from "@/lib/navTracker";
import {
  ScanSearch,
  Mail,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

const DASHBOARD_DATE_OPTIONS: GlideSelectOptionItem[] = [
  { value: "Today", label: "Today", tag: "Live" },
  { value: "Last 7 days", label: "Last 7 days", tag: "7d" },
  { value: "Last 14 days", label: "Last 14 days", tag: "14d" },
  { value: "Last 30 days", label: "Last 30 days", tag: "30d" },
];

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("Last 14 days");
  const { shouldAnimateDashboard, markDashboardAnimated: markContextAnimated } = useKpiAnimation();
  const [shouldAnimate] = useState(() => shouldAnimateDashboard());

  useEffect(() => {
    if (shouldAnimate) {
      markContextAnimated();
      markDashboardAnimated();
    }
  }, [shouldAnimate, markContextAnimated]);

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
        description="Here’s a clear view of recent scans, emerging threats, and activity across your inbox."
      >
        <div className="flex items-center gap-2">
          {/* Date range selector via GlideSelect */}
          <div className="hidden sm:flex items-center">
            <GlideSelect
              options={DASHBOARD_DATE_OPTIONS}
              value={dateRange}
              onChange={(val) => setDateRange(val)}
              ariaLabel="Dashboard date range filter"
              size="md"
              menuWidth={180}
              radius={10}
            />
          </div>

          <Link href="/analyzer" prefetch={true}>
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
              iconColor="text-[var(--primary-accent)]"
              iconBg="bg-blue-500/10 border-blue-500/20"
              trend="+12% this week"
              isPositive={true}
              animateCount={shouldAnimate}
              staggerIndex={0}
            />
            <StatCard
              title="Phishing Detected"
              value="384"
              subtitle="High confidence threats"
              icon={ShieldAlert}
              iconColor="text-red-400"
              iconBg="bg-red-500/10 border-red-500/20"
              trend="26.9% threat rate"
              animateCount={shouldAnimate}
              staggerIndex={1}
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
              animateCount={shouldAnimate}
              staggerIndex={2}
            />
            <StatCard
              title="Needs Review"
              value="72"
              subtitle="Ambiguous / uncertain"
              icon={AlertTriangle}
              iconColor="text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              trend="5.0% queue"
              animateCount={shouldAnimate}
              staggerIndex={3}
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
