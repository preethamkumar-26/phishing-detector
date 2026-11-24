import { NextResponse } from "next/server";
import { AuthenticationError, authenticateRequest, logActivity } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

export async function GET(req: Request) {
  try {
    const user = await authenticateRequest(req);
    return NextResponse.json({
      profile: {
        id: user.id,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        designation: user.designation,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await authenticateRequest(req);
    const body = await req.json();

    // Whitelist allowed fields
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : user.name;
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : user.phone;
    const organization = typeof body.organization === "string" ? body.organization.trim() || null : user.organization;
    const designation = typeof body.designation === "string" ? body.designation.trim() || null : user.designation;
    const bio = typeof body.bio === "string" ? body.bio.trim() || null : user.bio;

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (fullName.length > 100) {
      return NextResponse.json({ error: "Full name must be 100 characters or fewer." }, { status: 400 });
    }
    if (phone && phone.length > 30) {
      return NextResponse.json({ error: "Phone number is too long." }, { status: 400 });
    }
    if (bio && bio.length > 500) {
      return NextResponse.json({ error: "Bio must be 500 characters or fewer." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const db = getDb();
    db.prepare(`
      UPDATE users
      SET name = ?, phone = ?, organization = ?, designation = ?, bio = ?, updated_at = ?
      WHERE id = ?
    `).run(fullName, phone, organization, designation, bio, now, user.id);

    logActivity(user.id, "profile_updated", "Profile details updated", "success", "Updated personal information");

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        fullName,
        email: user.email,
        phone,
        organization,
        designation,
        bio,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: now,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: error instanceof AuthenticationError ? 401 : 400 });
  }
}
