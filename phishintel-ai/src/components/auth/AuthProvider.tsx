"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { safeNext, getSiteUrl } from "@/lib/authRedirect";

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  designation?: string;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthSnapshot {
  status: AuthStatus;
  user: AuthUser | null;
  error?: string;
}

interface AuthActions {
  register: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SESSION_KEY = "phishintel-session";
// The key Supabase v2 uses for the session in localStorage.
// Clearing it on sign-out prevents getSession() from restoring a stale session on reload.
const SUPABASE_SESSION_KEY = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0] ?? "ujulxbzyornwmqhtlley"}-auth-token`;

const INITIAL_SNAPSHOT: AuthSnapshot = { status: "loading", user: null };
const AuthContext = createContext<AuthActions | null>(null);

let snapshot = INITIAL_SNAPSHOT;
let initialized = false;
let lastManualSignOutAt = 0;
const listeners = new Set<() => void>();

export function wasManualSignOutRecently(): boolean {
  return Date.now() - lastManualSignOutAt < 2000;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function refreshSnapshot() {
  // refreshSnapshot is ONLY called as a last-resort when Supabase getSession()
  // has not returned yet or fails. It must not override a valid Supabase session.
  // If there is already a confirmed authenticated or loading state from Supabase,
  // do not downgrade it with a localStorage-only derivation.
  if (snapshot.status === "authenticated" && snapshot.user) {
    return;
  }

  try {
    const sessionEmail = typeof window !== "undefined" ? window.localStorage.getItem(SESSION_KEY) : null;
    if (sessionEmail) {
      snapshot = {
        status: "authenticated",
        user: {
          name: sessionEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          email: sessionEmail,
          designation: "Active analyst",
        },
      };
    } else {
      snapshot = { status: "unauthenticated", user: null };
    }
  } catch {
    snapshot = { status: "unauthenticated", user: null };
  }
  notify();
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
        window.localStorage.setItem(SESSION_KEY, session.user.email || "");
        snapshot = {
          status: "authenticated",
          user: {
            id: session.user.id,
            name:
              (session.user.user_metadata?.display_name as string) ||
              (session.user.user_metadata?.full_name as string) ||
              (session.user.user_metadata?.name as string) ||
              session.user.email?.split("@")[0] ||
              "Analyst",
            email: session.user.email || "",
            designation: (session.user.user_metadata?.designation as string) || "Active analyst",
          },
        };
        notify();
      } else {
        // No Supabase session — also clear any stale legacy key
        window.localStorage.removeItem(SESSION_KEY);
        snapshot = { status: "unauthenticated", user: null };
        notify();
      }
    }).catch(() => {
      refreshSnapshot();
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        window.localStorage.setItem(SESSION_KEY, session.user.email || "");
        snapshot = {
          status: "authenticated",
          user: {
            id: session.user.id,
            name:
              (session.user.user_metadata?.display_name as string) ||
              (session.user.user_metadata?.full_name as string) ||
              (session.user.user_metadata?.name as string) ||
              session.user.email?.split("@")[0] ||
              "Analyst",
            email: session.user.email || "",
            designation: (session.user.user_metadata?.designation as string) || "Active analyst",
          },
        };
        notify();
      } else if (event === "SIGNED_OUT") {
        window.localStorage.removeItem(SESSION_KEY);
        // Also remove the Supabase token so getSession() returns null on reload
        try { window.localStorage.removeItem(SUPABASE_SESSION_KEY); } catch {}
        snapshot = { status: "unauthenticated", user: null };
        notify();
      }
    });
  } catch {
    refreshSnapshot();
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
async function register(name: string, email: string, password: string) {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName) throw new Error("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");

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
      error.message.toLowerCase().includes("already exists")
    ) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }
    throw new Error(error.message || "Unable to create your account.");
  }

  if (data?.session?.user) {
    window.localStorage.setItem(SESSION_KEY, normalizedEmail);
    lastManualSignOutAt = 0;
    snapshot = {
      status: "authenticated",
      user: {
        id: data.session.user.id,
        name: normalizedName,
        email: normalizedEmail,
        designation: "Active analyst",
      },
    };
    notify();
  } else if (data?.user && !data.session) {
    throw new Error("Check your inbox for a confirmation link to activate your workspace.");
  }
}

/**
 * Sign in exclusively against Supabase Auth.
 */
async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Enter your email and password.");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    throw new Error("Email or password is incorrect.");
  }

  if (!data?.user) {
    throw new Error("No session was created. Please try again.");
  }

  window.localStorage.setItem(SESSION_KEY, data.user.email || normalizedEmail);
  lastManualSignOutAt = 0;
  snapshot = {
    status: "authenticated",
    user: {
      id: data.user.id,
      name:
        (data.user.user_metadata?.display_name as string) ||
        (data.user.user_metadata?.name as string) ||
        (data.user.user_metadata?.full_name as string) ||
        normalizedEmail.split("@")[0],
      email: data.user.email || normalizedEmail,
      designation: (data.user.user_metadata?.designation as string) || "Active analyst",
    },
  };
  notify();
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

    // 2. Clear ALL client-side session storage (belt-and-suspenders)
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SUPABASE_SESSION_KEY);
      // Also wipe any other sb-* keys in case the project ref changes
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          window.localStorage.removeItem(key);
        }
      }
      document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
    } catch {}

    // 3. Update in-memory snapshot so React re-renders immediately
    snapshot = { status: "unauthenticated", user: null };
    notify();

    // 4. Hard-redirect to landing page — prevents back-button access to dashboard.
    // We intentionally use window.location (not Next router) so React state is fully
    // reset and the browser does not restore the previous page on Back.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to sign out.");
  }
}

const actions: AuthActions = { register, signIn, signInWithGoogle, signOut };

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  if (initialUser && snapshot.status === "loading") {
    snapshot = { status: "authenticated", user: initialUser };
  }
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
