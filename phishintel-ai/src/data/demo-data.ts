import type { ScanRecord } from "@/types/scan";

export const SAMPLE_PHISHING_EMAIL = {
  subject: "Urgent: Verify your account information",
  sender: "security@paypaI-support.example",
  body: "Your account will be suspended unless you verify your information immediately. Follow the link in this message to restore access.",
};

export const SAMPLE_SAFE_EMAIL = {
  subject: "November project status update",
  sender: "alex.morgan@northstar.example",
  body: "Hi team, attached is the project status update for our review this afternoon. Please send any questions before the meeting.",
};

export const DEMO_RECENT_SCANS: ScanRecord[] = [
  {
    id: "demo-scan-001",
    subject: "Urgent: Verify your account information",
    sender: "security@paypaI-support.example",
    prediction: "phishing",
    confidence: 98.7,
    riskScore: 96,
    pPhish: 0.987,
    timestamp: "2026-11-18T14:32:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: "Your account will be suspended unless you verify your information immediately.",
    evidenceCount: 2,
    evidence: [
      {
        text: "Urgent account verification",
        reason: "The message uses an urgent threat to pressure the recipient.",
        severity: "high",
      },
      {
        text: "Lookalike sender domain",
        reason: "The sender address imitates a trusted service.",
        severity: "critical",
      },
    ],
  },
  {
    id: "demo-scan-002",
    subject: "November project status update",
    sender: "alex.morgan@northstar.example",
    prediction: "safe",
    confidence: 96.2,
    riskScore: 4,
    pPhish: 0.038,
    timestamp: "2026-11-18T13:10:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: "Hi team, attached is the project status update for our review this afternoon.",
    evidenceCount: 0,
    evidence: [],
  },
  {
    id: "demo-scan-003",
    subject: "Invoice payment overdue",
    sender: "billing@acme-invoices.example",
    prediction: "phishing",
    confidence: 94.1,
    riskScore: 89,
    pPhish: 0.941,
    timestamp: "2026-11-18T11:45:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: "Please open the attached invoice and submit payment today to avoid a late fee.",
    evidenceCount: 2,
    evidence: [
      {
        text: "Unexpected payment request",
        reason: "The message requests urgent payment for an unsolicited invoice.",
        severity: "high",
      },
      {
        text: "Suspicious attachment",
        reason: "The message encourages opening an unexpected attachment.",
        severity: "medium",
      },
    ],
  },
  {
    id: "demo-scan-004",
    subject: "Your weekly product newsletter",
    sender: "updates@news.example",
    prediction: "safe",
    confidence: 99.1,
    riskScore: 1,
    pPhish: 0.009,
    timestamp: "2026-11-18T10:20:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: "Here are this week's product updates and highlights from our team.",
    evidenceCount: 0,
    evidence: [],
  },
  {
    id: "demo-scan-005",
    subject: "Shared document requires your review",
    sender: "collaboration@doc-review.example",
    prediction: "needs_review",
    confidence: 73.5,
    riskScore: 58,
    pPhish: 0.612,
    timestamp: "2026-11-18T09:05:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: "A document has been shared with you. Sign in to view the file.",
    evidenceCount: 1,
    evidence: [
      {
        text: "Unverified sign-in link",
        reason: "The message asks the recipient to sign in through an unverified link.",
        severity: "medium",
      },
    ],
  },
  {
    id: "demo-scan-006",
    subject: "Password reset request confirmation",
    sender: "no-reply@accounts.example",
    prediction: "safe",
    confidence: 91.8,
    riskScore: 8,
    pPhish: 0.082,
    timestamp: "2026-11-17T17:40:00.000Z",
    modelVersion: "PAHF-Net",
    isDemo: true,
    bodySnippet: "We received a request to reset your password. If this was not you, no action is needed.",
    evidenceCount: 0,
    evidence: [],
  },
];

export const DEMO_THREAT_DISTRIBUTION = [
  { name: "Phishing", value: 384, color: "#EF4444" },
  { name: "Safe", value: 972, color: "#10B981" },
  { name: "Needs Review", value: 72, color: "#F59E0B" },
];

export const DEMO_SCAN_ACTIVITY = [
  { date: "Nov 12", scans: 142, phishing: 38 },
  { date: "Nov 13", scans: 168, phishing: 45 },
  { date: "Nov 14", scans: 151, phishing: 34 },
  { date: "Nov 15", scans: 193, phishing: 52 },
  { date: "Nov 16", scans: 176, phishing: 41 },
  { date: "Nov 17", scans: 214, phishing: 57 },
  { date: "Nov 18", scans: 184, phishing: 49 },
];
