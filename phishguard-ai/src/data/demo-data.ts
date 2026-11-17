import type { ScanRecord } from "@/types/scan";

export const SAMPLE_PHISHING_EMAIL = {
  subject: "Urgent: Verify your account",
  sender: "security@account-review.example",
  body: "Your account has been temporarily restricted. Review your account status using the link in this message.",
};

export const SAMPLE_SAFE_EMAIL = {
  subject: "Team meeting notes",
  sender: "colleague@example.com",
  body: "Hi team, attached are the notes from our weekly project meeting. See you next week.",
};

export const DEMO_RECENT_SCANS: ScanRecord[] = [
  {
    id: "DEMO-001",
    subject: SAMPLE_PHISHING_EMAIL.subject,
    sender: SAMPLE_PHISHING_EMAIL.sender,
    prediction: "phishing",
    confidence: 96.2,
    timestamp: "2026-11-17T10:00:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: SAMPLE_PHISHING_EMAIL.body,
    evidenceCount: 1,
    evidence: [
      {
        text: "Urgent verification request",
        reason: "The message applies pressure to review account status.",
        severity: "high",
      },
    ],
  },
  {
    id: "DEMO-002",
    subject: SAMPLE_SAFE_EMAIL.subject,
    sender: SAMPLE_SAFE_EMAIL.sender,
    prediction: "safe",
    confidence: 98.1,
    timestamp: "2026-11-16T10:00:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: SAMPLE_SAFE_EMAIL.body,
    evidenceCount: 0,
    evidence: [],
  },
];

export const DEMO_SCAN_ACTIVITY: Array<{
  date: string;
  scans: number;
  phishing: number;
}> = [
  { date: "Nov 11", scans: 74, phishing: 19 },
  { date: "Nov 12", scans: 81, phishing: 22 },
  { date: "Nov 13", scans: 69, phishing: 18 },
  { date: "Nov 14", scans: 92, phishing: 26 },
  { date: "Nov 15", scans: 88, phishing: 23 },
  { date: "Nov 16", scans: 104, phishing: 29 },
  { date: "Nov 17", scans: 97, phishing: 25 },
];

export const DEMO_THREAT_DISTRIBUTION: Array<{
  name: string;
  value: number;
  color: string;
}> = [
  { name: "Phishing", value: 384, color: "#ef4444" },
  { name: "Safe", value: 972, color: "#10b981" },
  { name: "Review", value: 72, color: "#f59e0b" },
];
