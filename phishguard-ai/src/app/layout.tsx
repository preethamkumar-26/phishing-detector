import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhishGuard AI — Explainable AI Phishing Email Detection",
  description: "Advanced explainable AI-based email security analysis platform using hybrid BERT, Multi-Head Attention, and 1D-CNN / Bi-GRU sequence architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
  const savedTheme = localStorage.getItem("phishguard-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", savedTheme === "dark" || (savedTheme !== "light" && prefersDark));
} catch {
  document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
}`,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${jetBrainsMono.variable} min-h-full antialiased`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
