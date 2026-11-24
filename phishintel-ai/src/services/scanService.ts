import { ScanResult, ScanRecord, PredictionType, EvidenceItem } from "@/types/scan";
import { EvaluationMetricsResponse } from "@/types/evaluation";
import { DEMO_RECENT_SCANS } from "@/data/demo-data";
import {
  fetchWithBackendAutoRetry,
  getActiveAnalyzeEndpoint,
} from "@/lib/backendDiscovery";
import { supabase } from "@/lib/supabaseClient";

// In-memory session store initialized with demo records
let sessionScans: ScanRecord[] = [...DEMO_RECENT_SCANS];

const FASTAPI_BASE_URL =
  (process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
export const FASTAPI_ANALYZE_URL = `${FASTAPI_BASE_URL}/api/v1/analyze`;
export const FASTAPI_EVALUATION_METRICS_URL =
  `${FASTAPI_BASE_URL}/api/v1/evaluation-metrics`;

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

export interface FastAPIFeatureContributions {
  text: number;
  url: number;
  structure: number;
  linguistic: number;
}

export interface FastAPIVerificationDetails {
  mode?: string;
  offline_reputation_loaded?: boolean;
  sender_domain?: string | null;
  sender_tranco_rank?: number | null;
  sender_is_trusted?: boolean;
  reply_to_domain?: string | null;
  url_domains?: string[];
  trusted_url_domains?: string[];
  untrusted_url_domains?: string[];
  domains_aligned?: boolean;
  all_urls_trusted?: boolean;
  authentication?: {
    spf: string;
    dkim: string;
    dmarc: string;
    passed: boolean;
    failed: boolean;
  };
  has_list_unsubscribe?: boolean;
  hard_red_flag_count?: number;
  soft_warning_count?: number;
  positive_signal_count?: number;
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
    flagged_tokens?: Array<{
      token: string;
      weight: number;
      category: string;
      reason: string;
    }>;
    url_signals?: Array<{
      url: string;
      domain: string;
      is_suspicious: boolean;
      isSuspicious?: boolean;
      risk_score: number;
      riskScore?: number;
      reasons: string[];
    }>;
    feature_contributions?: FastAPIFeatureContributions;
    raw_model_probability?: number;
    decision_basis?: string;
    verification?: FastAPIVerificationDetails;
  };
  processing_time_ms?: number;
}

export function mapVerdictToPrediction(
  verdict: string | undefined,
  isPhishing: boolean
): PredictionType {
  const normalized = (verdict || "").trim().toLowerCase();
  if (normalized === "malicious" || normalized === "phishing" || isPhishing) {
    return "phishing";
  }
  if (
    normalized === "suspicious" ||
    normalized === "uncertain" ||
    normalized === "needs_review"
  ) {
    return "needs_review";
  }
  return "safe";
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

function isEvaluationMetricsResponse(value: unknown): value is EvaluationMetricsResponse {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (data.status === "unavailable") {
    return (
      data.reason === "artifact_not_found" &&
      data.artifact === "evaluation_metrics.json"
    );
  }

  // PAHF-Net full evaluation artifact format
  if ("evaluation" in data && data.evaluation && typeof data.evaluation === "object") {
    const evalObj = data.evaluation as Record<string, unknown>;
    const summary = evalObj.summary_metrics as Record<string, unknown> | undefined;
    const report = evalObj.classification_report as Record<string, unknown> | undefined;
    const cm = evalObj.confusion_matrix as Record<string, unknown> | undefined;
    const hasSummary =
      !!summary &&
      typeof summary.accuracy === "number" &&
      typeof summary.balanced_accuracy === "number" &&
      typeof summary.precision === "number" &&
      typeof summary.recall === "number" &&
      typeof summary.f1_score === "number" &&
      typeof summary.roc_auc === "number" &&
      typeof summary.pr_auc === "number";
    const hasReport =
      !!report &&
      !!report.Legitimate &&
      !!report.Phishing &&
      !!report.accuracy &&
      !!report.macro_avg &&
      !!report.weighted_avg;
    const hasCM =
      !!cm &&
      Array.isArray(cm.values) &&
      cm.values.length === 2 &&
      Array.isArray(cm.label_order) &&
      cm.label_order.length === 2;
    return Boolean(hasSummary && hasReport && hasCM);
  }

  if (data.status !== "available" || !data.metrics || typeof data.metrics !== "object") {
    return false;
  }

  const metrics = data.metrics as Record<string, unknown>;
  const scoreKeys = ["accuracy", "precision", "recall", "f1_score", "auc_roc"];
  const validScore = (score: unknown) =>
    typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 1;
  const validMetrics =
    scoreKeys.every((key) => validScore(metrics[key])) &&
    typeof metrics.inference_latency_ms === "number" &&
    Number.isFinite(metrics.inference_latency_ms) &&
    metrics.inference_latency_ms >= 0;
  const ranking = data.model_ranking;
  const validRanking =
    Array.isArray(ranking) &&
    ranking.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const item = entry as Record<string, unknown>;
      return (
        typeof item.model_name === "string" &&
        typeof item.rank === "number" &&
        Number.isInteger(item.rank) &&
        item.rank >= 1 &&
        scoreKeys.every((key) => validScore(item[key])) &&
        (item.inference_latency_ms == null ||
          (typeof item.inference_latency_ms === "number" &&
            Number.isFinite(item.inference_latency_ms) &&
            item.inference_latency_ms >= 0))
      );
    });

  return (
    data.schema_version === 1 &&
    typeof data.model_name === "string" &&
    typeof data.model_version === "string" &&
    typeof data.dataset === "string" &&
    typeof data.dataset_version === "string" &&
    typeof data.split === "string" &&
    typeof data.threshold === "number" &&
    validScore(data.threshold) &&
    typeof data.evaluated_at === "string" &&
    typeof data.sample_count === "number" &&
    Number.isInteger(data.sample_count) &&
    data.sample_count > 0 &&
    validMetrics &&
    validRanking
  );
}

