import { ScanResult, ScanRecord, PredictionType, EvidenceItem } from "@/types/scan";
import { DEMO_RECENT_SCANS } from "@/data/demo-data";

// In-memory session store initialized with demo records
let sessionScans: ScanRecord[] = [...DEMO_RECENT_SCANS];

export interface AnalyzeEmailInput {
  subject?: string;
  sender?: string;
  body: string;
}

const PHISHING_INDICATOR_PATTERNS = [
  { regex: /urgent|immediately|within \d+ hours|action required|expire/i, reason: "Artificial urgency language", severity: "high" as const },
  { regex: /re-authenticate|verify your (identity|password|account)|confirm your credentials|sign in to|login/i, reason: "Credential harvesting prompt", severity: "critical" as const },
  { regex: /suspended|deactivated|terminated|disabled|legal action|penalty/i, reason: "Intimidation or consequence threat", severity: "high" as const },
  { regex: /https?:\/\/[^\s]+/i, reason: "Embedded external hyperlink or IP address destination", severity: "medium" as const },
  { regex: /wire transfer|bank details|remittance|invoice #|gift card/i, reason: "Financial transaction request", severity: "medium" as const },
  { regex: /unauthorized login|security alert|incident response/i, reason: "Security impersonation / spoofing context", severity: "medium" as const },
];

/**
 * Analyzes an email using the prototype inference service.
 * In this temporary milestone, it uses deterministic heuristic analysis with typed mock output,
 * labeled clearly as a demo result. It can later be replaced with `fetch('/api/v1/predict')`.
 */
export async function analyzeEmail(input: AnalyzeEmailInput): Promise<ScanResult> {
  const startTime = performance.now();
  
  // Simulate network & neural inference latency (500ms - 800ms)
  await new Promise((resolve) => setTimeout(resolve, 650));

  const textToScan = `${input.subject || ""} ${input.body}`.trim();
  const lower = textToScan.toLowerCase();

  const evidence: EvidenceItem[] = [];

  for (const pattern of PHISHING_INDICATOR_PATTERNS) {
    const match = textToScan.match(pattern.regex);
    if (match) {
      evidence.push({
        text: match[0],
        reason: pattern.reason,
        severity: pattern.severity,
      });
    }
  }

  let prediction: PredictionType = "safe";
  let confidence = 98.4;
  let summary = "No malicious indicators or credential-harvesting patterns were identified in the text content.";

  if (evidence.some(e => e.severity === "critical") || evidence.length >= 3) {
    prediction = "phishing";
    confidence = Math.min(99.2, 88.0 + evidence.length * 2.5);
    summary = `High threat probability. Detected ${evidence.length} phishing indicators including credential solicitation and severe urgency tactics.`;
  } else if (evidence.length >= 1) {
    prediction = "needs_review";
    confidence = 64.8;
    summary = `Suspicious elements detected (${evidence.length} indicators). Requires secondary human review or corroborating sender metadata.`;
  }

  const processingTimeMs = Math.round(performance.now() - startTime);

  const scanId = `SCN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const result: ScanResult = {
    scanId,
    prediction,
    confidence,
    summary,
    evidence,
    modelVersion: "BERT-MHA-CNN-GRU-Demo-v0.1",
    processingTimeMs,
    isDemo: true,
    timestamp: new Date().toISOString(),
    subject: input.subject || (input.body.slice(0, 40) + "…"),
    sender: input.sender || "Unspecified",
    body: input.body,
  };

  return result;
}

/**
 * Saves a scan result to the local session history
 */
export function saveScanToHistory(result: ScanResult): ScanRecord {
  const record: ScanRecord = {
    id: result.scanId,
    subject: result.subject || "Email Analysis",
    sender: result.sender,
    prediction: result.prediction,
    confidence: result.confidence || 95.0,
    timestamp: result.timestamp || new Date().toISOString(),
    modelVersion: result.modelVersion || "BERT-MHA-CNN-GRU-Demo-v0.1",
    isDemo: true,
    bodySnippet: result.body?.slice(0, 120) || "",
    evidenceCount: result.evidence.length,
    evidence: result.evidence,
  };

  // Prepend to session history
  sessionScans = [record, ...sessionScans];
  return record;
}

/**
 * Gets all scans for history and dashboard tables
 */
export function getScanHistory(): ScanRecord[] {
  return [...sessionScans];
}

/**
 * Delete a scan record by ID
 */
export function deleteScanRecord(id: string): void {
  sessionScans = sessionScans.filter((s) => s.id !== id);
}

