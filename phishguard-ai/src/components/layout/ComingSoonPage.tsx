"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import { DemoDataNotice } from "@/components/ui/DemoDataNotice";

interface ComingSoonPageProps {
  title: string;
  category: string;
  description: string;
  plannedFeatures?: string[];
  ctaHref?: string;
  ctaText?: string;
}

export function ComingSoonPage({
  title,
  category,
  description,
  plannedFeatures,
  ctaHref = "/dashboard",
  ctaText = "Return to Dashboard",
}: ComingSoonPageProps) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
      <DemoDataNotice
        message="Research Prototype Module — In development for subsequent scientific milestone."
        variant="banner"
      />

      <Card className="border-[#273449] bg-[#151E31]/80 backdrop-blur-sm p-8 text-center relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#8B5CF6]/10 blur-3xl pointer-events-none rounded-full" />

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1B2740] border border-[#273449] mb-4 text-[#8B5CF6]">
          <Clock className="w-7 h-7" />
        </div>

        <div className="text-xs uppercase tracking-wider font-semibold text-[#8B5CF6] mb-1">
          {category}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#F3F4F6] mb-3 tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-[#9CA3AF] max-w-xl mx-auto mb-8 leading-relaxed">
          {description}
        </p>

        {plannedFeatures && plannedFeatures.length > 0 && (
          <div className="max-w-md mx-auto text-left bg-[#101729]/70 rounded-xl p-5 border border-[#273449]/70 mb-8 space-y-2.5">
            <div className="text-xs font-bold text-[#F3F4F6] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Planned Deliverables:
            </div>
            {plannedFeatures.map((feat, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#9CA3AF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] mt-1.5 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Link href={ctaHref}>
            <Button variant="primary">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {ctaText}
            </Button>
          </Link>
          <Link href="/analyzer">
            <Button variant="outline">Try Email Analyzer</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

