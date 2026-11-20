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

interface StoredUser extends AuthUser {
  salt: string;
  passwordHash: string;
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
  signOut: () => void;
}

const USERS_KEY = "phishintel-users";
const SESSION_KEY = "phishintel-session";
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

function readUsers(): StoredUser[] {
  const rawUsers = window.localStorage.getItem(USERS_KEY);
  if (!rawUsers) return [];

  const users: unknown = JSON.parse(rawUsers);
  if (!Array.isArray(users)) {
    throw new Error("Saved account data is invalid. Clear this site's saved data and try again.");
  }

  return users.map((user: unknown) => {
    if (
      typeof user !== "object" ||
      user === null ||
      !("name" in user) ||
      typeof user.name !== "string" ||
      !("email" in user) ||
      typeof user.email !== "string" ||
      !("salt" in user) ||
      typeof user.salt !== "string" ||
      !("passwordHash" in user) ||
      typeof user.passwordHash !== "string"
    ) {
      throw new Error("Saved account data is invalid. Clear this site's saved data and try again.");
    }

    return {
      name: user.name,
      email: user.email,
      designation: typeof (user as Record<string, unknown>).designation === "string" ? ((user as Record<string, unknown>).designation as string) : undefined,
      salt: user.salt,
      passwordHash: user.passwordHash,
    };
  });
}

function refreshSnapshot() {
  try {
    const email = window.localStorage.getItem(SESSION_KEY);
    const user = email
      ? readUsers().find((storedUser) => storedUser.email === email)
      : undefined;

    if (user) {
      snapshot = {
        status: "authenticated",
        user: { name: user.name, email: user.email, designation: user.designation },
      };
      // Sync session to backend cookie
      try {
        fetch("/api/account/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "sync",
            email: user.email,
            name: user.name,
            salt: user.salt,
            passwordHash: user.passwordHash,
          }),
        }).catch(() => {});
      } catch {}
    } else {
      if (email) {
        window.localStorage.removeItem(SESSION_KEY);
      }
      snapshot = { status: "unauthenticated", user: null };
    }
  } catch (error) {
    snapshot = {
      status: "error",
      user: null,
      error: error instanceof Error ? error.message : "Unable to load saved account data.",
    };
  }
  notify();
}

function initialize() {
  if (initialized) return;
  initialized = true;
  refreshSnapshot();

  // Listen to Supabase Auth state changes
  try {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        snapshot = {
          status: "authenticated",
          user: {
            id: session.user.id,
            name: (session.user.user_metadata?.name as string) || session.user.email?.split("@")[0] || "Analyst",
            email: session.user.email || "",
            designation: (session.user.user_metadata?.designation as string) || "Active analyst",
          },
        };
        notify();
      }
    }).catch(() => {});

    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        snapshot = {
          status: "authenticated",
          user: {
            id: session.user.id,
            name: (session.user.user_metadata?.name as string) || session.user.email?.split("@")[0] || "Analyst",
            email: session.user.email || "",
            designation: (session.user.user_metadata?.designation as string) || "Active analyst",
          },
        };
        notify();
      } else if (event === "SIGNED_OUT") {
        refreshSnapshot();
      }
    });
  } catch {}

  window.addEventListener("storage", (event) => {
    if (
      event.key === USERS_KEY ||
      event.key === SESSION_KEY ||
      event.key === null
    ) {
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

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer>) {
  if (!window.crypto?.subtle) {
    throw new Error("Secure password hashing is unavailable in this browser context.");
  }

  const key = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 210_000 },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function hashesMatch(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function register(name: string, email: string, password: string) {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedName) throw new Error("Enter your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");

  let supaUserId: string | undefined;

  // 1. Register with Supabase Auth
  try {
    const { data: supaData, error: supaError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: normalizedName,
          designation: "Active analyst",
        },
      },
    });

    if (supaError) {
      if (
        supaError.message.toLowerCase().includes("already registered") ||
        supaError.message.toLowerCase().includes("already exists")
      ) {
        throw new Error("An account with this email already exists. Sign in instead.");
      }
      console.warn("[Supabase] Registration note:", supaError.message);
    } else if (supaData?.user) {
      supaUserId = supaData.user.id;
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("An account")) throw err;
  }

  // 2. Also register in local cache & SQLite backend for seamless offline fallback
  try {
    const users = readUsers();
    if (users.some((user) => user.email === normalizedEmail) && !supaUserId) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const user: StoredUser = {
      name: normalizedName,
      email: normalizedEmail,
      salt: bytesToHex(salt),
      passwordHash: await hashPassword(password, salt),
    };

    if (!users.some((u) => u.email === normalizedEmail)) {
      window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    }
    window.localStorage.setItem(SESSION_KEY, normalizedEmail);
    lastManualSignOutAt = 0;
    snapshot = {
      status: "authenticated",
      user: { id: supaUserId, name: user.name, email: user.email, designation: "Active analyst" },
    };
    notify();

    // Sync to backend SQLite database
    try {
      fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name: user.name,
          email: user.email,
          salt: user.salt,
          passwordHash: user.passwordHash,
        }),
      }).catch(() => {});
    } catch {}
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("An account")) throw error;
    throw new Error(error instanceof Error ? error.message : "Unable to create your account.");
  }
}

