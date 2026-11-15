import { NextResponse } from "next/server";
import { authenticateRequest, logActivity } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

interface PreferenceRow {
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

export async function GET(req: Request) {
  try {
    const user = authenticateRequest(req);
    const db = getDb();

    let pref = db.prepare(`
      SELECT * FROM user_preferences WHERE user_id = ?
    `).get(user.id) as PreferenceRow | undefined;

    if (!pref) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO user_preferences (user_id, theme, email_notifications, security_alerts, scan_completion_notifications, product_updates, time_zone, language, default_analysis_view, show_explanatory_details, updated_at)
        VALUES (?, 'system', 0, 1, 1, 0, 'UTC', 'en', 'side-by-side', 1, ?)
      `).run(user.id, now);

      pref = db.prepare(`SELECT * FROM user_preferences WHERE user_id = ?`).get(user.id) as PreferenceRow;
    }

    return NextResponse.json({
      preferences: {
        theme: pref.theme,
        emailNotifications: Boolean(pref.email_notifications),
        securityAlerts: Boolean(pref.security_alerts),
        scanCompletionNotifications: Boolean(pref.scan_completion_notifications),
        productUpdates: Boolean(pref.product_updates),
        timeZone: pref.time_zone,
        language: pref.language,
        defaultAnalysisView: pref.default_analysis_view,
        showExplanatoryDetails: Boolean(pref.show_explanatory_details),
        updatedAt: pref.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = authenticateRequest(req);
    const body = await req.json();
    const db = getDb();

    // Whitelist allowed fields
    const theme = ["dark", "light", "system"].includes(body.theme) ? body.theme : undefined;
    const emailNotifications = typeof body.emailNotifications === "boolean" ? (body.emailNotifications ? 1 : 0) : undefined;
    const securityAlerts = typeof body.securityAlerts === "boolean" ? (body.securityAlerts ? 1 : 0) : undefined;
    const scanCompletionNotifications = typeof body.scanCompletionNotifications === "boolean" ? (body.scanCompletionNotifications ? 1 : 0) : undefined;
    const productUpdates = typeof body.productUpdates === "boolean" ? (body.productUpdates ? 1 : 0) : undefined;
    const timeZone = typeof body.timeZone === "string" ? body.timeZone.trim() : undefined;
    const language = typeof body.language === "string" ? body.language.trim() : undefined;
    const defaultAnalysisView = ["side-by-side", "stacked"].includes(body.defaultAnalysisView) ? body.defaultAnalysisView : undefined;
    const showExplanatoryDetails = typeof body.showExplanatoryDetails === "boolean" ? (body.showExplanatoryDetails ? 1 : 0) : undefined;

    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_preferences (
        user_id, theme, email_notifications, security_alerts, scan_completion_notifications,
        product_updates, time_zone, language, default_analysis_view, show_explanatory_details, updated_at
      )
      VALUES (
        ?,
        COALESCE(?, 'system'),
        COALESCE(?, 0),
        COALESCE(?, 1),
        COALESCE(?, 1),
        COALESCE(?, 0),
        COALESCE(?, 'UTC'),
        COALESCE(?, 'en'),
        COALESCE(?, 'side-by-side'),
        COALESCE(?, 1),
        ?
      )
      ON CONFLICT(user_id) DO UPDATE SET
        theme = COALESCE(?, theme),
        email_notifications = COALESCE(?, email_notifications),
        security_alerts = COALESCE(?, security_alerts),
        scan_completion_notifications = COALESCE(?, scan_completion_notifications),
        product_updates = COALESCE(?, product_updates),
        time_zone = COALESCE(?, time_zone),
        language = COALESCE(?, language),
        default_analysis_view = COALESCE(?, default_analysis_view),
        show_explanatory_details = COALESCE(?, show_explanatory_details),
        updated_at = ?
    `).run(
      user.id,
      theme ?? null,
      emailNotifications ?? null,
      securityAlerts ?? null,
      scanCompletionNotifications ?? null,
      productUpdates ?? null,
      timeZone ?? null,
      language ?? null,
      defaultAnalysisView ?? null,
      showExplanatoryDetails ?? null,
      now,
      // update parameters
      theme ?? null,
      emailNotifications ?? null,
      securityAlerts ?? null,
      scanCompletionNotifications ?? null,
      productUpdates ?? null,
      timeZone ?? null,
      language ?? null,
      defaultAnalysisView ?? null,
      showExplanatoryDetails ?? null,
      now,
    );

    logActivity(user.id, "preferences_updated", "Account preferences updated", "success", "Saved updated UI and notification preferences");

    const updated = db.prepare(`SELECT * FROM user_preferences WHERE user_id = ?`).get(user.id) as PreferenceRow;

    return NextResponse.json({
      success: true,
      preferences: {
        theme: updated.theme,
        emailNotifications: Boolean(updated.email_notifications),
        securityAlerts: Boolean(updated.security_alerts),
        scanCompletionNotifications: Boolean(updated.scan_completion_notifications),
        productUpdates: Boolean(updated.product_updates),
        timeZone: updated.time_zone,
        language: updated.language,
        defaultAnalysisView: updated.default_analysis_view,
        showExplanatoryDetails: Boolean(updated.show_explanatory_details),
        updatedAt: updated.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update preferences";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
