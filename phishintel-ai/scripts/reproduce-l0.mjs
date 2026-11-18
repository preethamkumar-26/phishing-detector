import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();

  // Navigate to dashboard and seed scan
  await page.goto("http://localhost:3000/dashboard");
  await page.evaluate(() => {
    window.localStorage.setItem("pg.scans", JSON.stringify([
      {
        id: "PG-2608",
        ts: Date.now() - 3600000,
        src: "user",
        T: 0.05,
        P: 0.375,
        localP: 0.375,
        engine: "local",
        modelVersion: "PAHF-Net",
        decision: "PHISHING",
        risk: "High",
        riskScore: 38,
        email: {
          subject: "AI is moving beyond demos. Are you ready to become an FDE?",
          from: "hello@scaler.com",
          replyTo: "no-reply@scaler.com",
          body: "Join our exclusive Forward Deployed Engineer program. Register now at https://scaler.com/fde-apply to secure your spot.",
          headers: "From: hello@scaler.com\nTo: analyst@phishintel.internal\nSubject: AI is moving beyond demos. Are you ready to become an FDE?",
        },
        urls: ["https://scaler.com/fde-apply"],
        indicators: [],
      }
    ]));
  });

  // Navigate to history
  await page.goto("http://localhost:3000/history");
  await page.waitForTimeout(500);

  // Click row menu or expanded row for first scan
  console.log("Locating first history row...");
  const firstRow = page.locator("tbody tr").first();
  const menuBtn = firstRow.locator("button.row-act-btn");
  await menuBtn.click();
  await page.waitForTimeout(100);

  // Click "Load into analyzer"
  console.log("Clicking 'Load into analyzer'...");
  await page.click('button[role="menuitem"]:has-text("Load into analyzer")');
  await page.waitForURL("**/analyzer");
  await page.waitForTimeout(500);

  // Inspect analyzer form values
  const formState = await page.evaluate(() => {
    return {
      url: window.location.href,
      subject: document.querySelector('input[placeholder*="subject" i]')?.value || "",
      from: (document.querySelector('input[placeholder*="sender" i]') || document.querySelector('input[placeholder*="from" i]'))?.value || "",
      body: document.querySelector('textarea')?.value || "",
      hasAwaitingMessage: Boolean(document.body.innerText.includes("Awaiting a message")),
    };
  });

  console.log("Analyzer state after click:", formState);
  await browser.close();
}

main().catch(console.error);
