import { test, expect } from "@playwright/test";
import { seedSupabaseSession } from "./fixtures/supabase-session";

test.describe("P0 Baseline Reproduction", () => {
  test("reproduce profile guest flash and shell persistence", async ({ page }) => {
    // Collect console logs and errors
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Navigate first so localStorage is scoped to the right origin, then
    // seed a Supabase session (replaces legacy phishintel-users / phishintel-session).
    await page.goto("http://localhost:3000/dashboard");
    await seedSupabaseSession(page);

    // Set the shell marker AFTER seeding so it's not wiped
    await page.evaluate(() => {
      (window as any).__shellMarker = 1;
    });

    // Check window.__shellMarker set
    const markerInitial = await page.evaluate(() => (window as any).__shellMarker);
    expect(markerInitial).toBe(1);

    // Navigate to Scan History
    await page.click('a[href="/history"]');
    await page.waitForURL("**/history");
    const markerAfterHistory = await page.evaluate(() => (window as any).__shellMarker);
    console.log("Marker after navigation to /history:", markerAfterHistory);

    // Listen for mutations or text content during navigation to /profile
    const observedGuestStrings: string[] = [];
    await page.exposeFunction("reportGuestString", (str: string) => {
      observedGuestStrings.push(str);
    });

    await page.evaluate(() => {
      const observer = new MutationObserver(() => {
        const text = document.body.innerText || "";
        if (text.includes("Guest Analyst")) (window as any).reportGuestString("Guest Analyst");
        if (text.includes("Sign in / Register")) (window as any).reportGuestString("Sign in / Register");
        if (text.includes("local_workstation_user")) (window as any).reportGuestString("local_workstation_user");
        if (text.includes("Unauthenticated Guest")) (window as any).reportGuestString("Unauthenticated Guest");
        if (text.includes("Local workstation mode")) (window as any).reportGuestString("Local workstation mode");
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });

    // Navigate to /profile
    await page.click('a[href="/profile"]');
    await page.waitForURL("**/profile");

    // Wait a brief moment to ensure full load
    await page.waitForTimeout(500);

    const markerAfterProfile = await page.evaluate(() => (window as any).__shellMarker);
    console.log("Marker after navigation to /profile:", markerAfterProfile);
    console.log("Observed guest strings during /profile transition:", observedGuestStrings);
    console.log("Console errors observed:", consoleErrors);

    // Check dev overlay badge presence
    const issueBadge = await page
      .locator("nextjs-portal, [data-nextjs-dev-overlay], [aria-label*='issue'], [data-nextjs-toast]")
      .all();
    console.log("Dev overlay elements found:", issueBadge.length);
  });
});
