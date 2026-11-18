import { chromium } from "@playwright/test";

const GUEST_STRINGS = [
  "Guest Analyst",
  "Sign in / Register",
  "local_workstation_user",
  "Unauthenticated Guest",
  "Local workstation mode",
];

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  // 1. Seed logged-in session for Preetham Kumar
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

  let violations = [];
  await page.exposeFunction("reportViolation", (str, navIndex) => {
    violations.push({ str, navIndex });
  });

  const setupObserver = async (navIndex) => {
    await page.evaluate((idx) => {
      const observer = new MutationObserver(() => {
        const text = document.body.innerText || "";
        const forbidden = [
          "Guest Analyst",
          "Sign in / Register",
          "local_workstation_user",
          "Unauthenticated Guest",
          "Local workstation mode",
        ];
        for (const f of forbidden) {
          if (text.includes(f)) {
            window.reportViolation(f, idx);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }, navIndex);
  };

  console.log("Testing 20 navigations to /profile while authenticated...");
  for (let i = 1; i <= 20; i++) {
    if (i % 4 === 1) {
      // Direct navigation via nav click
      await page.goto("http://localhost:3000/history");
      await setupObserver(i);
      await page.click('a[href="/profile"]');
      await page.waitForURL("**/profile");
    } else if (i % 4 === 2) {
      // Direct URL navigation
      await setupObserver(i);
      await page.goto("http://localhost:3000/profile");
    } else if (i % 4 === 3) {
      // Page reload
      await setupObserver(i);
      await page.reload();
    } else {
      // Back / forward
      await page.goto("http://localhost:3000/dashboard");
      await setupObserver(i);
      await page.goBack();
      await page.waitForURL("**/profile");
    }
    await page.waitForTimeout(150);
  }

  console.log("Violations found during 20 navigations:", violations);

  // 2. Test logged-out session
  console.log("Testing logged-out session...");
  await page.evaluate(() => {
    window.localStorage.clear();
    document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  });
  await page.goto("http://localhost:3000/profile");
  await page.waitForTimeout(500);

  const loggedOutText = await page.evaluate(() => document.body.innerText);
  const showsGuest = loggedOutText.includes("Guest Analyst") && loggedOutText.includes("Sign in / Register");
  console.log("Logged-out session shows Guest Analyst & Sign in / Register:", showsGuest);
  console.log("Console errors on logged out:", consoleErrors);

  await browser.close();

  if (violations.length > 0) {
    throw new Error(`P1 check failed: ${violations.length} guest string violations observed!`);
  }
  if (!showsGuest) {
    throw new Error("P1 check failed: Logged out session did not show guest view!");
  }
  console.log("✅ P1 acceptance check passed completely!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
