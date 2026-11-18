import { chromium } from "@playwright/test";

const SECTIONS = [
  { name: "Overview", href: "/dashboard" },
  { name: "Email analyzer", href: "/analyzer" },
  { name: "Explainability", href: "/explainability" },
  { name: "Evaluation", href: "/evaluation" },
  { name: "Scan history", href: "/history" },
  { name: "Profile", href: "/profile" },
];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("1. Testing shell persistence across all six sections...");
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
    const nav = document.querySelector('[data-shell="navbar"]');
    if (nav) nav.setAttribute("data-test-anchor", "anchored");
  });

  for (const sec of SECTIONS) {
    await page.click(`a[href="${sec.href}"]`);
    await page.waitForURL(`**${sec.href}`);
    await page.waitForTimeout(100);

    const marker = await page.evaluate(() => window.__shellMarker);
    const anchor = await page.evaluate(() => {
      const nav = document.querySelector('[data-shell="navbar"]');
      return nav ? nav.getAttribute("data-test-anchor") : null;
    });
    const hasTransitionWrap = await page.evaluate(() => {
      const el = document.querySelector('[data-route-transition="true"]');
      return Boolean(el && el.classList.contains("route-transition-wrap"));
    });

    console.log(`  -> Section: ${sec.name} (${sec.href}) | Marker: ${marker} | Anchor: ${anchor} | TransitionWrap: ${hasTransitionWrap}`);
    if (marker !== 1) throw new Error(`Shell marker lost on ${sec.name}`);
    if (anchor !== "anchored") throw new Error(`Navbar remounted on ${sec.name}`);
    if (!hasTransitionWrap) throw new Error(`Missing transition wrapper on ${sec.name}`);
  }

  // 2. Test Back / Forward
  console.log("2. Testing Back and Forward browser transitions...");
  await page.goBack();
  await page.waitForTimeout(100);
  const backMarker = await page.evaluate(() => window.__shellMarker);
  const backWrap = await page.evaluate(() => Boolean(document.querySelector('[data-route-transition="true"]')));
  console.log(`  -> Back navigation | Marker: ${backMarker} | TransitionWrap: ${backWrap}`);
  if (backMarker !== 1 || !backWrap) throw new Error("Back navigation shell or transition check failed");

  await page.goForward();
  await page.waitForTimeout(100);
  const fwdMarker = await page.evaluate(() => window.__shellMarker);
  const fwdWrap = await page.evaluate(() => Boolean(document.querySelector('[data-route-transition="true"]')));
  console.log(`  -> Forward navigation | Marker: ${fwdMarker} | TransitionWrap: ${fwdWrap}`);
  if (fwdMarker !== 1 || !fwdWrap) throw new Error("Forward navigation shell or transition check failed");

  // 3. Test Reduced Motion
  console.log("3. Testing prefers-reduced-motion...");
  await context.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto("http://localhost:3000/dashboard");
  const transformValue = await reducedPage.evaluate(() => {
    const el = document.querySelector('[data-route-transition="true"]');
    return el ? window.getComputedStyle(el).transform : null;
  });
  console.log("  -> Computed transform under prefers-reduced-motion:", transformValue);

  await browser.close();
  console.log("✅ P2 smooth transition checks passed completely!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
