import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET(req: Request) {
  try {
    const user = await authenticateRequest(req);
    const db = getDb();

    const sessionCountRow = db.prepare(`
      SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?
    `).get(user.id) as { count: number };

    return NextResponse.json({
      security: {
        twoFactorStatus: "not_configured",
        twoFactorMessage: "Two-factor authentication is not configured for this prototype.",
        passwordLastUpdated: user.updated_at,
        activeSessionsCount: Math.max(1, sessionCountRow?.count || 1),
        currentDevice: {
          browser: "Chrome / WebKit (Current Workstation)",
          location: "Localhost (Direct Session)",
          lastActive: new Date().toISOString(),
          isCurrent: true,
        },
        encryptionInfo: "PBKDF2-SHA256 (210,000 iterations, 16-byte cryptographically secure salt).",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
