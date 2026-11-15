import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiAnimationProvider } from "@/context/KpiAnimationContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <KpiAnimationProvider>
      <AppShell>{children}</AppShell>
    </KpiAnimationProvider>
  );
}
