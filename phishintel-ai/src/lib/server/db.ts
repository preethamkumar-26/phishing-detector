import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

let dbInstance: DatabaseSync | null = null;

function getDbPath(): string {
  const dir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "phishintel.db");
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode & foreign keys
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      phone TEXT,
      organization TEXT,
      designation TEXT,
      bio TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT NOT NULL DEFAULT 'system',
      email_notifications INTEGER NOT NULL DEFAULT 0,
      security_alerts INTEGER NOT NULL DEFAULT 1,
      scan_completion_notifications INTEGER NOT NULL DEFAULT 1,
      product_updates INTEGER NOT NULL DEFAULT 0,
      time_zone TEXT NOT NULL DEFAULT 'UTC',
      language TEXT NOT NULL DEFAULT 'en',
      default_analysis_view TEXT NOT NULL DEFAULT 'side-by-side',
      show_explanatory_details INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      label TEXT NOT NULL,
      outcome TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user_time ON account_activity(user_id, timestamp DESC);

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      user_agent TEXT,
      ip_hint TEXT,
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

    CREATE TABLE IF NOT EXISTS user_scans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scan_id TEXT NOT NULL,
      subject TEXT,
      from_email TEXT,
      reply_to TEXT,
      body TEXT,
      urls TEXT,
      headers TEXT,
      input_origin TEXT,
      prediction TEXT NOT NULL,
      confidence REAL,
      payload_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_scans ON user_scans(user_id, created_at DESC);
  `);

  // Idempotent migration for existing databases
  try {
    const userScansCols = db.prepare("PRAGMA table_info(user_scans)").all() as Array<{ name: string }>;
    const colNames = new Set(userScansCols.map((c) => c.name));
    if (!colNames.has("from_email")) {
      db.exec("ALTER TABLE user_scans ADD COLUMN from_email TEXT;");
    }
    if (!colNames.has("reply_to")) {
      db.exec("ALTER TABLE user_scans ADD COLUMN reply_to TEXT;");
    }
    if (!colNames.has("body")) {
      db.exec("ALTER TABLE user_scans ADD COLUMN body TEXT;");
    }
    if (!colNames.has("urls")) {
      db.exec("ALTER TABLE user_scans ADD COLUMN urls TEXT;");
    }
    if (!colNames.has("headers")) {
      db.exec("ALTER TABLE user_scans ADD COLUMN headers TEXT;");
    }
    if (!colNames.has("input_origin")) {
      db.exec("ALTER TABLE user_scans ADD COLUMN input_origin TEXT;");
    }
    if (!colNames.has("payload_json")) {
      db.exec("ALTER TABLE user_scans ADD COLUMN payload_json TEXT;");
    }
  } catch (err) {
    console.error("Migration error on user_scans table:", err);
  }

  dbInstance = db;
  return dbInstance;
}
