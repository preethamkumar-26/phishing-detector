import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = path.resolve("tests/evidence/p0-baseline");
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Seed authenticated user into localStorage
  await page.goto("http://localhost:3000/dashboard");
  await page.evaluate(() => {
    window.localStorage.setItem("phishintel-session", "preetham@cognition.ai");
    window.localStorage.setItem(
      "phishintel-users",
      JSON.stringify([
        {
          name: "Preetham Kumar",
          email: "preetham@cognition.ai",
          designation: "Active analyst",
          salt: "11223344",
          passwordHash: "55667788",
        },
      ])
    );
    window.__shellMarker = 1;
  });

  console.log("Seeded session. Initial window.__shellMarker =", await page.evaluate(() => window.__shellMarker));

  // Sequence 1: Overview -> Email analyzer
  console.log("Navigating: Overview -> Email analyzer");
  await page.goto("http://localhost:3000/dashboard");
  await page.evaluate(() => { window.__shellMarker = 1; });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "01_overview_settled.png") });

  const navPromise1 = page.click('a[href="/analyzer"]');
  // Sample frame immediately after click
  await page.waitForTimeout(50);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "02_overview_to_analyzer_transition.png") });
  await navPromise1;
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "03_analyzer_settled.png") });
  console.log("Marker after Analyzer:", await page.evaluate(() => window.__shellMarker));

  // Sequence 2: Explainability -> Overview
  console.log("Navigating: Explainability -> Overview");
  await page.goto("http://localhost:3000/explainability");
  await page.evaluate(() => { window.__shellMarker = 1; });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "04_explainability_settled.png") });

  const navPromise2 = page.click('a[href="/dashboard"]');
  await page.waitForTimeout(50);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "05_explainability_to_overview_transition.png") });
  await navPromise2;
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "06_overview_settled_after_exp.png") });
  console.log("Marker after Overview:", await page.evaluate(() => window.__shellMarker));

  // Sequence 3: Scan history -> Profile
  console.log("Navigating: Scan history -> Profile");
  await page.goto("http://localhost:3000/history");
  await page.evaluate(() => { window.__shellMarker = 1; });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "07_history_settled.png") });

  const navPromise3 = page.click('a[href="/profile"]');
  // Catch the guest flash frame!
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "08_profile_guest_flash.png") });
  await navPromise3;
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "09_profile_settled.png") });
  console.log("Marker after Profile:", await page.evaluate(() => window.__shellMarker));

  await browser.close();
  console.log("Baseline frames recorded successfully into:", EVIDENCE_DIR);
}

run().catch(console.error);
