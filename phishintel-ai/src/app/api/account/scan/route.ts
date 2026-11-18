import { NextResponse } from "next/server";
import { authenticateRequest, logActivity } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId");
    const db = getDb();

    if (scanId) {
      const row = db
        .prepare("SELECT * FROM user_scans WHERE scan_id = ? ORDER BY created_at DESC LIMIT 1")
        .get(scanId) as any;

      if (!row) {
        return NextResponse.json({ scan: null }, { status: 404 });
      }

      if (row.payload_json) {
        try {
          const parsed = JSON.parse(row.payload_json);
          return NextResponse.json({ scan: parsed });
        } catch {}
      }

      // Fallback reconstruction if payload_json is absent
      const scan = {
        id: row.scan_id,
        ts: new Date(row.created_at).getTime() || Date.now(),
        src: "user",
        T: 0.5,
        P: typeof row.confidence === "number" ? row.confidence / 100 : 0.5,
        localP: typeof row.confidence === "number" ? row.confidence / 100 : 0.5,
        engine: "local",
        modelVersion: "PAHF-Net",
        decision: row.prediction === "phishing" ? "PHISHING" : "SAFE",
        risk: row.prediction === "phishing" ? "High" : "Low",
        riskScore: Math.round(row.confidence || 50),
        email: {
          subject: row.subject || "",
          from: row.from_email || "",
          replyTo: row.reply_to || "",
          body: row.body || "",
          headers: row.headers || "",
        },
        fromReg: "",
        fromDom: "",
        urls: row.urls ? row.urls.split(/\s+/).filter(Boolean) : [],
        indicators: [],
        modalities: {
          text: { modality: "text", code: "g_t", dimension: 256, available: true, gateWeight: 0.85, contribution: 0.2, description: "Text DeBERTa-v3" },
          url: { modality: "url", code: "g_u", dimension: 32, available: true, gateWeight: 0.8, contribution: 0.15, description: "URL features" },
          structure: { modality: "structure", code: "g_s", dimension: 32, available: true, gateWeight: 0.7, contribution: 0.05, description: "Structure" },
          linguistic: { modality: "linguistic", code: "g_l", dimension: 32, available: true, gateWeight: 0.75, contribution: 0.1, description: "Linguistic markers" },
        },
        gateWeights: { text: 0.85, url: 0.8, structure: 0.7, linguistic: 0.75 },
        availabilityMask: { text: true, url: true, structure: true, linguistic: true },
        modalityContributions: { text: 0.2, url: 0.15, structure: 0.05, linguistic: 0.1 },
        fusedScore: typeof row.confidence === "number" ? row.confidence / 100 : 0.5,
        entities: { sector: "General", amounts: [], tx: "", cards: [], accts: [], orgs: [] },
      };

      return NextResponse.json({ scan });
    }

    // Retrieve all scans for authenticated session
    let user;
    try {
      user = authenticateRequest(req);
    } catch {
      return NextResponse.json({ scans: [] });
    }

    const rows = db
      .prepare("SELECT * FROM user_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
      .all(user.id) as any[];

    const scans = rows.map((r) => {
      if (r.payload_json) {
        try {
          return JSON.parse(r.payload_json);
        } catch {}
      }
      return {
        id: r.scan_id,
        ts: new Date(r.created_at).getTime() || Date.now(),
        src: "user",
        T: 0.5,
        P: typeof r.confidence === "number" ? r.confidence / 100 : 0.5,
        localP: typeof r.confidence === "number" ? r.confidence / 100 : 0.5,
        engine: "local",
        modelVersion: "PAHF-Net",
        decision: r.prediction === "phishing" ? "PHISHING" : "SAFE",
        risk: r.prediction === "phishing" ? "High" : "Low",
        riskScore: Math.round(r.confidence || 50),
        email: {
          subject: r.subject || "",
          from: r.from_email || "",
          replyTo: r.reply_to || "",
          body: r.body || "",
          headers: r.headers || "",
        },
        fromReg: "",
        fromDom: "",
        urls: r.urls ? r.urls.split(/\s+/).filter(Boolean) : [],
        indicators: [],
        modalities: {
          text: { modality: "text", code: "g_t", dimension: 256, available: true, gateWeight: 0.85, contribution: 0.2, description: "Text DeBERTa-v3" },
          url: { modality: "url", code: "g_u", dimension: 32, available: true, gateWeight: 0.8, contribution: 0.15, description: "URL features" },
          structure: { modality: "structure", code: "g_s", dimension: 32, available: true, gateWeight: 0.7, contribution: 0.05, description: "Structure" },
          linguistic: { modality: "linguistic", code: "g_l", dimension: 32, available: true, gateWeight: 0.75, contribution: 0.1, description: "Linguistic markers" },
        },
        gateWeights: { text: 0.85, url: 0.8, structure: 0.7, linguistic: 0.75 },
        availabilityMask: { text: true, url: true, structure: true, linguistic: true },
        modalityContributions: { text: 0.2, url: 0.15, structure: 0.05, linguistic: 0.1 },
        fusedScore: typeof r.confidence === "number" ? r.confidence / 100 : 0.5,
        entities: { sector: "General", amounts: [], tx: "", cards: [], accts: [], orgs: [] },
      };
    });

    return NextResponse.json({ scans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error retrieving scans";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = authenticateRequest(req);
    const body = await req.json();

    const {
      scanId,
      subject,
      from,
      replyTo,
      body: emailBody,
      urls,
      headers,
      inputOrigin,
      prediction,
      confidence,
      payload,
    } = body;

    const now = new Date().toISOString();
    const db = getDb();

    if (scanId) {
      // Sensible caps per L2.2
      const cappedBody = typeof emailBody === "string" ? emailBody.slice(0, 100000) : "";
      const cappedHeaders = typeof headers === "string" ? headers.slice(0, 20000) : "";
      const urlsStr = Array.isArray(urls) ? urls.join(" ") : typeof urls === "string" ? urls : "";
      const payloadStr = payload ? JSON.stringify(payload) : null;

      db.prepare(`
        INSERT INTO user_scans (
          id, user_id, scan_id, subject, from_email, reply_to, body, urls, headers, input_origin, prediction, confidence, payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `usc_${Date.now()}`,
        user.id,
        scanId,
        (subject || "Email Analysis").slice(0, 200),
        (from || "").slice(0, 200),
        (replyTo || "").slice(0, 200),
        cappedBody,
        urlsStr,
        cappedHeaders,
        inputOrigin || "pasted",
        prediction || "safe",
        confidence || 95.0,
        payloadStr,
        now
      );

      logActivity(
        user.id,
        "scan_completed",
        `Email scan completed: ${prediction === "phishing" ? "Phishing detected" : prediction === "safe" ? "Legitimate email" : "Needs review"}`,
        prediction === "phishing" ? "info" : "success",
        `Scan ID: ${scanId} (${confidence?.toFixed(1) || 95}% confidence)`
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
    const clearAll = searchParams.get("clearAll") === "true";
    let scanId = searchParams.get("scanId");

    if (!scanId && !clearAll) {
      try {
        const body = await req.json();
        scanId = body.scanId;
      } catch {}
    }

    const db = getDb();

    if (clearAll || scanId === "all") {
      db.prepare("DELETE FROM user_scans WHERE user_id = ?").run(user.id);
      logActivity(
        user.id,
        "scans_cleared",
        "Cleared all scan records",
        "info",
        "All user scans purged"
      );
      return NextResponse.json({ success: true, clearedAll: true, remainingCount: 0 });
    }

    if (!scanId || typeof scanId !== "string" || !scanId.trim()) {
      return NextResponse.json(
        { error: "Valid scanId parameter is required." },
        { status: 400 }
      );
    }

    const trimmedScanId = scanId.trim();

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
