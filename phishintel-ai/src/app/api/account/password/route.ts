import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  AuthenticationError,
  authenticateRequest,
  hashPassword,
  logActivity,
} from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function POST(req: Request) {
  try {
    const user = await authenticateRequest(req);
    const body = await req.json();

    const { currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json({ error: "New password is required." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match." }, { status: 400 });
    }
    if (typeof currentPassword === "string" && currentPassword === newPassword) {
      return NextResponse.json({ error: "New password must be different from current password." }, { status: 400 });
    }

    // Generate new salt & hash for local SQLite database
    const newSalt = crypto.randomBytes(16).toString("hex");
    const newHash = hashPassword(newPassword, newSalt);
    const now = new Date().toISOString();

    const db = getDb();
    db.prepare(`
      UPDATE users
      SET password_hash = ?, salt = ?, updated_at = ?
      WHERE id = ?
    `).run(newHash, newSalt, now, user.id);

    logActivity(user.id, "password_changed", "Password updated successfully", "success", "Credentials rotated");

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Your new credentials are now active.",
      updatedAt: now,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to change password.";
    return NextResponse.json({ error: message }, { status: error instanceof AuthenticationError ? 401 : 400 });
  }
}
