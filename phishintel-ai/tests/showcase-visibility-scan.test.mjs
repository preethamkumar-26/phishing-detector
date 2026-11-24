import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Globals CSS contains all required WCAG AA design tokens for interactive demo", () => {
  const cssPath = path.join(__dirname, "..", "src", "app", "globals.css");
  assert.ok(fs.existsSync(cssPath), "globals.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  // Surfaces & text
  assert.ok(css.includes("--pi-surface:        #e9ebdd;"));
  assert.ok(css.includes("--pi-text:           #1f2937;"));
  assert.ok(css.includes("--pi-text-muted:     #4b5563;"));

  // Danger tokens
  assert.ok(css.includes("--pi-danger-bg:      #fbd5d5;"));
  assert.ok(css.includes("--pi-danger-card:    #f3dcd6;"));
  assert.ok(css.includes("--pi-danger-text:    #9f1239;"));
  assert.ok(css.includes("--pi-danger-strong:  #7f1d1d;"));
  assert.ok(css.includes("--pi-danger-mark:    #fecaca;"));
  assert.ok(css.includes("--pi-danger-border:  #be123c;"));

  // Safe tokens
  assert.ok(css.includes("--pi-safe-bg:        #bbf7d0;"));
  assert.ok(css.includes("--pi-safe-card:      #dcf0dc;"));
  assert.ok(css.includes("--pi-safe-text:      #166534;"));
  assert.ok(css.includes("--pi-safe-strong:    #14532d;"));
  assert.ok(css.includes("--pi-safe-mark:      #bbf7d0;"));
  assert.ok(css.includes("--pi-safe-border:    #15803d;"));

  // Badges
  assert.ok(css.includes("--pi-badge-flag-bg:  #fca5a5;"));
  assert.ok(css.includes("--pi-badge-flag-fg:  #7f1d1d;"));
  assert.ok(css.includes("--pi-badge-ok-bg:    #86efac;"));
  assert.ok(css.includes("--pi-badge-ok-fg:    #14532d;"));
  assert.ok(css.includes("--pi-preview-bg:     #fde68a;"));
  assert.ok(css.includes("--pi-preview-fg:     #713f12;"));
});

test("Scan animation uses transform and sweeps the measured pane height", () => {
  const cssPath = path.join(__dirname, "..", "src", "app", "globals.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  assert.ok(css.includes(".pi-scan-overlay"), "Must define .pi-scan-overlay container");
  assert.ok(css.includes(".pi-scan"), "Must define .pi-scan element");
  assert.ok(css.includes("@keyframes pi-scan"), "Must define @keyframes pi-scan");
  assert.ok(css.includes("transform: translateY"), "Must animate transform: translateY only");
  assert.ok(!css.includes("animation: pi-scan") || !css.includes("top: 100%"), "Must NOT animate top");
  assert.ok(css.includes("var(--pane-h"), "Must use dynamic --pane-h CSS variable");
  assert.ok(css.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion");
});

test("AnimatedEmailShowcase component implements high-contrast styles and full scan lifecycle", () => {
  const compPath = path.join(__dirname, "..", "src", "components", "marketing", "AnimatedEmailShowcase.tsx");
  assert.ok(fs.existsSync(compPath), "AnimatedEmailShowcase.tsx must exist");

  const content = fs.readFileSync(compPath, "utf-8");

  // F1. Highlight tokens
  assert.ok(content.includes("var(--pi-danger-strong)"), "Threat highlight must use --pi-danger-strong");
  assert.ok(content.includes("var(--pi-danger-mark)"), "Threat highlight must use --pi-danger-mark");
  assert.ok(content.includes("var(--pi-safe-strong)"), "Safe highlight must use --pi-safe-strong");
  assert.ok(content.includes("var(--pi-safe-mark)"), "Safe highlight must use --pi-safe-mark");

  // F2. Signal cards tokens and pending opacity
  assert.ok(content.includes("var(--pi-danger-card)"), "Signal card must use --pi-danger-card");
  assert.ok(content.includes("var(--pi-safe-card)"), "Signal card must use --pi-safe-card");
  assert.ok(content.includes("var(--pi-danger-text)"), "Signal card must use --pi-danger-text");
  assert.ok(content.includes("var(--pi-safe-text)"), "Signal card must use --pi-safe-text");
  assert.ok(content.includes("opacity: 0.85"), "Pending card opacity must be 0.85 (>= 0.8)");

  // F3. Verdict box tokens
  assert.ok(content.includes("PHISHING DETECTED"), "Must display PHISHING DETECTED");
  assert.ok(content.includes("LEGITIMATE EMAIL"), "Must display LEGITIMATE EMAIL");
  assert.ok(content.includes("var(--pi-danger-bg)"), "Verdict box must use --pi-danger-bg");
  assert.ok(content.includes("var(--pi-safe-bg)"), "Verdict box must use --pi-safe-bg");

  // F4. Link badges
  assert.ok(content.includes("var(--pi-badge-flag-bg)"), "Must use --pi-badge-flag-bg");
  assert.ok(content.includes("var(--pi-badge-ok-bg)"), "Must use --pi-badge-ok-bg");
  assert.ok(content.includes("Flagged Link"), "Must have Flagged Link text");
  assert.ok(content.includes("Verified Link"), "Must have Verified Link text");

  // F5. Preview badge
  assert.ok(content.includes("var(--pi-preview-bg)"), "Must use --pi-preview-bg");
  assert.ok(content.includes("var(--pi-preview-fg)"), "Must use --pi-preview-fg");

  // F6. Message pane layout
  assert.ok(content.includes("justify-start"), "Must align body to top (remove vertical centering)");
  assert.ok(content.includes("lineHeight: 1.75"), "Body must use lineHeight: 1.75 for highlights padding");
  assert.ok(content.includes("mt-auto"), "Link row must be pinned to bottom");

  // Scan lifecycle & clean cancellation
  assert.ok(content.includes("--pane-h"), "Must dynamically assign --pane-h");
  assert.ok(content.includes("clearAllSubTimers"), "Must cancel timers on tab switch");
  assert.ok(content.includes("pi-scan-overlay"), "Must render pi-scan-overlay across full pane");
});
