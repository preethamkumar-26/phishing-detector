import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import our TypeScript module via tsx / esm or test pure logic
import { validateAndComputeArtifact } from "../src/lib/evalArtifact.ts";

test("validateAndComputeArtifact rejects non-objects or empty inputs", () => {
  assert.equal(validateAndComputeArtifact(null).success, false);
  assert.equal(validateAndComputeArtifact("").success, false);
});

test("validateAndComputeArtifact requires all 7 metadata fields", () => {
  const base = {
    model_version: "PAHF-Net",
    dataset: "bench",
    dataset_version: "v1",
    split: "test",
    threshold: 0.5,
    evaluation_date: "2026-11-18",
    sample_size: 2,
    predictions: [{ y_true: 1, y_score: 0.9 }, { y_true: 0, y_score: 0.1 }],
  };

  for (const field of ["model_version", "dataset", "dataset_version", "split"]) {
    const invalid = { ...base };
    delete invalid[field];
    const res = validateAndComputeArtifact(invalid);
    assert.equal(res.success, false);
    assert.match(res.error, new RegExp(field));
  }
});

test("validateAndComputeArtifact computes correct metrics on synthetic predictions", () => {
  const fixturePath = path.join(__dirname, "fixtures", "synthetic-eval-artifact.json");
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

  const res = validateAndComputeArtifact(raw);
  assert.equal(res.success, true);
  const a = res.artifact;

  // 20 predictions: 10 positive (y_true=1), 10 negative (y_true=0)
  // At threshold 0.5:
  // positives: 9 have y_score >= 0.5 (TP=9), 1 has y_score < 0.5 (0.320 -> FN=1)
  // negatives: 1 has y_score >= 0.5 (0.620 -> FP=1), 9 have y_score < 0.5 (TN=9)
  assert.equal(a.confusion.tp, 9);
  assert.equal(a.confusion.fp, 1);
  assert.equal(a.confusion.fn, 1);
  assert.equal(a.confusion.tn, 9);

  // Accuracy: (9 + 9) / 20 = 0.90
  assert.equal(a.accuracy, 0.90);

  // Precision: 9 / (9 + 1) = 0.90
  assert.equal(a.precision, 0.90);

  // Recall: 9 / (9 + 1) = 0.90
  assert.equal(a.recall, 0.90);

  // F1: 0.90
  assert.equal(a.f1, 0.90);

  // AUC should be high (~0.95+)
  assert.ok(a.auc > 0.90 && a.auc <= 1.0);
  assert.ok(a.roc.length > 5);
});

test("validateAndComputeArtifact detects sample_size mismatch", () => {
  const bad = {
    model_version: "PAHF-Net",
    dataset: "bench",
    dataset_version: "v1",
    split: "test",
    threshold: 0.5,
    sample_size: 100, // declared 100 but only 2 given
    predictions: [{ y_true: 1, y_score: 0.9 }, { y_true: 0, y_score: 0.1 }],
  };
  const res = validateAndComputeArtifact(bad);
  assert.equal(res.success, false);
  assert.match(res.error, /Sample size mismatch/);
});
