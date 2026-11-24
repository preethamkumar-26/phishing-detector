import { NextResponse } from "next/server";
import {
  createSession,
  findOrCreateSupabaseUser,
  getUserFromSessionCookie,
  verifySupabaseAccessToken,
} from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";

function getSessionCookie(req: Request): string | null {
  return req.headers.get("cookie")?.match(/(?:^|;\s*)phishintel_session=([^;]+)/)?.[1] ?? null;
}

export async function POST(req: Request) {
  try {
    const authorization = req.headers.get("authorization");
    const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) {
      return NextResponse.json({ error: "A valid Supabase session is required." }, { status: 401 });
    }

    const identity = await verifySupabaseAccessToken(token);
    const user = findOrCreateSupabaseUser(identity.email, identity.name);
    const existingCookie = getSessionCookie(req);
    const existingUser = getUserFromSessionCookie(existingCookie);
    const sessionToken = existingCookie && existingUser?.id === user.id
      ? existingCookie
      : createSession(user.id).token;

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
    response.cookies.set("phishintel_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set("phishintel_access", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to synchronize the authenticated account.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  const token = getSessionCookie(req);
  if (token) {
    getDb().prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("phishintel_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("phishintel_access", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
