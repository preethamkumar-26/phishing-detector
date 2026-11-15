import { NextResponse } from "next/server";
import { authenticateRequest, logActivity } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const user = authenticateRequest(req);
    const body = await req.json();

    const { scanId, subject, prediction, confidence } = body;
    const now = new Date().toISOString();
    const db = getDb();

    if (scanId) {
      db.prepare(`
        INSERT INTO user_scans (id, user_id, scan_id, subject, prediction, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(`usc_${Date.now()}`, user.id, scanId, (subject || "Email Analysis").slice(0, 100), prediction || "safe", confidence || 95.0, now);

      logActivity(
        user.id,
        "scan_completed",
        `Email scan completed: ${prediction === "phishing" ? "Phishing detected" : prediction === "safe" ? "Legitimate email" : "Needs review"}`,
        prediction === "phishing" ? "info" : "success",
        `Scan ID: ${scanId} (${confidence?.toFixed(1) || 95}% confidence)`,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
