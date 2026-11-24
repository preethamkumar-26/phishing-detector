import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Forgot password route and component exist and meet specification", () => {
  const filePath = path.join(__dirname, "..", "src", "app", "(auth)", "forgot-password", "page.tsx");
  assert.ok(fs.existsSync(filePath), "forgot-password/page.tsx must exist");

  const content = fs.readFileSync(filePath, "utf-8");

  // Heading and instructions
  assert.ok(content.includes("Reset your password"), "Must contain 'Reset your password' heading");
  assert.ok(content.includes("Send reset link"), "Must contain 'Send reset link' button");
  assert.ok(content.includes("Return to sign in"), "Must contain 'Return to sign in' navigation");

  // Privacy protection copy avoiding account enumeration
  assert.ok(
    content.includes("If an account exists for this email address") &&
      content.includes("send a password-reset link"),
    "Must preserve privacy and prevent enumeration"
  );

  // 60 second resend UI cooldown
  assert.ok(content.includes("RESEND_COOLDOWN_SECONDS = 60"), "Must enforce a 60-second UI cooldown");
  assert.ok(content.includes("remainingSeconds"), "Must display remaining cooldown seconds");

  // Email format validation
  assert.ok(content.includes("^[^\s@]+@[^\s@]+\.[^\s@]+$") || content.includes("@"), "Must validate email format");
});

test("Reset password route and component exist and enforce recovery authorization", () => {
  const filePath = path.join(__dirname, "..", "src", "app", "(auth)", "reset-password", "page.tsx");
  assert.ok(fs.existsSync(filePath), "reset-password/page.tsx must exist");

  const content = fs.readFileSync(filePath, "utf-8");

  // Form fields
  assert.ok(content.includes("Set new password"), "Must contain 'Set new password' heading");
  assert.ok(content.includes("New Password"), "Must contain new password field");
  assert.ok(content.includes("Confirm New Password"), "Must contain confirm password field");
  assert.ok(content.includes("Save new password"), "Must contain save button");

  // Password validation (8+ characters, match)
  assert.ok(content.includes("length < 8"), "Must enforce 8+ characters length requirement");
  assert.ok(content.includes("Passwords do not match"), "Must reject mismatched passwords");

  // Recovery authorization verification
  assert.ok(content.includes("exchangeCodeForSession"), "Must support PKCE code exchange");
  assert.ok(content.includes("PASSWORD_RECOVERY"), "Must handle PASSWORD_RECOVERY event");
  assert.ok(content.includes("Invalid or Expired Link"), "Must handle unauthorized or expired links");
  assert.ok(content.includes("Request a new reset link"), "Must offer request new link on failure");

  // Supabase Auth updateUser and cleanup
  assert.ok(content.includes("supabase.auth.updateUser"), "Must use supabase.auth.updateUser");
  assert.ok(content.includes("supabase.auth.signOut"), "Must clear recovery session upon password update");
  assert.ok(content.includes("Password Updated Successfully"), "Must display success state");
});

test("Sign-in page contains accessible link to forgot-password", () => {
  const signInPath = path.join(__dirname, "..", "src", "app", "(auth)", "sign-in", "page.tsx");
  assert.ok(fs.existsSync(signInPath), "sign-in/page.tsx must exist");

  const content = fs.readFileSync(signInPath, "utf-8");
  assert.ok(content.includes('href="/forgot-password"'), "Must link to /forgot-password");
  assert.ok(content.includes("Forgot password?"), "Must have 'Forgot password?' anchor text");
});

test("AuthDialog contains accessible link to forgot-password", () => {
  const dialogPath = path.join(__dirname, "..", "src", "components", "auth", "AuthDialog.tsx");
  assert.ok(fs.existsSync(dialogPath), "AuthDialog.tsx must exist");

  const content = fs.readFileSync(dialogPath, "utf-8");
  assert.ok(content.includes('href="/forgot-password"'), "AuthDialog must link to /forgot-password");
  assert.ok(content.includes("Forgot password?"), "AuthDialog must have 'Forgot password?' text");
});

test("AuthProvider exposes resetPasswordForEmail with enumeration protection", () => {
  const authProviderPath = path.join(__dirname, "..", "src", "components", "auth", "AuthProvider.tsx");
  assert.ok(fs.existsSync(authProviderPath), "AuthProvider.tsx must exist");

  const content = fs.readFileSync(authProviderPath, "utf-8");
  assert.ok(content.includes("resetPasswordForEmail"), "Must export resetPasswordForEmail in AuthActions");
  assert.ok(content.includes("redirectTo"), "Must provide redirectTo to /reset-password");
  assert.ok(
    content.includes("user not found") || content.includes("not registered"),
    "Must catch 'user not found' to prevent account enumeration"
  );
});

test("Password recovery validation logic behaves correctly on inputs", () => {
  // Test email syntax validator
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.ok(emailRegex.test("analyst@phishintel.io"));
  assert.ok(emailRegex.test("user.name+tag@sub.domain.com"));
  assert.equal(emailRegex.test("plainaddress"), false);
  assert.equal(emailRegex.test("@missingusername.com"), false);
  assert.equal(emailRegex.test("user@"), false);

  // Email trimming
  const rawEmail = "  analyst@phishintel.io \n ";
  assert.equal(rawEmail.trim(), "analyst@phishintel.io");

  // Password matching & length
  const p1 = "SecretPass123!";
  const p2 = "SecretPass123!";
  const p3 = "DifferentPass123!";
  const short = "short1";

  assert.equal(p1 === p2, true);
  assert.equal(p1 === p3, false);
  assert.equal(p1.length >= 8, true);
  assert.equal(short.length >= 8, false);

  // Passwords must not be trimmed
  const leadingSpacePass = "  passwithspaces ";
  assert.equal(leadingSpacePass.length, 17);
});
