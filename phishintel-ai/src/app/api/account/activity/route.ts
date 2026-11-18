import { NextResponse } from "next/server";
import { authenticateRequest, DbActivity } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET(req: Request) {
  try {
    const user = authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "all";
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const db = getDb();

    let query = "SELECT * FROM account_activity WHERE user_id = ?";
    const params: unknown[] = [user.id];

    if (category === "auth") {
      query += " AND (event_type LIKE '%login%' OR event_type LIKE '%session%' OR event_type = 'account_created')";
    } else if (category === "profile") {
      query += " AND event_type LIKE '%profile%'";
    } else if (category === "security") {
      query += " AND (event_type LIKE '%password%' OR event_type LIKE '%security%' OR event_type LIKE '%session%')";
    } else if (category === "scans") {
      query += " AND event_type LIKE '%scan%'";
    }

    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const items = db.prepare(query).all(...params) as DbActivity[];

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM account_activity WHERE user_id = ?`).get(user.id) as { count: number };
    const scanCountRow = db.prepare(`SELECT COUNT(*) as count FROM account_activity WHERE user_id = ? AND event_type = 'scan_completed'`).get(user.id) as { count: number };
    const lastScanRow = db.prepare(`SELECT timestamp FROM account_activity WHERE user_id = ? AND event_type = 'scan_completed' ORDER BY timestamp DESC LIMIT 1`).get(user.id) as { timestamp: string } | undefined;

    return NextResponse.json({
      activity: items.map((item) => ({
        id: item.id,
        eventType: item.event_type,
        label: item.label,
        outcome: item.outcome,
        details: item.details,
        timestamp: item.timestamp,
      })),
      totalCount: countRow?.count || 0,
      summary: {
        totalScans: scanCountRow?.count || 0,
        lastScanAt: lastScanRow?.timestamp || null,
        accountCreatedAt: user.created_at,
        totalEvents: countRow?.count || 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
