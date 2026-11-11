"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";

export interface AuthUser {
  name: string;
  email: string;
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

const USERS_KEY = "phishguard-users";
const SESSION_KEY = "phishguard-session";
const INITIAL_SNAPSHOT: AuthSnapshot = { status: "loading", user: null };
const AuthContext = createContext<AuthActions | null>(null);

let snapshot = INITIAL_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

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
        user: { name: user.name, email: user.email },
      };
    } else {
      if (email) window.localStorage.removeItem(SESSION_KEY);
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
    if (event.key === USERS_KEY || event.key === SESSION_KEY || event.key === null) {
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
    snapshot = {
      status: "authenticated",
      user: { name: user.name, email: user.email },
    };
    notify();
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
    snapshot = {
      status: "authenticated",
      user: { name: user.name, email: user.email },
    };
    notify();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unable to sign in.");
  }
}

function signOut() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
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
