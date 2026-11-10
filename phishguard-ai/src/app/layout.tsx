import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  description: "Advanced explainable AI-based email security analysis platform using hybrid BERT, Multi-Head Attention, and 1D-CNN / Bi-GRU sequence architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-[#090D18] text-[#F3F4F6] antialiased selection:bg-[#8B5CF6]/30 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
