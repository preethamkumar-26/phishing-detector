"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { useAuth } from "@/components/auth/AuthProvider";
import { User, Shield, KeyRound, Copy, Check, Lock, Mail, Building } from "lucide-react";

export default function AccountPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const demoApiKey = "pg_live_demo_98f4e271a0b3c4d5e6f7";
  const userInitials = user?.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "U";

  const handleCopyKey = () => {
    setCopyError("");
    if (!navigator.clipboard) {
      setCopyError("Clipboard access is unavailable in this browser.");
      return;
    }
    navigator.clipboard.writeText(demoApiKey).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setCopyError("Unable to copy the API key. Check your browser clipboard permissions."),
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <DemoDataNotice
        message="Client-only account profile — account credentials and session are stored in this browser. This is not a server-verified identity."
        variant="banner"
      />

      <PageHeader
        title="Account & Profile"
        description="User identity, researcher privileges, authentication tokens, and API quotas."
      />

      <div className="space-y-6">
        {/* Profile Card */}
        <Card className="border-[var(--border-color)]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--primary-accent)]" />
              Researcher Profile
            </CardTitle>
            <CardDescription>Primary identity and organizational affiliations</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-[var(--border-color)]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--primary-accent)] via-[#6366F1] to-[var(--primary-accent)] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-violet-900/40">
                {userInitials}
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{user?.name}</h3>
                  <Badge variant="accent" size="sm">Level 3 Access</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Senior Cybersecurity Analyst & Neural NLP Researcher
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {user?.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> CyberSec Intelligence Lab
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] space-y-1">
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">
                  Security Clearance
                </span>
                <span className="font-semibold text-emerald-400">
                  Full Model Inference & Log Inspection
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] space-y-1">
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">
                  Active Session Type
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  Browser-local account session
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Tokens & Integration */}
        <Card className="border-[var(--border-color)]">
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
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Personal Access Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={demoApiKey}
                className="w-full h-10 px-3 font-mono text-xs bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl border border-[var(--border-color)]"
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
            {copyError && <p role="alert" className="text-[11px] text-red-500">{copyError}</p>}
            <p className="text-[11px] text-[var(--text-muted)]">
              Pass this token in HTTP header: <code className="font-mono text-violet-300">Authorization: Bearer pg_live_...</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
