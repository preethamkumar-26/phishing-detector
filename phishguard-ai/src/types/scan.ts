export type PredictionType = "phishing" | "safe" | "needs_review";

export type EvidenceItem = {
  text: string;
  reason: string;
  severity?: "critical" | "high" | "medium" | "low";
  start?: number;
  end?: number;
};

export type ScanResult = {
  scanId: string;
  prediction: PredictionType;
  confidence?: number;
  summary?: string;
  evidence: EvidenceItem[];
  modelVersion?: string;
  processingTimeMs?: number;
  isDemo: boolean;
  timestamp?: string;
  subject?: string;
  sender?: string;
  body?: string;
};

export type ScanRecord = {
  id: string;
  subject: string;
  sender?: string;
  prediction: PredictionType;
  confidence: number;
  timestamp: string;
  modelVersion: string;
  isDemo: boolean;
  bodySnippet: string;
  evidenceCount: number;
  evidence?: EvidenceItem[];
};

export type ModelMetric = {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latencyMs: number;
  modelSizeMb: number;
};

export type ConfusionMatrix = {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
};

