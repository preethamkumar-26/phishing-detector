import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  await page.goto("http://localhost:3000/dashboard");
  await page.waitForTimeout(2000);

  const getBadge = async () => {
    return await page.evaluate(() => {
      const portal = document.querySelector("nextjs-portal");
      if (!portal || !portal.shadowRoot) return null;
      const root = portal.shadowRoot;
      const badge = root.querySelector("[data-next-badge]");
      const countEl = root.querySelector("[data-issues-open]");
      return {
        hasBadge: Boolean(badge),
        isError: badge ? badge.getAttribute("data-error") : null,
        issuesText: countEl ? countEl.textContent : null,
        html: badge ? badge.outerHTML : null,
      };
    });
  };

  console.log("Dashboard badge:", await getBadge());

  await page.click('a[href="/profile"]');
  await page.waitForTimeout(2000);
  console.log("Profile badge:", await getBadge());

  console.log("Console logs/errors:", consoleLogs.filter(l => l.type === "error" || l.type === "warn" || l.text.includes("Issue")));

  await browser.close();
}

main().catch(console.error);
