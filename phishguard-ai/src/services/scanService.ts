import { ScanResult, ScanRecord, PredictionType, EvidenceItem } from "@/types/scan";
import { DEMO_RECENT_SCANS } from "@/data/demo-data";

// In-memory session store initialized with demo records
let sessionScans: ScanRecord[] = [...DEMO_RECENT_SCANS];

const FASTAPI_BASE_URL =
  (process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
export const FASTAPI_ANALYZE_URL = `${FASTAPI_BASE_URL}/api/v1/analyze`;

export interface ScanInputPayload {
  content?: string;
  body?: string;
  text?: string;
  emailText?: string;
  subject?: string;
  sender?: string;
  from?: string;
  reply_to?: string;
  replyTo?: string;
  urls?: string[] | string;
  headers?: Record<string, string> | string;
}

export interface AnalyzeEmailInput {
  subject?: string;
  sender?: string;
  body: string;
}

export interface FastAPIAnalysisResponse {
  success: boolean;
  scan_id: string;
  is_phishing: boolean;
  verdict: string;
  confidence_score: number;
  risk_score: number;
  p_phish: number;
  indicators: Array<{
    id?: string;
    category?: string;
    score_impact?: number;
    title?: string;
    description?: string;
    severity?: string;
  }>;
  explainability: {
    summary?: string;
  };
}

function isFastAPIAnalysisResponse(value: unknown): value is FastAPIAnalysisResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const indicatorsValid =
    Array.isArray(data.indicators) &&
    data.indicators.every(
      (indicator) =>
        !!indicator &&
        typeof indicator === "object" &&
        (!("title" in indicator) || typeof indicator.title === "string") &&
        (!("description" in indicator) || typeof indicator.description === "string") &&
        (!("severity" in indicator) || typeof indicator.severity === "string") &&
        (!("category" in indicator) || typeof indicator.category === "string") &&
        (!("score_impact" in indicator) || typeof indicator.score_impact === "number")
    );

  return (
    data.success === true &&
    typeof data.scan_id === "string" &&
    typeof data.is_phishing === "boolean" &&
    typeof data.verdict === "string" &&
    typeof data.confidence_score === "number" &&
    data.confidence_score >= 0 &&
    data.confidence_score <= 1 &&
    typeof data.risk_score === "number" &&
    data.risk_score >= 0 &&
    data.risk_score <= 100 &&
    typeof data.p_phish === "number" &&
    data.p_phish >= 0 &&
    data.p_phish <= 1 &&
    indicatorsValid &&
    !!data.explainability &&
    typeof data.explainability === "object"
  );
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
  payload: ScanInputPayload,
  endpoint = FASTAPI_ANALYZE_URL,
  signal?: AbortSignal
): Promise<FastAPIAnalysisResponse> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      content:
        payload.content ??
        payload.body ??
        payload.text ??
        payload.emailText ??
        "",
      subject: payload.subject ?? "",
      sender: payload.sender ?? payload.from ?? "",
      reply_to: payload.reply_to ?? payload.replyTo ?? "",
      urls: payload.urls ?? [],
      headers: payload.headers ?? {},
    }),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? (data as { detail?: unknown }).detail
        : undefined;
    throw new Error(
      typeof detail === "string"
        ? detail
        : "Failed to analyze email via PhishGuard FastAPI Backend"
    );
  }

  if (!isFastAPIAnalysisResponse(data)) {
    throw new Error("FastAPI returned an invalid scan response.");
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

  const prediction: PredictionType = data.is_phishing ? "phishing" : "safe";
  const evidence: EvidenceItem[] = data.indicators.map((indicator) => ({
    text: indicator.title || "Threat indicator",
    reason: indicator.description || data.verdict,
    severity: getEvidenceSeverity(indicator.severity || "medium"),
  }));

  const result: ScanResult = {
    scanId: data.scan_id,
    prediction,
    confidence: data.confidence_score * 100,
    riskScore: data.risk_score,
    pPhish: data.p_phish,
    summary: data.explainability.summary,
    evidence,
    modelVersion: "PAHF-Net",
    isDemo: false,
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
    confidence: result.confidence ?? 0,
    riskScore: result.riskScore,
    pPhish: result.pPhish,
    timestamp: result.timestamp || new Date().toISOString(),
    modelVersion: result.modelVersion || "PAHF-Net",
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

