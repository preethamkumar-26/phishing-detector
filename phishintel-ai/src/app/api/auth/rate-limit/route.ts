import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  APP_AUTH_COOLDOWN_SECONDS,
  AUTH_RATE_LIMIT_ACTIONS,
  type AuthRateLimitAction,
} from "@/lib/authRateLimitConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RateLimitRecord = { cooldownEndsAt: number };

// This map is intentionally kept server-side: clients can never alter the
// cooldown end time. Replace it with a shared store (for example Redis) when
// deploying more than one Next.js instance.
const cooldowns = new Map<string, RateLimitRecord>();

function getClientKey(request: NextRequest, action: AuthRateLimitAction) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const address = forwardedFor?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  return createHash("sha256").update(`${action}:${address}`).digest("hex");
}

function response(cooldownEndsAt: number | null, now = Date.now()) {
  const retryAfterSeconds = cooldownEndsAt
    ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000))
    : 0;
  return NextResponse.json(
    { allowed: retryAfterSeconds === 0, retryAfterSeconds },
    { status: retryAfterSeconds === 0 ? 200 : 429 }
  );
}

export async function POST(request: NextRequest) {
  let action: AuthRateLimitAction = "registration";
  try {
    const body = await request.json();
    if (AUTH_RATE_LIMIT_ACTIONS.includes(body.action)) action = body.action;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const now = Date.now();
  const key = getClientKey(request, action);
  const existing = cooldowns.get(key);
  if (existing && existing.cooldownEndsAt > now) {
    return response(existing.cooldownEndsAt, now);
  }

  const cooldownEndsAt = now + APP_AUTH_COOLDOWN_SECONDS * 1000;
  cooldowns.set(key, { cooldownEndsAt });
  return response(null, now);
}
