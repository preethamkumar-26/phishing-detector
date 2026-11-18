import React from "react";
import { cookies } from "next/headers";
import { PhishGuardProvider } from "@/context/PhishGuardContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { getUserFromSessionCookie } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let initialUser: { name: string; email: string; designation?: string } | null = null;

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("phishintel_session")?.value;
    const dbUser = getUserFromSessionCookie(sessionToken);
    if (dbUser) {
      initialUser = {
        name: dbUser.name,
        email: dbUser.email,
        designation: dbUser.designation || undefined,
      };
    }
  } catch {}

  return (
    <AuthProvider initialUser={initialUser}>
      <PhishGuardProvider initialUser={initialUser}>
        <AppShell>{children}</AppShell>
      </PhishGuardProvider>
    </AuthProvider>
  );
}
