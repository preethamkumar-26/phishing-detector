"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { User, Shield, KeyRound, Copy, Check, Lock, Mail, Building } from "lucide-react";

export default function AccountPage() {
  const [copied, setCopied] = useState(false);
  const demoApiKey = "pg_live_demo_98f4e271a0b3c4d5e6f7";

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(demoApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <DemoDataNotice
        message="Demo Account Profile — Simulates authenticated security researcher session. Authentication credentials will connect to JWT/OAuth2 backend."
        variant="banner"
      />

      <PageHeader
        title="Account & Profile"
        description="User identity, researcher privileges, authentication tokens, and API quotas."
      />

      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="border-[#273449]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-[#8B5CF6]" />
              Researcher Profile
            </CardTitle>
            <CardDescription>Primary identity and organizational affiliations</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-[#273449]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] via-[#6366F1] to-[#3B82F6] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-900/40">
                AM
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#F3F4F6]">Alex Morgan</h3>
                  <Badge variant="accent" size="sm">Level 3 Access</Badge>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Senior Cybersecurity Analyst & Neural NLP Researcher
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> alex.morgan@cyber.io
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> CyberSec Intelligence Lab
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#101729] rounded-xl border border-[#273449] space-y-1">
                <span className="text-[#9CA3AF] text-[10px] uppercase font-bold block">
                  Security Clearance
                </span>
                <span className="font-semibold text-emerald-400">
                  Full Model Inference & Log Inspection
                </span>
              </div>
              <div className="p-3 bg-[#101729] rounded-xl border border-[#273449] space-y-1">
                <span className="text-[#9CA3AF] text-[10px] uppercase font-bold block">
                  Active Session Type
                </span>
                <span className="font-semibold text-[#F3F4F6]">
                  Local Frontend Prototype (Browser Memory)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Tokens & Integration */}
        <Card className="border-[#273449]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              API Key Management (Demo)
            </CardTitle>
            <CardDescription>
              Use this key to authorize command-line or external service requests
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Personal Access Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={demoApiKey}
                className="w-full h-10 px-3 font-mono text-xs bg-[#101729] text-[#F3F4F6] rounded-xl border border-[#273449]"
              />
              <Button
                variant="outline"
                size="md"
                onClick={handleCopyKey}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" /> Copy Key
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              Pass this token in HTTP header: <code className="font-mono text-violet-300">Authorization: Bearer pg_live_...</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

