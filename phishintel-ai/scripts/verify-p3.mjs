import { chromium } from "@playwright/test";

const ROUTES = [
  "/dashboard",
  "/analyzer",
  "/explainability",
  "/evaluation",
  "/history",
  "/profile",
];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  const warnings = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      errors.push({ url: page.url(), text });
    } else if (msg.type() === "warn") {
      warnings.push({ url: page.url(), text });
    }
  });

  page.on("pageerror", (err) => {
    errors.push({ url: page.url(), text: err.message });
  });

  // Seed session
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

  const routeStatus = [];

  for (const route of ROUTES) {
    await page.goto(`http://localhost:3000${route}`);
    await page.waitForTimeout(600);

    const overlayState = await page.evaluate(() => {
      const portal = document.querySelector("nextjs-portal");
      if (!portal || !portal.shadowRoot) return { present: false, isError: false };
      const root = portal.shadowRoot;
      const badge = root.querySelector("[data-next-badge]");
      const isError = badge ? badge.getAttribute("data-error") === "true" : false;
      const issuesBtn = root.querySelector("[data-issues-open]");
      const issuesText = issuesBtn ? issuesBtn.textContent : null;
      return {
        present: Boolean(badge),
        isError,
        issuesText,
      };
    });

    routeStatus.push({ route, ...overlayState });
  }

  console.log("Dev Overlay Route Status:");
  console.table(routeStatus);
  console.log("Console Errors found:", errors);
  console.log("Console Warnings found:", warnings);

  await browser.close();

  const failedRoutes = routeStatus.filter((r) => r.isError);
  if (failedRoutes.length > 0) {
    throw new Error(`P3 failed: Error badge active on ${failedRoutes.map((r) => r.route).join(", ")}`);
  }
  if (errors.length > 0) {
    throw new Error(`P3 failed: ${errors.length} console errors detected!`);
  }

  console.log("✅ P3 acceptance check passed: All routes show neutral badge and zero console errors!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
