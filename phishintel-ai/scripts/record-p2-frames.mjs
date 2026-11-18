import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const EVIDENCE_DIR = path.resolve("tests/evidence/p2-transitions");
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

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
  });

  // Nav 1: Overview -> Email analyzer
  await page.goto("http://localhost:3000/dashboard");
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "01_overview_before_nav.png") });
  const p1 = page.click('a[href="/analyzer"]');
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "02_overview_to_analyzer_entering.png") });
  await p1;
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "03_analyzer_settled.png") });

  // Nav 2: Explainability -> Overview
  await page.goto("http://localhost:3000/explainability");
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "04_explainability_before_nav.png") });
  const p2 = page.click('a[href="/dashboard"]');
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "05_explainability_to_overview_entering.png") });
  await p2;
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "06_overview_settled.png") });

  // Nav 3: Scan history -> Profile
  await page.goto("http://localhost:3000/history");
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "07_history_before_nav.png") });
  const p3 = page.click('a[href="/profile"]');
  await page.waitForTimeout(60);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "08_history_to_profile_entering.png") });
  await p3;
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, "09_profile_settled.png") });

  await browser.close();
  console.log("P2 evidence frames recorded into:", EVIDENCE_DIR);
}

run().catch(console.error);
