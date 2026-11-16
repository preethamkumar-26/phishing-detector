import { ScanResult, ScanRecord, PredictionType, EvidenceItem } from "@/types/scan";
import { DEMO_RECENT_SCANS } from "@/data/demo-data";

// In-memory session store initialized with demo records
let sessionScans: ScanRecord[] = [...DEMO_RECENT_SCANS];

const FASTAPI_BASE_URL =
  process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";

export interface ScanInputPayload {
  content?: string;
  body?: string;
  subject?: string;
  sender?: string;
  headers?: Record<string, string>;
}

export interface AnalyzeEmailInput {
  subject?: string;
  sender?: string;
  body: string;
}

interface FastAPIAnalysisResponse {
  scan_id: string;
  scanId: string;
  timestamp: string;
  is_phishing: boolean;
  classification: "legitimate" | "suspicious" | "phishing";
  confidence_score: number;
  confidenceScore: number;
  indicators: Array<{
    title: string;
    description: string;
    severity: string;
  }>;
  explainability: {
    summary: string;
  };
  model_metadata: {
    model_name: string;
    modelName: string;
  };
  modelMetadata: {
    model_name: string;
    modelName: string;
  };
  processing_time_ms: number;
  processingTimeMs: number;
}

function getEvidenceSeverity(severity: string): EvidenceItem["severity"] {
  switch (severity) {
    case "critical":
    case "high":
    case "medium":
    case "low":
      return severity;
    default:
      return "medium";
  }
}

export async function analyzeEmailWithBackend(
  payload: ScanInputPayload
): Promise<FastAPIAnalysisResponse> {
  const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: payload.content ?? payload.body ?? "",
      subject: payload.subject ?? "",
      sender: payload.sender ?? "",
      headers: payload.headers ?? {},
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Failed to analyze email via PhishGuard FastAPI Backend"
    );
  }

  return data;
}

/**
 * Analyzes an email using the PhishGuard FastAPI backend.
 */
export async function analyzeEmail(input: AnalyzeEmailInput): Promise<ScanResult> {
  const data = await analyzeEmailWithBackend({
    body: input.body,
    subject: input.subject,
    sender: input.sender,
  });

  const prediction: PredictionType =
    data.classification === "suspicious"
      ? "needs_review"
      : data.classification === "phishing" || data.is_phishing
        ? "phishing"
        : "safe";
  const modelMetadata = data.model_metadata || data.modelMetadata;
  const confidence = (data.confidence_score ?? data.confidenceScore) * 100;
  const evidence: EvidenceItem[] = data.indicators.map((indicator) => ({
    text: indicator.title,
    reason: indicator.description,
    severity: getEvidenceSeverity(indicator.severity),
  }));

  const result: ScanResult = {
    scanId: data.scan_id || data.scanId,
    prediction,
    confidence,
    summary: data.explainability.summary,
    evidence,
    modelVersion: modelMetadata.model_name || modelMetadata.modelName,
    processingTimeMs: data.processing_time_ms ?? data.processingTimeMs,
    isDemo: false,
    timestamp: data.timestamp,
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
    modelVersion: result.modelVersion || "PhishGuard-5BF-ResNet-Demo-v1.0",
    isDemo: result.isDemo,
    bodySnippet: result.body?.slice(0, 120) || "",
    evidenceCount: result.evidence.length,
    evidence: result.evidence,
  };

  // Prepend to session history
  sessionScans = [record, ...sessionScans];

  // Async record scan in backend account activity
  try {
    const userEmail = typeof window !== "undefined" ? window.localStorage.getItem("phishguard-session") : null;
    fetch("/api/account/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userEmail ? { "x-user-email": userEmail } : {}),
      },
      body: JSON.stringify({
        scanId: result.scanId,
        subject: result.subject,
        prediction: result.prediction,
        confidence: result.confidence,
      }),
    }).catch(() => {});
  } catch {}

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

