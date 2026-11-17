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

export async function DELETE(req: Request) {
  try {
    let user;
    try {
      user = authenticateRequest(req);
    } catch {
      return NextResponse.json(
        { error: "Authentication required to delete scan records." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    let scanId = searchParams.get("scanId");

    if (!scanId) {
      try {
        const body = await req.json();
        scanId = body.scanId;
      } catch {}
    }

    if (!scanId || typeof scanId !== "string" || !scanId.trim()) {
      return NextResponse.json(
        { error: "Valid scanId parameter is required." },
        { status: 400 }
      );
    }

    const trimmedScanId = scanId.trim();
    const db = getDb();

    // Check ownership before deleting (scoped to user.id)
    const existing = db
      .prepare("SELECT * FROM user_scans WHERE scan_id = ? AND user_id = ?")
      .get(trimmedScanId, user.id);

    if (!existing) {
      return NextResponse.json(
        { success: true, scanId: trimmedScanId, deleted: false },
        { status: 200 }
      );
    }

    // Delete record scoped strictly to user_id
    db.prepare("DELETE FROM user_scans WHERE scan_id = ? AND user_id = ?").run(
      trimmedScanId,
      user.id
    );

    // Log destructive action in audit log
    logActivity(
      user.id,
      "scan_deleted",
      "Permanently deleted scan record",
      "info",
      `Scan ID: ${trimmedScanId}`
    );

    // Get updated total count
    const countRow = db
      .prepare("SELECT COUNT(*) as count FROM user_scans WHERE user_id = ?")
      .get(user.id) as { count: number } | undefined;

    return NextResponse.json({
      success: true,
      scanId: trimmedScanId,
      deleted: true,
      remainingCount: countRow?.count ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
