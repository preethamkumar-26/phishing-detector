export interface PAHFNetSummaryMetrics {
  accuracy: number;
  balanced_accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  pr_auc: number;
}

export interface ClassMetricsItem {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface AccuracyReportItem {
  value: number;
  support: number;
}

export interface ClassificationReport {
  Legitimate: ClassMetricsItem;
  Phishing: ClassMetricsItem;
  accuracy: AccuracyReportItem;
  macro_avg: ClassMetricsItem;
  weighted_avg: ClassMetricsItem;
}

export interface ConfusionMatrixData {
  values: number[][];
  label_order: string[];
  row_axis: string;
  column_axis: string;
}

export interface PAHFNetEvaluationDetails {
  status: string;
  total_samples: number;
  class_support: {
    Legitimate: number;
    Phishing: number;
    [key: string]: number;
  };
  summary_metrics: PAHFNetSummaryMetrics;
  classification_report: ClassificationReport;
  confusion_matrix: ConfusionMatrixData;
}

export interface PAHFNetEvaluationResponse {
  status?: "available";
  model: string;
  evaluation: PAHFNetEvaluationDetails;
  data_notes?: string[];
}

export interface EvaluationScores {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  inference_latency_ms: number;
}

export interface EvaluationModelRanking {
  model_name: string;
  rank: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  auc_roc: number;
  inference_latency_ms?: number | null;
}

export interface AvailableEvaluationMetrics {
  status: "available";
  schema_version: 1;
  model_name: string;
  model_version: string;
  dataset: string;
  dataset_version: string;
  split: string;
  threshold: number;
  evaluated_at: string;
  sample_count: number;
  metrics: EvaluationScores;
  model_ranking: EvaluationModelRanking[];
}

export interface UnavailableEvaluationMetrics {
  status: "unavailable";
  reason: "artifact_not_found";
  artifact: "evaluation_metrics.json";
}

export type EvaluationMetricsResponse =
  | PAHFNetEvaluationResponse
  | AvailableEvaluationMetrics
  | UnavailableEvaluationMetrics;

export function isPAHFNetEvaluation(
  report: EvaluationMetricsResponse | null
): report is PAHFNetEvaluationResponse {
  if (!report || typeof report !== "object") return false;
  return (
    "evaluation" in report &&
    !!report.evaluation &&
    typeof report.evaluation === "object" &&
    "summary_metrics" in report.evaluation &&
    "classification_report" in report.evaluation &&
    "confusion_matrix" in report.evaluation
  );
}

export function isLegacyEvaluation(
  report: EvaluationMetricsResponse | null
): report is AvailableEvaluationMetrics {
  if (!report || typeof report !== "object") return false;
  return (
    "status" in report &&
    report.status === "available" &&
    "metrics" in report &&
    "model_ranking" in report
  );
}
