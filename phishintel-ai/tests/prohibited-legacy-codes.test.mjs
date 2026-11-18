import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WORKSPACE_ROOT = path.resolve('..');
const FRONTEND_SRC = path.resolve('src');
const BACKEND_APP = path.resolve('../backend/app');

// Prohibited legacy architecture regex: F-01..F-18, S-01..S-19, U-01..U-20, M-01..M-11
const PROHIBITED_RULE_CODES = /\b(F-15|F-08|F-09|F-01|U-16|S-12|M-03|M-06|M-09|F-\d{2}|S-\d{2}|U-\d{2}|M-\d{2})\b/g;

// Prohibited retired-architecture names & dimensions
const RETIRED_ARCH_STRINGS = [
  /\b836-d\b/i,
  /\b836d\b/i,
  /5-Branch Feature Fusion/i,
  /Five-Branch Neural Architecture/i,
  /5 parallel feature streams/i,
];

function collectFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.py']) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '__pycache__', '.git'].includes(entry.name)) {
        results.push(...collectFiles(full, extensions));
      }
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

describe('PAHF-Net Architecture Integrity & Retired Architecture Purge', () => {
  test('Frontend source tree contains zero prohibited legacy rule codes', () => {
    const files = collectFiles(FRONTEND_SRC);
    assert.ok(files.length > 10, 'Found frontend source files to test');

    const violations = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = [...content.matchAll(PROHIBITED_RULE_CODES)];
      if (matches.length > 0) {
        violations.push({
          file: path.relative(FRONTEND_SRC, file),
          matches: matches.map((m) => m[0]),
        });
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found prohibited legacy rule codes in frontend source: ${JSON.stringify(violations, null, 2)}`
    );
  });

  test('Frontend source tree contains zero retired architecture names (836-d / 5-branch)', () => {
    const files = collectFiles(FRONTEND_SRC);
    const violations = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of RETIRED_ARCH_STRINGS) {
        if (pattern.test(content)) {
          violations.push({
            file: path.relative(FRONTEND_SRC, file),
            pattern: pattern.toString(),
          });
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found retired architecture strings in frontend source: ${JSON.stringify(violations, null, 2)}`
    );
  });

  test('Backend application tree contains zero prohibited legacy rule codes', () => {
    if (!fs.existsSync(BACKEND_APP)) return;
    const files = collectFiles(BACKEND_APP);
    const violations = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = [...content.matchAll(PROHIBITED_RULE_CODES)];
      if (matches.length > 0) {
        violations.push({
          file: path.relative(BACKEND_APP, file),
          matches: matches.map((m) => m[0]),
        });
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Found prohibited legacy rule codes in backend source: ${JSON.stringify(violations, null, 2)}`
    );
  });

  test('PhishGuardContext implements PAHF-Net availability-gated modalities', () => {
    const ctxFile = path.join(FRONTEND_SRC, 'context', 'PhishGuardContext.tsx');
    assert.ok(fs.existsSync(ctxFile), 'PhishGuardContext.tsx exists');
    const content = fs.readFileSync(ctxFile, 'utf8');

    // Asserts native 4 modalities
    assert.match(content, /export type PahfModality = "text" \| "url" \| "structure" \| "linguistic"/);
    assert.match(content, /computePahfNetAnalysis/);
    assert.match(content, /availabilityMask/);
    assert.match(content, /gateWeights/);
    assert.match(content, /modalityContributions/);
    assert.doesNotMatch(content, /analyzeEmailCore/);
    assert.doesNotMatch(content, /interface FeatureRow/);
  });

  test('Explainability page renders PAHF-Net 4 modalities and gate weights', () => {
    const explFile = path.join(FRONTEND_SRC, 'app', '(app)', 'explainability', 'page.tsx');
    assert.ok(fs.existsSync(explFile), 'explainability/page.tsx exists');
    const content = fs.readFileSync(explFile, 'utf8');

    assert.match(content, /PAHF_MODALITIES/);
    assert.match(content, /g_t/);
    assert.match(content, /g_u/);
    assert.match(content, /g_s/);
    assert.match(content, /g_l/);
    assert.match(content, /DeBERTa-v3/);
    assert.doesNotMatch(content, /dim:\s*768/);
  });

  test('PDF Export template documents PAHF-Net architecture and modality contributions', () => {
    const pdfFile = path.join(FRONTEND_SRC, 'lib', 'exportHistoryPdf.ts');
    assert.ok(fs.existsSync(pdfFile), 'exportHistoryPdf.ts exists');
    const content = fs.readFileSync(pdfFile, 'utf8');

    assert.match(content, /Architecture: PAHF-Net/);
    assert.match(content, /modalityContributions/);
    assert.doesNotMatch(content, /s\.rows/);
  });
});
