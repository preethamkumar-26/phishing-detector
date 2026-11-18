/**
 * Evaluation Artifact Schema v1 & Metric Computation Engine
 * Validates and computes metrics (Accuracy, Precision, Recall, F1, Confusion Matrix, ROC/AUC)
 * from model evaluation artifacts.
 */

export interface PredictionItem {
  y_true: number;
  y_score: number;
}

export interface EvalArtifactV1 {
  schema_version?: number;
  model_version: string;
  dataset: string;
  dataset_version: string;
  split: "train" | "val" | "test" | string;
  threshold: number;
  evaluation_date?: string;
  date?: string;
  sample_size?: number;
  n?: number;
  predictions?: PredictionItem[];
  confusion?: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  roc?: [number, number][] | { fpr: number[]; tpr: number[]; auc?: number };
  auc?: number;
  accuracy?: number | null;
  precision?: number | null;
  recall?: number | null;
  f1?: number | null;
}

export interface ProcessedEvalArtifact {
  model_version: string;
  dataset: string;
  dataset_version: string;
  split: string;
  threshold: number;
  date: string;
  n: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  confusion: {
    tp: number;
    fp: number;
    fn: number;
    tn: number;
  };
  roc: [number, number][];
  auc: number | null;
  predictions?: PredictionItem[];
}

export function validateAndComputeArtifact(raw: any): {
  success: boolean;
  artifact?: ProcessedEvalArtifact;
  error?: string;
} {
  if (!raw || typeof raw !== "object") {
    return { success: false, error: "Artifact must be a valid JSON object" };
  }

  // Required 7 metadata fields
  const model_version = raw.model_version || raw.modelVersion;
  if (!model_version || typeof model_version !== "string") {
    return { success: false, error: "Missing required field: model_version" };
  }

  const dataset = raw.dataset;
  if (!dataset || typeof dataset !== "string") {
    return { success: false, error: "Missing required field: dataset" };
  }

  const dataset_version = raw.dataset_version || raw.datasetVersion;
  if (!dataset_version || typeof dataset_version !== "string") {
    return { success: false, error: "Missing required field: dataset_version" };
  }

  const split = raw.split;
  if (!split || typeof split !== "string") {
    return { success: false, error: "Missing required field: split (expected train, val, or test)" };
  }

  const threshold = typeof raw.threshold === "number" ? raw.threshold : 0.5;
  const date = raw.evaluation_date || raw.date || new Date().toISOString().slice(0, 10);
  const sample_size = typeof raw.sample_size === "number" ? raw.sample_size : (typeof raw.n === "number" ? raw.n : null);

  const hasPredictions = Array.isArray(raw.predictions) && raw.predictions.length > 0;
  const hasConfusion = raw.confusion && typeof raw.confusion === "object";
  const hasRoc = raw.roc != null;

  if (!hasPredictions && (!hasConfusion || !hasRoc)) {
    return {
      success: false,
      error: "Artifact must contain either 'predictions' array or precomputed 'confusion' and 'roc'",
    };
  }

  if (hasPredictions) {
    const preds: PredictionItem[] = raw.predictions;
    if (sample_size !== null && sample_size !== preds.length) {
      return {
        success: false,
        error: `Sample size mismatch: declared sample_size (${sample_size}) does not match predictions count (${preds.length})`,
      };
    }

    const n = preds.length;
    let tp = 0, fp = 0, fn = 0, tn = 0;

    for (const p of preds) {
      const predPhish = p.y_score >= threshold;
      const actualPhish = p.y_true === 1;

      if (actualPhish && predPhish) tp++;
      else if (!actualPhish && predPhish) fp++;
      else if (actualPhish && !predPhish) fn++;
      else tn++;
    }

    const accuracy = n > 0 ? (tp + tn) / n : null;
    const precision = tp + fp > 0 ? tp / (tp + fp) : null;
    const recall = tp + fn > 0 ? tp / (tp + fn) : null;
    const f1 =
      precision !== null && recall !== null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null;

    // Compute ROC Points & AUC using trapezoidal rule
    // Sort descending by score
    const sorted = [...preds].sort((a, b) => b.y_score - a.y_score);
    const P_total = tp + fn;
    const N_total = fp + tn;

    const rocPts: [number, number][] = [[0, 0]];
    let auc = 0;

    if (P_total > 0 && N_total > 0) {
      let curTP = 0;
      let curFP = 0;
      let prevFPR = 0;
      let prevTPR = 0;

      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].y_true === 1) curTP++;
        else curFP++;

        // Only record ROC point when threshold changes or at end
        if (i === sorted.length - 1 || sorted[i].y_score !== sorted[i + 1].y_score) {
          const fpr = curFP / N_total;
          const tpr = curTP / P_total;
          rocPts.push([fpr, tpr]);

          // Trapezoidal AUC contribution
          auc += ((fpr - prevFPR) * (tpr + prevTPR)) / 2;
          prevFPR = fpr;
          prevTPR = tpr;
        }
      }
    } else {
      auc = 0.5;
      rocPts.push([1, 1]);
    }

    return {
      success: true,
      artifact: {
        model_version,
        dataset,
        dataset_version,
        split,
        threshold,
        date,
        n,
        accuracy,
        precision,
        recall,
        f1,
        confusion: { tp, fp, fn, tn },
        roc: rocPts,
        auc: Number(auc.toFixed(4)),
        predictions: preds,
      },
    };
  }

  // Precomputed Confusion and ROC
  const c = raw.confusion;
  const tp = Number(c.tp || 0);
  const fp = Number(c.fp || 0);
  const fn = Number(c.fn || 0);
  const tn = Number(c.tn || 0);
  const sumN = tp + fp + fn + tn;

  if (sample_size !== null && sample_size !== sumN) {
    return {
      success: false,
      error: `Sample size mismatch: declared sample_size (${sample_size}) does not match confusion matrix sum (${sumN})`,
    };
  }

  const n = sumN > 0 ? sumN : (sample_size || 0);
  const accuracy = typeof raw.accuracy === "number" ? raw.accuracy : (n > 0 ? (tp + tn) / n : null);
  const precision = typeof raw.precision === "number" ? raw.precision : (tp + fp > 0 ? tp / (tp + fp) : null);
  const recall = typeof raw.recall === "number" ? raw.recall : (tp + fn > 0 ? tp / (tp + fn) : null);
  const f1 =
    typeof raw.f1 === "number"
      ? raw.f1
      : precision !== null && recall !== null && precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : null;

  let rocPts: [number, number][] = [];
  if (Array.isArray(raw.roc)) {
    rocPts = raw.roc;
  } else if (raw.roc && Array.isArray(raw.roc.fpr) && Array.isArray(raw.roc.tpr)) {
    rocPts = raw.roc.fpr.map((fpr: number, idx: number) => [fpr, raw.roc.tpr[idx] || 0]);
  }

  let auc = typeof raw.auc === "number" ? raw.auc : null;
  if (auc === null && rocPts.length > 1) {
    // compute AUC from ROC points
    let calcAuc = 0;
    for (let i = 1; i < rocPts.length; i++) {
      calcAuc += ((rocPts[i][0] - rocPts[i - 1][0]) * (rocPts[i][1] + rocPts[i - 1][1])) / 2;
    }
    auc = Number(calcAuc.toFixed(4));
  }

  return {
    success: true,
    artifact: {
      model_version,
      dataset,
      dataset_version,
      split,
      threshold,
      date,
      n,
      accuracy,
      precision,
      recall,
      f1,
      confusion: { tp, fp, fn, tn },
      roc: rocPts,
      auc,
    },
  };
}
