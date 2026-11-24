"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { safeNext, getSiteUrl } from "@/lib/authRedirect";
import { APP_AUTH_COOLDOWN_SECONDS } from "@/lib/authRateLimitConfig";
import { syncServerSession } from "@/lib/syncServerSession";

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  designation?: string;
  avatarUrl?: string;
  provider?: string;
  providers?: string[];
  identities?: Array<{
    id: string;
    provider: string;
    identity_data?: Record<string, unknown>;
  }>;
  hasGoogle?: boolean;
  hasEmailPassword?: boolean;
  createdAt?: string;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthSnapshot {
  status: AuthStatus;
  user: AuthUser | null;
  error?: string;
}

interface AuthActions {
  register: (name: string, email: string, password: string) => Promise<{ requiresConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
}

export class AuthRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds = APP_AUTH_COOLDOWN_SECONDS) {
    super("Too many registration attempts. Please wait before trying again.");
    this.name = "AuthRateLimitError";
  }
}

const SESSION_KEY = "phishintel-session";
// The key Supabase v2 uses for the session in localStorage.
// Clearing it on sign-out prevents getSession() from restoring a stale session on reload.
const SUPABASE_SESSION_KEY = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "ujulxbzyornwmqhtlley"}-auth-token`;

let lastManualSignOutAt = 0;

export function wasManualSignOutRecently(): boolean {
  return Date.now() - lastManualSignOutAt < 5000;
}

function getInitialSnapshot(): AuthSnapshot {
  if (typeof window === "undefined") {
    return { status: "unauthenticated", user: null };
  }
  try {
    if (Date.now() - lastManualSignOutAt < 5000) {
      return { status: "unauthenticated", user: null };
    }
    const hasSbToken = Object.keys(window.localStorage).some(
      (k) => (k.startsWith("sb-") && k.endsWith("-auth-token")) || k === SESSION_KEY
    );
    const hasCookie = document.cookie.includes("phishintel_session=");
    if (!hasSbToken && !hasCookie) {
      return { status: "unauthenticated", user: null };
    }
  } catch {}
  return { status: "loading", user: null };
}

const INITIAL_SNAPSHOT: AuthSnapshot = { status: "unauthenticated", user: null };
const AuthContext = createContext<AuthActions | null>(null);

let snapshot: AuthSnapshot = getInitialSnapshot();
let initialized = false;
const listeners = new Set<() => void>();

export function mapSessionToUser(sessionUser: import("@supabase/supabase-js").User): AuthUser {
  const meta = sessionUser.user_metadata || {};
  const appMeta = sessionUser.app_metadata || {};

  // Extract all provider identities dynamically from Supabase Auth
  const rawProviders: string[] = Array.isArray(appMeta.providers)
    ? appMeta.providers.map((p: unknown) => String(p).toLowerCase())
    : (appMeta.provider ? [String(appMeta.provider).toLowerCase()] : []);

  const identitiesList = Array.isArray(sessionUser.identities) ? sessionUser.identities : [];
  for (const ident of identitiesList) {
    if (ident.provider && !rawProviders.includes(ident.provider.toLowerCase())) {
      rawProviders.push(ident.provider.toLowerCase());
    }
  }

  const hasGoogle = rawProviders.includes("google");
  const hasEmailPassword = rawProviders.includes("email");

  let provider = "Email";
  if (hasGoogle && hasEmailPassword) {
    provider = "Google + Email";
  } else if (hasGoogle) {
    provider = "Google";
  } else if (hasEmailPassword) {
    provider = "Email";
  }

  // Google OAuth sends 'full_name' or 'name', whereas our email signup sends 'name' or 'display_name'
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.display_name as string) ||
    sessionUser.email?.split("@")[0] ||
    "Analyst";

  // Google OAuth sends 'avatar_url' or 'picture'
  const avatarUrl =
    (meta.avatar_url as string) ||
    (meta.picture as string) ||
    undefined;

  return {
    id: sessionUser.id,
    name: name.trim(),
    email: sessionUser.email || "",
    designation: (meta.designation as string) || (hasGoogle ? "Google Verified Analyst" : "Active analyst"),
    avatarUrl,
    provider,
    providers: rawProviders,
    identities: identitiesList.map((i) => ({
      id: i.id,
      provider: i.provider,
      identity_data: i.identity_data,
    })),
    hasGoogle,
    hasEmailPassword,
    createdAt: sessionUser.created_at,
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function refreshSnapshot() {
  if (snapshot.status === "authenticated" && snapshot.user) {
    return;
  }
  // When Supabase has completed initialization and found no session,
  // do not synthesize a user out of stale localStorage email.
  if (initialized) {
    snapshot = { status: "unauthenticated", user: null };
    notify();
  }
}

function initialize() {
  if (initialized) return;
  initialized = true;

  // Purge any legacy client-stored accounts or password hashes
  try {
    window.localStorage.removeItem("phishintel-users");
  } catch {}

  // Active Supabase Auth session listener
  try {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void syncServerSession(session.access_token).catch((error) => {
          console.error("Unable to synchronize the server account session:", error);
        });
        const user = mapSessionToUser(session.user);
        window.localStorage.setItem(SESSION_KEY, user.email);
        snapshot = {
          status: "authenticated",
          user,
        };
        notify();
      } else {
        // No Supabase session — revoke any stale server-side account session.
        window.localStorage.removeItem(SESSION_KEY);
        void fetch("/api/account/sync", { method: "DELETE", credentials: "include" }).catch((error) => {
          console.error("Unable to revoke the stale server account session:", error);
        });
        try {
          document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
        } catch {}
        snapshot = { status: "unauthenticated", user: null };
        notify();
      }
    }).catch(() => {
      snapshot = { status: "unauthenticated", user: null };
      notify();
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void syncServerSession(session.access_token).catch((error) => {
          console.error("Unable to synchronize the server account session:", error);
        });
        const user = mapSessionToUser(session.user);
        window.localStorage.setItem(SESSION_KEY, user.email);
        snapshot = {
          status: "authenticated",
          user,
        };
        notify();
      } else if (event === "SIGNED_OUT") {
        window.localStorage.removeItem(SESSION_KEY);
        try { window.localStorage.removeItem(SUPABASE_SESSION_KEY); } catch {}
        void fetch("/api/account/sync", { method: "DELETE", credentials: "include" }).catch((error) => {
          console.error("Unable to revoke the server account session:", error);
        });
        try {
          document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
        } catch {}
        snapshot = { status: "unauthenticated", user: null };
        notify();
      }
    });
  } catch {
    snapshot = { status: "unauthenticated", user: null };
    notify();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_KEY || event.key === null) {
      lastManualSignOutAt = 0;
      refreshSnapshot();
    }
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initialize();
  return () => listeners.delete(listener);
}

/**
 * Register a new user account exclusively in Supabase Auth.
 * Never stores credentials or password hashes in local storage or SQLite.
 */
async function register(name: string, email: string, password: string): Promise<{ requiresConfirmation?: boolean }> {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName) throw new Error("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");

  // Ask our server before contacting Supabase. The server owns this clock, so
  // refreshing the page or changing client time cannot bypass the cooldown.
  const limitResponse = await fetch("/api/auth/rate-limit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "registration" }),
  });
  const limit = await limitResponse.json().catch(() => null) as { retryAfterSeconds?: number } | null;
  if (!limitResponse.ok || (limit?.retryAfterSeconds ?? 0) > 0) {
    throw new AuthRateLimitError(limit?.retryAfterSeconds);
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: normalizedName,
        display_name: normalizedName,
        designation: "Active analyst",
      },
    },
  });

  if (error) {
    if (
      error.message.toLowerCase().includes("already registered") ||
      error.message.toLowerCase().includes("already exists") ||
      (error as { code?: string }).code === "user_already_exists"
    ) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    if ((error as { status?: number }).status === 429 || error.message.toLowerCase().includes("rate limit")) {
      throw new AuthRateLimitError();
    }
    throw new Error(error.message || "Unable to create your account.");
  }

  // Supabase returns identities: [] when the user already exists (enumeration protection)
  if (data?.user?.identities && data.user.identities.length === 0) {
    throw new Error("An account with this email already exists. Sign in instead.");
  }

  if (data?.session?.user) {
    await syncServerSession(data.session.access_token);
    const user = mapSessionToUser(data.session.user);
    window.localStorage.setItem(SESSION_KEY, user.email);
    lastManualSignOutAt = 0;
    snapshot = {
      status: "authenticated",
      user,
    };
    notify();
    return { requiresConfirmation: false };
  } else if (data?.user && !data.session) {
    return { requiresConfirmation: true };
  }

  return { requiresConfirmation: false };
}

/**
 * Sign in exclusively against Supabase Auth with detailed diagnostic error reporting.
 */
async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Enter your email and password.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    const code = (error as { code?: string }).code;
    const lower = (error.message || "").toLowerCase();

    if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
      throw new Error("Your email address has not been confirmed yet. Please check your inbox for the activation link.");
    }
    if (
      code === "invalid_credentials" ||
      lower.includes("invalid login credentials") ||
      lower.includes("invalid email or password")
    ) {
      throw new Error("Invalid email or password. Please verify your credentials and try again.");
    }
    if ((error as { status?: number }).status === 429 || lower.includes("rate limit")) {
      throw new Error("Too many login attempts. Please wait a moment before trying again.");
    }
    throw new Error(error.message || "Email or password is incorrect.");
  }

  if (!data?.user) {
    throw new Error("No session was created. Please try again.");
  }

  const user = mapSessionToUser(data.user);
  if (!data.session) {
    throw new Error("No active authentication session was created.");
  }
  await syncServerSession(data.session.access_token);
  window.localStorage.setItem(SESSION_KEY, user.email);
  lastManualSignOutAt = 0;
  snapshot = {
    status: "authenticated",
    user,
  };
  notify();
}

/**
 * Resend sign-up confirmation email via Supabase Auth.
 */
async function resendConfirmation(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter your email address.");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
  });
  if (error) {
    const lower = (error.message || "").toLowerCase();
    if ((error as { status?: number }).status === 429 || lower.includes("rate limit") || lower.includes("seconds")) {
      throw new Error("Confirmation email was recently sent. Please check your inbox or wait 30 seconds before requesting another.");
    }
    throw new Error(error.message || "Failed to resend confirmation email.");
  }
}

/**
 * Request password recovery email via Supabase Auth.
 * Enforces email syntax validation, trims whitespace, protects against enumeration,
 * and passes the dynamic absolute redirect URL to /reset-password.
 */
async function resetPasswordForEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Enter your email address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const siteUrl = getSiteUrl();
  const redirectTo = `${siteUrl}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    const lower = (error.message || "").toLowerCase();
    if ((error as { status?: number }).status === 429 || lower.includes("rate limit") || lower.includes("seconds")) {
      throw new Error("Password reset requests are temporarily rate-limited. Please wait a moment before trying again.");
    }
    // Prevent account enumeration: do not disclose if user does not exist
    if (lower.includes("user not found") || lower.includes("not registered")) {
      return;
    }
    throw new Error(error.message || "Failed to submit password reset request.");
  }
}

