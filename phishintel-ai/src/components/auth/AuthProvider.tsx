"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";

export interface AuthUser {
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
  signOut: () => void;
}

const USERS_KEY = "phishintel-users";
const SESSION_KEY = "phishintel-session";
const LEGACY_USERS_KEY = "phishguard-users";
const LEGACY_SESSION_KEY = "phishguard-session";
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
  const rawUsers = window.localStorage.getItem(USERS_KEY) || window.localStorage.getItem(LEGACY_USERS_KEY);
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
    const email = window.localStorage.getItem(SESSION_KEY) || window.localStorage.getItem(LEGACY_SESSION_KEY);
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
        window.localStorage.removeItem(LEGACY_SESSION_KEY);
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
  window.addEventListener("storage", (event) => {
    if (
      event.key === USERS_KEY ||
      event.key === SESSION_KEY ||
      event.key === LEGACY_USERS_KEY ||
      event.key === LEGACY_SESSION_KEY ||
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

  try {
    const users = readUsers();
    if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error("An account with this email already exists. Sign in instead.");
    }

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const user: StoredUser = {
      name: normalizedName,
      email: normalizedEmail,
      salt: bytesToHex(salt),
      passwordHash: await hashPassword(password, salt),
    };

    window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    window.localStorage.setItem(SESSION_KEY, normalizedEmail);
    lastManualSignOutAt = 0;
    snapshot = {
      status: "authenticated",
      user: { name: user.name, email: user.email },
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
      user: { name: user.name, email: user.email },
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

function signOut() {
  try {
    lastManualSignOutAt = Date.now();
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
    try {
      document.cookie = "phishintel_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
      document.cookie = "phishguard_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;";
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

const actions: AuthActions = { register, signIn, signOut };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={actions}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");

  const authState = useSyncExternalStore(subscribe, () => snapshot, () => INITIAL_SNAPSHOT);
  return { ...authState, ...context };
}
