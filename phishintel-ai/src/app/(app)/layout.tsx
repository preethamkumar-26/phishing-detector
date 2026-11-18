import React from "react";
import { PhishGuardProvider } from "@/context/PhishGuardContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PhishGuardProvider>
        <AppShell>{children}</AppShell>
      </PhishGuardProvider>
    </AuthProvider>
  );
}
