import crypto from "node:crypto";
import { getDb } from "./db";

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  salt: string;
  phone: string | null;
  organization: string | null;
  designation: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPreferences {
  user_id: string;
  theme: string;
  email_notifications: number;
  security_alerts: number;
  scan_completion_notifications: number;
  product_updates: number;
  time_zone: string;
  language: string;
  default_analysis_view: string;
  show_explanatory_details: number;
  updated_at: string;
}

export interface DbActivity {
  id: string;
  user_id: string;
  event_type: string;
  label: string;
  outcome: string;
  details: string | null;
  timestamp: string;
}

export interface DbSession {
  id: string;
  user_id: string;
  token: string;
  user_agent: string | null;
  ip_hint: string | null;
  created_at: string;
  last_active_at: string;
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualHash = hashPassword(password, salt);
  const actualBuffer = Buffer.from(actualHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function generateId(prefix = "usr"): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export function logActivity(
  userId: string,
  eventType: string,
  label: string,
  outcome: "success" | "failure" | "info" = "success",
  details: string | null = null,
): void {
  const db = getDb();
  const id = generateId("act");
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO account_activity (id, user_id, event_type, label, outcome, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, eventType, label, outcome, details, now);
}

// Auto-seed default demo researcher if database is empty
export function ensureDefaultUser(): DbUser {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get("evelyn.reed@phishintel.internal") as DbUser | undefined;
  if (existing) return existing;

  const id = "usr_evelyn_reed";
  const email = "evelyn.reed@phishintel.internal";
  const name = "Dr. Evelyn Reed";
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword("password123", salt);
  const now = "2026-01-15T09:00:00.000Z";

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, salt, phone, organization, designation, bio, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email,
    name,
    passwordHash,
    salt,
    null, // phone - left null per spec (no fake data)
    null, // organization - left null per spec
    null, // designation - left null per spec
    null, // bio - left null per spec
    null, // avatar - left null per spec
    now,
    now,
  );

  // Default preferences
  db.prepare(`
    INSERT OR IGNORE INTO user_preferences (user_id, theme, email_notifications, security_alerts, scan_completion_notifications, product_updates, time_zone, language, default_analysis_view, show_explanatory_details, updated_at)
    VALUES (?, 'system', 0, 1, 1, 0, 'UTC', 'en', 'side-by-side', 1, ?)
  `).run(id, now);

  // Initial account creation activity
  logActivity(id, "account_created", "Account created", "success", "Initial registration");
  logActivity(id, "login_success", "Signed in from current browser", "success", "Local workstation session");

  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser;
}

export function findUserByEmail(email: string): DbUser | null {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalized) as DbUser | undefined;
  return user ?? null;
}

export function findUserById(id: string): DbUser | null {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
  return user ?? null;
}

export function upsertUser(email: string, name: string, salt: string, passwordHash: string): DbUser {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const existing = findUserByEmail(normalized);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE users SET name = ?, salt = ?, password_hash = ?, updated_at = ? WHERE id = ?
    `).run(name.trim(), salt, passwordHash, now, existing.id);
    return findUserById(existing.id)!;
  }

  const id = generateId("usr");
  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, normalized, name.trim(), passwordHash, salt, now, now);

  // Create default preferences
  db.prepare(`
    INSERT OR IGNORE INTO user_preferences (user_id, theme, email_notifications, security_alerts, scan_completion_notifications, product_updates, time_zone, language, default_analysis_view, show_explanatory_details, updated_at)
    VALUES (?, 'system', 0, 1, 1, 0, 'UTC', 'en', 'side-by-side', 1, ?)
  `).run(id, now);

  logActivity(id, "account_created", "Account registered", "success", "User registration");
  return findUserById(id)!;
}

export function createSession(userId: string, userAgent = "Web Browser"): DbSession {
  const db = getDb();
  const id = generateId("ses");
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_sessions (id, user_id, token, user_agent, ip_hint, created_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, token, userAgent.slice(0, 120), "127.0.0.1 (Localhost)", now, now);

  return db.prepare("SELECT * FROM user_sessions WHERE id = ?").get(id) as DbSession;
}

export function getUserFromSessionCookie(token?: string | null): DbUser | null {
  if (!token) return null;
  const db = getDb();
  try {
    const session = db.prepare("SELECT * FROM user_sessions WHERE token = ?").get(token) as DbSession | undefined;
    if (session) {
      const user = findUserById(session.user_id);
      if (user) return user;
    }
    const user = findUserByEmail(token);
    if (user) return user;
  } catch {}
  return null;
}

export function authenticateRequest(req: Request): DbUser {
  const db = getDb();

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    const session = db.prepare("SELECT * FROM user_sessions WHERE token = ?").get(token) as DbSession | undefined;
    if (session) {
      const user = findUserById(session.user_id);
      if (user) {
        db.prepare("UPDATE user_sessions SET last_active_at = ? WHERE id = ?").run(new Date().toISOString(), session.id);
        return user;
      }
    }
  }

  // 2. Priority check: x-user-email header (explicitly sent by frontend for the current active session)
  // This takes priority over cookies to prevent stale cookies from restoring a previously authenticated user
  const emailHeader = req.headers.get("x-user-email");
  if (emailHeader) {
    let user = findUserByEmail(emailHeader);
    if (!user) {
      // Auto-provision local workstation record for authenticated client email
      const defaultName = emailHeader.includes("@")
        ? emailHeader.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Analyst";
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = hashPassword("workstation_local", salt);
      user = upsertUser(emailHeader, defaultName, salt, passwordHash);
    }
    if (user) return user;
  }

  // 3. Fallback: Check phishintel_session cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/phishintel_session=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1].trim());
    const session = db.prepare("SELECT * FROM user_sessions WHERE token = ?").get(token) as DbSession | undefined;
    if (session) {
      const user = findUserById(session.user_id);
      if (user) return user;
    }
    // Check if cookie holds direct email
    const user = findUserByEmail(token);
    if (user) return user;
  }

  throw new Error("Authentication required. Please sign in to access account data.");
}

export function deleteUserAccount(userIdOrEmail: string): boolean {
  const db = getDb();
  let user = findUserById(userIdOrEmail);
  if (!user) {
    user = findUserByEmail(userIdOrEmail);
  }
  if (!user) return false;

  // Foreign keys have ON DELETE CASCADE, so preferences, sessions, and activity are deleted automatically
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  return true;
}