/**
 * Sign in with Google identity provider through Supabase Auth.
 */
async function signInWithGoogle(next = "/dashboard") {
  try {
    const siteUrl = getSiteUrl();
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    if (error) {
      throw new Error(error.message || "Failed to initiate Google sign-in.");
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to continue with Google.");
  }
}

/**
 * Sign out from Supabase Auth and clear ALL local session state.
 * Awaits Supabase sign-out so the SIGNED_OUT event fires before we redirect.
 * Also manually clears the Supabase localStorage token so getSession() returns
 * null on a hard reload — preventing session restoration after sign-out.
 */
async function signOut() {
  try {
    lastManualSignOutAt = Date.now();

    // 1. Tell Supabase to invalidate the server-side refresh token
    try {
      await supabase.auth.signOut();
    } catch {}

    // 2. Revoke the server-side account session and clear its HttpOnly cookie.
    try {
      const response = await fetch("/api/account/sync", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        console.error("Unable to revoke the server account session.");
      }
    } catch (error) {
      console.error("Unable to revoke the server account session:", error);
    }

    // 3. Clear ALL client-side session storage (belt-and-suspenders)
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SUPABASE_SESSION_KEY);
      window.localStorage.removeItem("pg.profile");
      // Also wipe any other sb-* keys in case the project ref changes
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          window.localStorage.removeItem(key);
        }
      }
      document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
      if (typeof document !== "undefined" && document.body) {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    } catch {}

    // 3. Update in-memory snapshot so React re-renders immediately
    snapshot = { status: "unauthenticated", user: null };
    notify();

    // 4. Clean navigation to landing page with history replacement
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to sign out.");
  }
}

/**
 * Refreshes user identities and session directly from Supabase Auth.
 */
async function refreshUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const mapped = mapSessionToUser(user);
      snapshot = {
        status: "authenticated",
        user: mapped,
      };
      notify();
    }
  } catch {}
}

const actions: AuthActions = { register, signIn, signInWithGoogle, signOut, refreshUser, resendConfirmation, resetPasswordForEmail };

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  return <AuthContext.Provider value={actions}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");

  if (typeof window !== "undefined" && !initialized) {
    initialize();
  }

  const authState = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => (snapshot.status !== "loading" ? snapshot : INITIAL_SNAPSHOT)
  );
  return { ...authState, ...context };
}
