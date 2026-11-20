import React from "react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGateProvider } from "@/components/auth/AuthGateProvider";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGateProvider>{children}</AuthGateProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
