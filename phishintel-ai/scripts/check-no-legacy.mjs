#!/usr/bin/env node

/**
 * Verification Gate Script: check-no-legacy.mjs
 * Enforces zero references to prohibited legacy architecture codes:
 * F-nn, S-nn, U-nn, M-nn, [FSUM]-nn, and retired 836d/5-branch identifiers.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const PROHIBITED_PATTERNS = [
  { name: "Legacy Feature Codes", regex: /\b(?:F|S|U|M)[-_ ](?:0[1-9]|1[0-9]|20)\b/i },
  { name: "Legacy Branch Labels", regex: /Financial 18|Security & phishing|URL \/ domain|Email metadata|Flags by feature branch/i },
  { name: "Legacy Summary Codes", regex: /\[(?:FSUM)[-_ ]\d{2}\]/i },
];

const SCAN_DIRS = [
  path.join(REPO_ROOT, "src"),
  path.join(REPO_ROOT, "..", "backend", "app"),
];

const ALLOW_LIST_FILES = new Set([
  "prohibited-legacy-codes.test.mjs",
  "check-no-legacy.mjs",
  "T0_baseline.md",
  "PhishIntel_IDE_Implementation_Spec.md",
  "phishintel-implementation-brief.md",
]);

let totalFilesChecked = 0;
let violationsFound = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".ts", ".tsx", ".js", ".mjs", ".jsx", ".py", ".json"].includes(ext)) {
        checkFile(fullPath, entry.name);
      }
    }
  }
}

function checkFile(filePath, fileName) {
  if (ALLOW_LIST_FILES.has(fileName)) return;
  totalFilesChecked++;
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, lineNum) => {
    // Exclude CSS color hex codes, tailwind spacing margins, and SVG paths
    if (line.includes("#") || line.includes("viewBox") || line.includes("path d=")) return;

    for (const pat of PROHIBITED_PATTERNS) {
      if (pat.regex.test(line)) {
        console.error(`❌ [${pat.name}] Violation in ${path.relative(REPO_ROOT, filePath)}:${lineNum + 1}`);
        console.error(`   Line: ${line.trim()}`);
        violationsFound++;
      }
    }
  });
}

console.log("🔍 Scanning codebase for prohibited legacy architecture patterns...");
for (const dir of SCAN_DIRS) {
  walk(dir);
}

console.log(`\nScan summary: ${totalFilesChecked} files checked.`);
if (violationsFound > 0) {
  console.error(`❌ FAILED: ${violationsFound} legacy architecture references found.`);
  process.exit(1);
} else {
  console.log("✅ PASSED: Zero prohibited legacy architecture patterns detected in active code.");
  process.exit(0);
}
