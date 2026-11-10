"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";
import { Sliders, Server, Bell, Shield, Save, Check } from "lucide-react";

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(0.65);
  const [apiUrl, setApiUrl] = useState("http://localhost:8000/api/v1/predict");
  const [notifyOnPhishing, setNotifyOnPhishing] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <DemoDataNotice
        message="System Settings Shell — Preferences configured here adjust the client-side prototype behavior."
        variant="banner"
      />

      <PageHeader
        title="Settings & System Configuration"
        description="Configure backend inference connection parameters, sensitivity thresholds, and alert preferences."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend API Connection Card */}
        <Card className="border-[#273449]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Server className="w-4 h-4 text-[#8B5CF6]" />
              Inference Service Connection
            </CardTitle>
            <CardDescription>
              Target endpoint for the Python/FastAPI ML model serving layer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                Model Inference Endpoint URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8000/api/v1/predict"
                className="w-full h-10 px-3 font-mono text-xs bg-[#101729] text-[#F3F4F6] rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6]"
              />
              <p className="text-[11px] text-[#9CA3AF] mt-1.5">
                When the Python FastAPI service is launched, point this URL to your running instance to transition from demo heuristic to live inference.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Model Threshold & Sensitivity */}
        <Card className="border-[#273449]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#3B82F6]" />
              Threat Decision Threshold
            </CardTitle>
            <CardDescription>
              Probability cutoff above which an email is classified as Phishing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#F3F4F6]">Classification Threshold (τ):</span>
                <span className="font-mono font-bold text-violet-300 text-sm">
                  {threshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-[#101729] rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
              />
              <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                <span>0.30 (High Sensitivity / More Warnings)</span>
                <span>0.50 (Balanced)</span>
                <span>0.90 (Conservative / Fewer False Alarms)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Notifications */}
        <Card className="border-[#273449]">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Notification & Alert Policies
            </CardTitle>
            <CardDescription>
              Browser alerts and security summary triggers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-[#101729] border border-[#273449] cursor-pointer">
              <div>
                <span className="font-semibold text-[#F3F4F6] block">
                  Notify on Critical Urgency Flags
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  Surface an in-app banner whenever a scan confidence exceeds 95%
                </span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnPhishing}
                onChange={(e) => setNotifyOnPhishing(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-[#8B5CF6] focus:ring-[#8B5CF6] bg-slate-900"
              />
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          )}
          <Button type="submit" variant="primary" size="md">
            <Save className="w-4 h-4 mr-1.5" />
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}

