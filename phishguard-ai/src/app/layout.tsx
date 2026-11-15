import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGateProvider } from "@/components/auth/AuthGateProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhishGuard AI — Explainable AI Phishing Email Detection",
  description: "Advanced explainable AI email security platform featuring 5-branch feature fusion (836-d), custom residual representation network, and validation-calibrated threshold decision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
  const savedTheme = localStorage.getItem("phishguard-theme");
  document.documentElement.classList.toggle("dark", savedTheme !== "light");
} catch {
  document.documentElement.classList.add("dark");
}`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <AuthGateProvider>{children}</AuthGateProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
