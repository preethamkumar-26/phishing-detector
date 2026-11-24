import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("PAHF-Net evaluation artifact exists in public/ and backend/saved_models/", () => {
  const publicPath = path.join(__dirname, "..", "public", "evaluation_metrics.json");
  const backendPath = path.join(__dirname, "..", "..", "backend", "saved_models", "evaluation_metrics.json");

  assert.ok(fs.existsSync(publicPath), "public/evaluation_metrics.json must exist");
  assert.ok(fs.existsSync(backendPath), "backend/saved_models/evaluation_metrics.json must exist");
});

test("PAHF-Net evaluation artifact contains exact verified summary metrics", () => {
  const filePath = path.join(__dirname, "..", "public", "evaluation_metrics.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  assert.equal(data.model, "PAHF-Net");
  assert.equal(data.evaluation.status, "completed_successfully");
  assert.equal(data.evaluation.total_samples, 14294);

  const s = data.evaluation.summary_metrics;
  assert.equal(s.accuracy, 0.992444);
  assert.equal(s.balanced_accuracy, 0.992658);
  assert.equal(s.precision, 0.988728);
  assert.equal(s.recall, 0.99062);
  assert.equal(s.f1_score, 0.989673);
  assert.equal(s.roc_auc, 0.9984);
  assert.equal(s.pr_auc, 0.9975);
});

test("PAHF-Net classification report matches exact per-class metrics and support", () => {
  const filePath = path.join(__dirname, "..", "public", "evaluation_metrics.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const cr = data.evaluation.classification_report;

  // Legitimate
  assert.equal(cr.Legitimate.precision, 0.9946);
  assert.equal(cr.Legitimate.recall, 0.9935);
  assert.equal(cr.Legitimate.f1_score, 0.994);
  assert.equal(cr.Legitimate.support, 9070);

  // Phishing
  assert.equal(cr.Phishing.precision, 0.9887);
  assert.equal(cr.Phishing.recall, 0.9906);
  assert.equal(cr.Phishing.f1_score, 0.9897);
  assert.equal(cr.Phishing.support, 5224);

  // Accuracy row
  assert.equal(cr.accuracy.value, 0.9924);
  assert.equal(cr.accuracy.support, 14294);

  // Macro avg
  assert.equal(cr.macro_avg.precision, 0.9917);
  assert.equal(cr.macro_avg.recall, 0.9921);
  assert.equal(cr.macro_avg.f1_score, 0.9919);
  assert.equal(cr.macro_avg.support, 14294);

  // Weighted avg
  assert.equal(cr.weighted_avg.precision, 0.9924);
  assert.equal(cr.weighted_avg.recall, 0.9924);
  assert.equal(cr.weighted_avg.f1_score, 0.9924);
  assert.equal(cr.weighted_avg.support, 14294);
});

test("PAHF-Net confusion matrix matches exact values and label order", () => {
  const filePath = path.join(__dirname, "..", "public", "evaluation_metrics.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const cm = data.evaluation.confusion_matrix;

  assert.deepEqual(cm.values, [[9011, 59], [49, 5175]]);
  assert.deepEqual(cm.label_order, ["Legitimate", "Phishing"]);
  assert.equal(cm.row_axis, "actual");
  assert.equal(cm.column_axis, "predicted");

  // Mathematical consistency
  const legitActual = cm.values[0][0] + cm.values[0][1];
  const phishActual = cm.values[1][0] + cm.values[1][1];
  assert.equal(legitActual, 9070);
  assert.equal(phishActual, 5224);
  assert.equal(legitActual + phishActual, 14294);
});
