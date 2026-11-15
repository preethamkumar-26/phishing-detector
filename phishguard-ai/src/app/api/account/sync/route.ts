import { NextResponse } from "next/server";
import { upsertUser, createSession, logActivity, findUserByEmail, verifyPassword } from "@/lib/server/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, name, email, salt, passwordHash, password } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (action === "register") {
      if (!name || !salt || !passwordHash) {
        return NextResponse.json({ error: "Missing registration credentials." }, { status: 400 });
      }
      const user = upsertUser(normalizedEmail, name, salt, passwordHash);
      const session = createSession(user.id);

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
        token: session.token,
      });

      response.cookies.set("phishguard_session", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    if (action === "login") {
      const user = findUserByEmail(normalizedEmail);
      if (!user) {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }

      if (password) {
        const isValid = verifyPassword(password, user.salt, user.password_hash);
        if (!isValid) {
          logActivity(user.id, "login_failed", "Failed sign-in attempt", "failure", "Password mismatch");
          return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
        }
      }

      const session = createSession(user.id);
      logActivity(user.id, "login_success", "Signed in successfully", "success", "Workstation session created");

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, email: user.email },
        token: session.token,
      });

      response.cookies.set("phishguard_session", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });

      return response;
    }

    if (action === "logout") {
      const response = NextResponse.json({ success: true });
      response.cookies.delete("phishguard_session");
      return response;
    }

    // Default sync of current user identity
    let existing = findUserByEmail(normalizedEmail);
    if (!existing && name && salt && passwordHash) {
      existing = upsertUser(normalizedEmail, name, salt, passwordHash);
    }
    if (existing) {
      const session = createSession(existing.id);
      const response = NextResponse.json({
        success: true,
        user: { id: existing.id, name: existing.name, email: existing.email },
        token: session.token,
      });
      response.cookies.set("phishguard_session", session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return response;
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
