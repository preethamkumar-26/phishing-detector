import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET(req: Request) {
  try {
    const user = authenticateRequest(req);
    const db = getDb();

    // Compute calendar month boundaries
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

    const scanCountRow = db.prepare(`
      SELECT COUNT(*) as count FROM account_activity
      WHERE user_id = ? AND event_type = 'scan_completed' AND timestamp >= ?
    `).get(user.id, periodStart) as { count: number };

    const totalScansRow = db.prepare(`
      SELECT COUNT(*) as count FROM account_activity
      WHERE user_id = ? AND event_type = 'scan_completed'
    `).get(user.id) as { count: number };

    return NextResponse.json({
      usage: {
        periodStart,
        periodEnd,
        scansUsedCurrentPeriod: scanCountRow?.count || 0,
        totalLifetimeScans: totalScansRow?.count || 0,
        scanLimit: null, // Unmetered prototype access
        apiRequestsUsed: null, // No separate external API rate limit tracked
        storageMetering: "not_metered",
      },
      plan: {
        name: "Open Research Prototype",
        status: "active_unmetered",
        tierDescription: "Unmetered local research environment. No external commercial quota applied.",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
