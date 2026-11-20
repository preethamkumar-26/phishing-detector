/**
 * Supabase E2E Session Fixture
 * ----------------------------
 * Injects a mock Supabase v2 session into localStorage so the browser-side
 * supabase-js client believes the user is authenticated — without a real
 * network round-trip to Supabase Auth.
 *
 * Key:  sb-<project-ref>-auth-token
 * Value: the JSON that supabase-js @supabase/auth-js stores after a real login.
 *
 * Project ref: ujulxbzyornwmqhtlley
 * (derived from NEXT_PUBLIC_SUPABASE_URL = https://ujulxbzyornwmqhtlley.supabase.co)
 *
 * HOW THE MOCK JWT WORKS
 * supabase-js v2 reads the session from localStorage and trusts the stored
 * user object directly — it does NOT validate the JWT signature on the client.
 * Therefore a structurally valid but unsigned token is sufficient for E2E tests.
 *
 * Token breakdown:
 *   Header:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
 *            = {"alg":"HS256","typ":"JWT"}
 *
 *   Payload: eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC1lMnRlc3R1c2VyMDEiLCJlbWFpbCI6InByZWV0aGFtQGNvZ25pdGlvbi5haSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE3MzIwNjE0MDB9
 *            = {"sub":"00000000-0000-0000-0000-e2etestuser01",
 *               "email":"preetham@cognition.ai","role":"authenticated",
 *               "exp":9999999999,"iat":1732061400}
 *
 *   Signature: e2e_fake_sig  (not validated client-side)
 */

export const SUPABASE_STORAGE_KEY = "sb-ujulxbzyornwmqhtlley-auth-token";

// exp: 9999999999  ≈ year 2286 — effectively never expires for E2E purposes
const MOCK_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC1lMnRlc3R1c2VyMDEiLCJlbWFpbCI6InByZWV0aGFtQGNvZ25pdGlvbi5haSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE3MzIwNjE0MDB9" +
  ".e2e_fake_sig";

export const MOCK_USER = {
  id: "00000000-0000-0000-0000-e2etestuser01",
  aud: "authenticated",
  role: "authenticated",
  email: "preetham@cognition.ai",
  email_confirmed_at: "2026-01-01T00:00:00.000Z",
  phone: "",
  confirmed_at: "2026-01-01T00:00:00.000Z",
  last_sign_in_at: "2026-11-20T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Preetham Kumar", name: "Preetham Kumar" },
  identities: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-11-20T00:00:00.000Z",
};

/** Full storage value that supabase-js v2 writes / reads from localStorage. */
export const MOCK_STORAGE_VALUE = JSON.stringify({
  access_token: MOCK_ACCESS_TOKEN,
  refresh_token: "e2e_fake_refresh_token",
  expires_at: 9999999999,
  expires_in: 9999999999 - Math.floor(Date.now() / 1000),
  token_type: "bearer",
  user: MOCK_USER,
});

/**
 * Seeds a Supabase-only session into the page's localStorage.
 *
 * Call after `page.goto(...)` so the localStorage write targets the correct origin.
 *
 * Also sets `phishintel-session` for legacy API calls in profile/page.tsx that
 * still read it as an `x-user-email` header value, and explicitly removes the
 * old `phishintel-users` key to confirm it is no longer relied upon.
 */
export async function seedSupabaseSession(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
      // Legacy compat: profile/page.tsx still passes this as x-user-email to backend APIs
      window.localStorage.setItem("phishintel-session", "preetham@cognition.ai");
      document.cookie = "phishintel_session=preetham@cognition.ai; Path=/; SameSite=Lax;";
      // Confirm old local hash store is gone
      window.localStorage.removeItem("phishintel-users");
    },
    { key: SUPABASE_STORAGE_KEY, value: MOCK_STORAGE_VALUE }
  );
}

/**
 * Clears all auth state from localStorage — simulates a fully logged-out user.
 * Call after `page.goto(...)`.
 */
export async function clearAllAuthState(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(({ key }: { key: string }) => {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem("phishintel-session");
    window.localStorage.removeItem("phishintel-users");
    window.localStorage.removeItem("pg.profile");
    // Clear any other phishintel keys that might hold session data
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith("sb-") || k.startsWith("phishintel-")) {
        window.localStorage.removeItem(k);
      }
    }
    document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  }, { key: SUPABASE_STORAGE_KEY });
}
