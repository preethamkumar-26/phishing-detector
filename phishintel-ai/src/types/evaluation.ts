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
  | AvailableEvaluationMetrics
  | UnavailableEvaluationMetrics;