export async function fetchEvaluationMetrics(
  signal?: AbortSignal
): Promise<EvaluationMetricsResponse> {
  try {
    const response = await fetch("/api/evaluation-metrics", {
      cache: "no-store",
      signal,
    });
    if (response.ok) {
      const data: unknown = await response.json();
      if (isEvaluationMetricsResponse(data)) {
        return data;
      }
    }
  } catch {}

  return {
    status: "unavailable",
    reason: "artifact_not_found",
    artifact: "evaluation_metrics.json",
  };
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
  endpoint?: string,
  signal?: AbortSignal
): Promise<FastAPIAnalysisResponse> {
  // Retrieve active Supabase user session token
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Please sign in before scanning an email.");
  }

  const activeEndpoint = endpoint
    ? endpoint
    : await getActiveAnalyzeEndpoint();
  let response: Response;
  try {
    response = await fetchWithBackendAutoRetry(activeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(
      error instanceof Error
        ? error.message
        : `Unable to reach the PhishIntel backend API at ${activeEndpoint}. Verify that the backend URL is correct and reachable, and that its CORS settings allow this frontend origin.`
    );
  }

  const data: unknown = await response.json();

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? (data as { detail?: unknown }).detail
        : undefined;
    throw new Error(
      typeof detail === "string"
        ? detail
        : "Failed to analyze email via PhishIntel FastAPI Backend"
    );
  }

  if (!isFastAPIAnalysisResponse(data)) {
    throw new Error("FastAPI returned an invalid scan response.");
  }

  const processHeader = response.headers.get("X-Process-Time-Ms");
  if (processHeader) {
    const measured = Number(processHeader);
    if (Number.isFinite(measured) && measured >= 0) {
      data.processing_time_ms = measured;
    }
  }

  return data;
}

/**
 * Analyzes an email using the PhishIntel FastAPI backend.
 */
export async function analyzeEmail(input: AnalyzeEmailInput): Promise<ScanResult> {
  const data = await analyzeEmailWithBackend({
    body: input.body,
    subject: input.subject,
    sender: input.sender,
  });

  const prediction: PredictionType = mapVerdictToPrediction(
    data.verdict,
    data.is_phishing
  );
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
    subject: input.subject || input.body.slice(0, 40) + "…",
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
    const userEmail =
      typeof window !== "undefined"
        ? window.localStorage.getItem("phishintel-session")
        : null;
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