async function signIn(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Enter your email and password.");

  let supaSuccess = false;
  let supaUser: { id?: string; name?: string; email?: string } | null = null;

  // 1. Attempt Supabase Auth login
  try {
    const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (!supaError && supaData?.user) {
      supaSuccess = true;
      supaUser = {
        id: supaData.user.id,
        name: (supaData.user.user_metadata?.name as string) || normalizedEmail.split("@")[0],
        email: supaData.user.email || normalizedEmail,
      };
    }
  } catch (err) {
    console.warn("[Supabase] signInWithPassword notice:", err);
  }

  // 2. If Supabase succeeded, update session
  if (supaSuccess && supaUser) {
    window.localStorage.setItem(SESSION_KEY, supaUser.email || normalizedEmail);
    lastManualSignOutAt = 0;
    snapshot = {
      status: "authenticated",
      user: {
        id: supaUser.id,
        name: supaUser.name || "Analyst",
        email: supaUser.email || normalizedEmail,
        designation: "Active analyst",
      },
    };
    notify();

    try {
      fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          name: supaUser.name || "Analyst",
          email: supaUser.email || normalizedEmail,
          password,
        }),
      }).catch(() => {});
    } catch {}
    return;
  }

  // 3. Fallback to local user store (for offline support & test accounts)
  try {
    const user = readUsers().find((storedUser) => storedUser.email === normalizedEmail);
    if (!user) throw new Error("Email or password is incorrect.");

    const passwordHash = await hashPassword(password, hexToBytes(user.salt));
    if (!hashesMatch(passwordHash, user.passwordHash)) {
      throw new Error("Email or password is incorrect.");
    }

    window.localStorage.setItem(SESSION_KEY, user.email);
    lastManualSignOutAt = 0;
    snapshot = {
      status: "authenticated",
      user: { name: user.name, email: user.email, designation: user.designation || "Active analyst" },
    };
    notify();

    // Sync to backend SQLite database
    try {
      fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          name: user.name,
          email: user.email,
          salt: user.salt,
          passwordHash: user.passwordHash,
          password,
        }),
      }).catch(() => {});
    } catch {}
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to sign in.");
  }
}

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

function signOut() {
  try {
    lastManualSignOutAt = Date.now();

    try {
      supabase.auth.signOut().catch(() => {});
    } catch {}

    window.localStorage.removeItem(SESSION_KEY);
    try {
      document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
      fetch("/api/account/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      }).catch(() => {});
    } catch {}
    snapshot = { status: "unauthenticated", user: null };
    notify();
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
