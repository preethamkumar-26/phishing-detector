import { NextResponse } from "next/server";
import { AuthenticationError, authenticateRequest, logActivity, DbSession } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET(req: Request) {
  try {
    const user = await authenticateRequest(req);
    const db = getDb();

    let sessions = db.prepare(`
      SELECT * FROM user_sessions WHERE user_id = ? ORDER BY last_active_at DESC
    `).all(user.id) as DbSession[];

    if (!sessions || sessions.length === 0) {
      // Ensure at least the current workstation session exists
      const now = new Date().toISOString();
      const id = `ses_${Date.now()}`;
      const token = `tok_${Date.now()}`;
      db.prepare(`
        INSERT INTO user_sessions (id, user_id, token, user_agent, ip_hint, created_at, last_active_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, user.id, token, "Web Browser (Current Session)", "127.0.0.1 (Localhost)", user.created_at, now);

      sessions = db.prepare(`SELECT * FROM user_sessions WHERE user_id = ?`).all(user.id) as DbSession[];
    }

    return NextResponse.json({
      sessions: sessions.map((s, idx) => ({
        id: s.id,
        userAgent: s.user_agent || "Web Browser",
        ipHint: s.ip_hint || "Localhost",
        createdAt: s.created_at,
        lastActiveAt: s.last_active_at,
        isCurrent: idx === 0,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const db = getDb();

    if (sessionId) {
      db.prepare(`DELETE FROM user_sessions WHERE id = ? AND user_id = ?`).run(sessionId, user.id);
      logActivity(user.id, "session_revoked", "Session revoked", "info", `Revoked session ${sessionId}`);
    } else {
      // Revoke all other sessions
      db.prepare(`DELETE FROM user_sessions WHERE user_id = ?`).run(user.id);
      logActivity(user.id, "session_revoked_all", "All sessions terminated", "info", "Terminated all active sessions");
    }

    return NextResponse.json({ success: true, message: "Session revoked successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke session";
    return NextResponse.json({ error: message }, { status: error instanceof AuthenticationError ? 401 : 400 });
  }
}
