import { test, expect } from "@playwright/test";
import { seedSupabaseSession, clearAllAuthState } from "./fixtures/supabase-session";

const SECTIONS = [
  { name: "Overview", href: "/dashboard" },
  { name: "Email analyzer", href: "/analyzer" },
  { name: "Explainability", href: "/explainability" },
  { name: "Evaluation", href: "/evaluation" },
  { name: "Scan history", href: "/history" },
  { name: "Profile", href: "/profile" },
];

test.describe("PhishIntel Spec #02: Profile Flicker & Smooth Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first so localStorage is scoped to the right origin, then
    // seed the Supabase session for analyst Preetham Kumar.
    await page.goto("http://localhost:3000/dashboard");
    await seedSupabaseSession(page);
  });

  test("P1: 20x Profile navigation never contains guest strings while authenticated", async ({ page }) => {
    const violations: { str: string; run: number }[] = [];
    await page.exposeFunction("reportViolation", (str: string, run: number) => {
      violations.push({ str, run });
    });

    const installObserver = async (run: number) => {
      await page.evaluate((r) => {
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
              (window as any).reportViolation(f, r);
            }
          }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }, run);
    };

    for (let i = 1; i <= 20; i++) {
      if (i % 4 === 1) {
        await page.goto("http://localhost:3000/history");
        // Re-seed after hard navigation — Supabase session persists across same-origin
        // soft navigations, but re-seeding after full page loads keeps the test robust.
        await seedSupabaseSession(page);
        await installObserver(i);
        await page.click('a[href="/profile"]');
        await page.waitForURL("**/profile");
      } else if (i % 4 === 2) {
        await installObserver(i);
        await page.goto("http://localhost:3000/profile");
        await seedSupabaseSession(page);
      } else if (i % 4 === 3) {
        await installObserver(i);
        await page.reload();
        await seedSupabaseSession(page);
      } else {
        await page.goto("http://localhost:3000/dashboard");
        await seedSupabaseSession(page);
        await installObserver(i);
        await page.goBack();
        await page.waitForURL("**/profile");
      }
      await page.waitForTimeout(100);
    }

    expect(violations).toEqual([]);
  });

  test("P2: Shell persistence across all 6 sections (window.__shellMarker & data-shell)", async ({ page }) => {
    // __shellMarker is already set after beforeEach seeds the session
    await page.evaluate(() => {
      (window as any).__shellMarker = 1;
      const nav = document.querySelector('[data-shell="navbar"]');
      if (nav) nav.setAttribute("data-test-anchor", "anchored");
    });

    for (const sec of SECTIONS) {
      await page.click(`a[href="${sec.href}"]`);
      await page.waitForURL(`**${sec.href}`);
      await page.waitForTimeout(60);

      const marker = await page.evaluate(() => (window as any).__shellMarker);
      const anchor = await page.evaluate(() => {
        const nav = document.querySelector('[data-shell="navbar"]');
        return nav ? nav.getAttribute("data-test-anchor") : null;
      });
      const hasWrap = await page.evaluate(() => {
        const el = document.querySelector('[data-route-transition="true"]');
        return Boolean(el && el.classList.contains("route-transition-wrap"));
      });

      expect(marker).toBe(1);
      expect(anchor).toBe("anchored");
      expect(hasWrap).toBe(true);
    }
  });

  test("P2: Back and Forward navigation preserves shell and applies transition", async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__shellMarker = 1;
    });

    await page.click('a[href="/analyzer"]');
    await page.waitForURL("**/analyzer");

    await page.goBack();
    await page.waitForURL("**/dashboard");
    expect(await page.evaluate(() => (window as any).__shellMarker)).toBe(1);
    expect(
      await page.evaluate(() => Boolean(document.querySelector('[data-route-transition="true"]')))
    ).toBe(true);

    await page.goForward();
    await page.waitForURL("**/analyzer");
    expect(await page.evaluate(() => (window as any).__shellMarker)).toBe(1);
    expect(
      await page.evaluate(() => Boolean(document.querySelector('[data-route-transition="true"]')))
    ).toBe(true);
  });

  test("P2: prefers-reduced-motion disables translation motion", async ({ browser }) => {
    const reducedContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto("http://localhost:3000/dashboard");

    const transform = await reducedPage.evaluate(() => {
      const el = document.querySelector('[data-route-transition="true"]');
      return el ? window.getComputedStyle(el).transform : null;
    });

    expect(transform).toBe("none");
    await reducedContext.close();
  });

  test("P3: All 6 routes show neutral Next.js dev badge and no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Session already seeded in beforeEach; iterate all routes
    for (const sec of SECTIONS) {
      await page.goto(`http://localhost:3000${sec.href}`);
      // Re-seed after each hard navigation so the session is always present
      await seedSupabaseSession(page);
      await page.waitForTimeout(400);

      const overlay = await page.evaluate(() => {
        const portal = document.querySelector("nextjs-portal");
        if (!portal || !portal.shadowRoot) return { isError: false };
        const root = portal.shadowRoot;
        const badge = root.querySelector("[data-next-badge]");
        return {
          isError: badge ? badge.getAttribute("data-error") === "true" : false,
        };
      });

      expect(overlay.isError).toBe(false);
    }

    expect(consoleErrors).toEqual([]);
  });

  test("Logged-out session explicitly renders guest state with no errors", async ({ page }) => {
    // Clear ALL auth state to simulate a fully logged-out user
    await clearAllAuthState(page);

    await page.goto("http://localhost:3000/profile");
    await page.waitForTimeout(500);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain("Guest Analyst");
    expect(bodyText).toContain("Sign in / Register");
    expect(bodyText).toContain("Local workstation mode");
  });
});
