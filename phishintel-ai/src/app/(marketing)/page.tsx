"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LandingPage } from "@/components/marketing/LandingPage";

export default function HomePage() {
  const { status } = useAuth();
  const router = useRouter();

  // Returning authenticated users bypass the public landing page and resume the dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return <LandingPage />;
}
