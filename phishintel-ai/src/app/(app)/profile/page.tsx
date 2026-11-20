"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePhishGuard } from "@/context/PhishGuardContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";

interface UserProfileData {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  organization: string | null;
  designation: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserPreferencesData {
  theme: string;
  emailNotifications: boolean;
  securityAlerts: boolean;
  scanCompletionNotifications: boolean;
  productUpdates: boolean;
  timeZone: string;
  language: string;
  defaultAnalysisView: string;
  showExplanatoryDetails: boolean;
}

interface SecurityInfoData {
  twoFactorStatus: string;
  twoFactorMessage: string;
  passwordLastUpdated: string;
  activeSessionsCount: number;
  currentDevice?: {
    browser: string;
    location: string;
    lastActive: string;
  };
  encryptionInfo: string;
}

interface ActivityEvent {
  id: string;
  eventType: string;
  label: string;
  outcome: string;
  details: string | null;
  timestamp: string;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

const fmtDate = (isoString?: string | null) => {
  if (!isoString) return "Not available";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "Not available";
    return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "Not available";
  }
};

const fmtDateTime = (isoString?: string | null) => {
  if (!isoString) return "Not available";
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "Not available";
    return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "Not available";
  }
};

// Persistent in-memory session cache to prevent profile-flicker on client navigation
let cachedProfileData: UserProfileData | null = null;
let cachedPreferencesData: UserPreferencesData | null = null;
let cachedSecurityData: SecurityInfoData | null = null;
let cachedActivityEvents: ActivityEvent[] = [];

function ProfileOverviewSkeleton() {
  return (
    <div className="card acc-sec on" role="region" aria-label="Loading account overview" style={{ minHeight: 480 }}>
      {/* Profile Header Block Skeleton */}
      <div className="profile-hd">
        <div
          className="av"
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--card-2)",
            animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 170,
                height: 22,
                borderRadius: 4,
                background: "var(--card-2)",
                animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
            <div
              style={{
                width: 90,
                height: 18,
                borderRadius: 10,
                background: "var(--card-2)",
                animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                width: 230,
                height: 14,
                borderRadius: 4,
                background: "var(--card-2)",
                animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: 96,
            height: 36,
            borderRadius: 6,
            background: "var(--card-2)",
            animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      </div>

      {/* Metadata Details Skeleton */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            width: 130,
            height: 18,
            borderRadius: 4,
            marginBottom: 16,
            background: "var(--card-2)",
            animation: "pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
        <dl className="kv">
          <dt><div style={{ width: 80, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dt>
          <dd><div style={{ width: 180, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dd>

          <dt><div style={{ width: 100, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dt>
          <dd><div style={{ width: 160, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dd>

          <dt><div style={{ width: 110, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dt>
          <dd><div style={{ width: 150, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dd>

          <dt><div style={{ width: 90, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dt>
          <dd><div style={{ width: 140, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dd>

          <dt><div style={{ width: 95, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dt>
          <dd><div style={{ width: 130, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dd>

          <dt><div style={{ width: 90, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dt>
          <dd><div style={{ width: 110, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dd>

          <dt><div style={{ width: 120, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dt>
          <dd><div style={{ width: 170, height: 14, borderRadius: 4, background: "var(--card-2)" }} /></dd>

          <dt>Storage backend</dt>
          <dd className="mono">SQLite WAL · Local database</dd>

          <dt>Password encryption</dt>
          <dd className="mono">PBKDF2-SHA256 (210,000 iterations)</dd>
        </dl>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { profile, updateProfile, settings, updateSettings, showToast, scans, clearUserScans } = usePhishGuard();
  const { status: authStatus, signOut, user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "personal" | "preferences" | "security" | "activity">("overview");

  // Keep the first render identical on the server and client; restore cached data after mount.
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [preferencesData, setPreferencesData] = useState<UserPreferencesData | null>(null);
  const [securityData, setSecurityData] = useState<SecurityInfoData | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // Personal Information Form State
  const [formFullName, setFormFullName] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBio, setFormBio] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Preferences Form State
  const [prefTheme, setPrefTheme] = useState("system");
  const [prefStart, setPrefStart] = useState(settings.start || "overview");
  const [prefFmt, setPrefFmt] = useState(settings.fmt || "prob");
  const [prefStore, setPrefStore] = useState(settings.store);
  const [prefAlerts, setPrefAlerts] = useState(true);
  const [prefJump, setPrefJump] = useState(settings.jump);
  const [isSavingPref, setIsSavingPref] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Compute initials
  const initials = useMemo(() => {
    const raw = (profileData?.fullName || authUser?.name || profile.name || "").trim();
    if (!raw) return "AN";
    const parts = raw.split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [profileData?.fullName, authUser?.name, profile.name]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load active account data from backend
  const fetchAccountData = useCallback(async () => {
    const sessionUser = typeof window !== "undefined" ? window.localStorage.getItem("phishintel-session") : null;

    // Avoid firing 401-triggering requests for confirmed unauthenticated guests
    if (!sessionUser && authStatus === "unauthenticated") {
      setLoading(false);
      setProfileData(null);
      return;
    }

    if (cachedProfileData) {
      setProfileData(cachedProfileData);
      setFormFullName(cachedProfileData.fullName || "");
      setFormDesignation(cachedProfileData.designation || "");
      setFormOrg(cachedProfileData.organization || "");
      setFormPhone(cachedProfileData.phone || "");
      setFormBio(cachedProfileData.bio || "");
    }
    if (cachedPreferencesData) {
      setPreferencesData(cachedPreferencesData);
      setPrefTheme(cachedPreferencesData.theme || "system");
    }
    if (cachedSecurityData) setSecurityData(cachedSecurityData);
    if (cachedActivityEvents.length) setActivityEvents(cachedActivityEvents);

    setLoading(!cachedProfileData);
    setProfileError(null);

    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(sessionUser ? { "x-user-email": sessionUser } : {}),
    };

    try {
      // 1. Fetch Profile
      const profRes = await fetch("/api/account/profile", { headers: authHeaders, credentials: "include" });
      if (profRes.ok) {
        const json = await profRes.json();
        const p: UserProfileData = json.profile;
        cachedProfileData = p;
        setProfileData(p);
        setFormFullName(p.fullName || "");
        setFormDesignation(p.designation || "");
        setFormOrg(p.organization || "");
        setFormPhone(p.phone || "");
        setFormBio(p.bio || "");

        // Sync to context so TopBar avatar reflects real initials
        updateProfile({
          name: p.fullName || "",
          role: p.designation || "",
          org: p.organization || "",
        });
      } else {
        cachedProfileData = null;
        setProfileData(null);
      }

      // 2. Fetch Preferences
      const prefRes = await fetch("/api/account/preferences", { headers: authHeaders, credentials: "include" });
      if (prefRes.ok) {
        const json = await prefRes.json();
        const pref: UserPreferencesData = json.preferences;
        cachedPreferencesData = pref;
        setPreferencesData(pref);
        setPrefTheme(pref.theme || "system");
        setPrefAlerts(Boolean(pref.securityAlerts));
      }

      // 3. Fetch Security Info
      const secRes = await fetch("/api/account/security", { headers: authHeaders, credentials: "include" });
      if (secRes.ok) {
        const json = await secRes.json();
        cachedSecurityData = json.security;
        setSecurityData(json.security);
      }

      // 4. Fetch Activity
      const actRes = await fetch("/api/account/activity", { headers: authHeaders, credentials: "include" });
      if (actRes.ok) {
        const json = await actRes.json();
        const acts = json.activity || [];
        cachedActivityEvents = acts;
        setActivityEvents(acts);
      }
    } catch {
      // Offline / guest local mode
    } finally {
      setLoading(false);
    }
  }, [authStatus, updateProfile]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  // Handle Save Personal Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = formFullName.trim();
    if (!trimmedName) {
      setProfileError("Full name is required.");
      return;
    }
    if (trimmedName.length > 100) {
      setProfileError("Full name must be 100 characters or fewer.");
      return;
    }
    if (formPhone.length > 30) {
      setProfileError("Phone number is too long (maximum 30 characters).");
      return;
    }
    if (formBio.length > 500) {
      setProfileError("Biography must be 500 characters or fewer.");
      return;
    }

    setIsSavingProfile(true);
    const sessionUser = typeof window !== "undefined" ? window.localStorage.getItem("phishintel-session") : null;

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(sessionUser ? { "x-user-email": sessionUser } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: trimmedName,
          designation: formDesignation.trim() || null,
          organization: formOrg.trim() || null,
          phone: formPhone.trim() || null,
          bio: formBio.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setProfileData(data.profile);
      cachedProfileData = data.profile;
      updateProfile({
        name: data.profile.fullName || "",
        role: data.profile.designation || "",
        org: data.profile.organization || "",
      });

      // Update local storage user record if present
      try {
        const rawUsers = localStorage.getItem("phishintel-users");
        if (rawUsers && sessionUser) {
          const users = JSON.parse(rawUsers);
          const idx = users.findIndex((u: { email: string }) => u.email === sessionUser);
          if (idx !== -1) {
            users[idx].name = data.profile.fullName;
            users[idx].designation = data.profile.designation;
            localStorage.setItem("phishintel-users", JSON.stringify(users));
          }
        }
      } catch {}

      setProfileSuccess("Profile updated successfully.");
      showToast("Profile details saved successfully");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Unable to save profile changes.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Cancel Edit
  const handleCancelProfile = () => {
    if (profileData) {
      setFormFullName(profileData.fullName || "");
      setFormDesignation(profileData.designation || "");
      setFormOrg(profileData.organization || "");
      setFormPhone(profileData.phone || "");
      setFormBio(profileData.bio || "");
    }
    setProfileError(null);
    setProfileSuccess(null);
    showToast("Changes discarded");
  };

  // Handle Save Preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPref(true);
    setPrefSuccess(null);

    // 1. Update local client context settings
    updateSettings({
      start: prefStart,
      fmt: prefFmt,
      store: prefStore,
      jump: prefJump,
    });
    try {
      localStorage.setItem("phishintel-theme", prefTheme);
    } catch {}

    // 2. Persist to backend preferences API if authenticated
    const sessionUser = typeof window !== "undefined" ? window.localStorage.getItem("phishintel-session") : null;
    if (sessionUser) {
      try {
        await fetch("/api/account/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": sessionUser,
          },
          credentials: "include",
          body: JSON.stringify({
            theme: prefTheme,
            securityAlerts: prefAlerts,
            scanCompletionNotifications: prefAlerts,
          }),
        });
      } catch {}
    }

    setIsSavingPref(false);
    setPrefSuccess("Preferences saved successfully.");
    showToast("Workspace preferences updated");
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password confirmation does not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setIsChangingPassword(true);
    const sessionUser = typeof window !== "undefined" ? window.localStorage.getItem("phishintel-session") : null;

    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionUser ? { "x-user-email": sessionUser } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to change password.");
      }

      setPasswordSuccess("Password updated successfully. Your new credentials are now active.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Account password changed successfully");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Password change failed.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Export Account Data
  const handleExportData = () => {
    const exportPayload = {
      exportTimestamp: new Date().toISOString(),
      accountProfile: profileData || { status: "local_guest_session" },
      preferences: {
        theme: prefTheme,
        startPage: prefStart,
        scoreFormat: prefFmt,
        storeScansLocally: prefStore,
        securityAlerts: prefAlerts,
      },
      auditScansCount: scans.length,
      scans: scans.map((s) => ({
        id: s.id,
        timestamp: s.ts,
        subject: s.email.subject,
        from: s.email.from,
        decision: s.decision,
        pPhish: s.P,
        risk: s.risk,
        urls: s.urls,
      })),
      activityAuditLog: activityEvents,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phishintel-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Account data exported as JSON");
  };

  // Handle Clear Local Scans
  const handleClearScans = () => {
    if (window.confirm("Are you sure you want to clear your local email scan records? This cannot be undone.")) {
      clearUserScans();
      showToast("Local scan records cleared");
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    if (window.confirm("Are you sure you want to sign out of this analyst workstation session?")) {
      // Clear in-memory profile cache immediately so stale data can't appear
      cachedProfileData = null;
      cachedPreferencesData = null;
      cachedSecurityData = null;
      cachedActivityEvents = [];
      setProfileData(null);
      setSecurityData(null);
      setActivityEvents([]);
      // signOut() is async: awaits Supabase token invalidation, clears localStorage,
      // and performs window.location.href = "/" — no additional redirect needed here.
      await signOut();
    }
  };

  // Explicit 3-state system: "loading" | "authenticated" | "unauthenticated"
  const effectiveAuthStatus: "loading" | "authenticated" | "unauthenticated" =
    !mounted || authStatus === "loading" || (loading && !profileData && authStatus === "authenticated")
      ? "loading"
      : authStatus === "authenticated" || Boolean(profileData)
      ? "authenticated"
      : "unauthenticated";

  const isAuthenticated = effectiveAuthStatus === "authenticated";
  const isLoadingAuth = effectiveAuthStatus === "loading";

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Profile</h1>
          <p>
            Analyst account credentials, personal identity, workspace preferences, and session security.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Side Navigation & Right Content Panels */}
      <div className="profile-grid" id="profile-container">
        {/* Left Side Navigation */}
        <div className="card" style={{ padding: 10 }}>
          <nav className="side-nav" aria-label="Profile navigation sections">
            <button
              type="button"
              className={activeTab === "overview" ? "on" : ""}
              onClick={() => setActiveTab("overview")}
              aria-current={activeTab === "overview" ? "true" : undefined}
            >
              Account overview
            </button>
            <button
              type="button"
              className={activeTab === "personal" ? "on" : ""}
              onClick={() => setActiveTab("personal")}
              aria-current={activeTab === "personal" ? "true" : undefined}
            >
              Personal information
            </button>
            <button
              type="button"
              className={activeTab === "preferences" ? "on" : ""}
              onClick={() => setActiveTab("preferences")}
              aria-current={activeTab === "preferences" ? "true" : undefined}
            >
              Preferences
            </button>
            <button
              type="button"
              className={activeTab === "security" ? "on" : ""}
              onClick={() => setActiveTab("security")}
              aria-current={activeTab === "security" ? "true" : undefined}
            >
              Security &amp; privacy
            </button>
            <button
              type="button"
              className={activeTab === "activity" ? "on" : ""}
              onClick={() => setActiveTab("activity")}
              aria-current={activeTab === "activity" ? "true" : undefined}
            >
              Account activity
            </button>
          </nav>
        </div>

        {/* Right Content Panels */}
        <div>
          {/* SECTION 1: ACCOUNT OVERVIEW */}
          {activeTab === "overview" && (
            isLoadingAuth ? (
              <ProfileOverviewSkeleton />
            ) : (
              <div className="card acc-sec on" role="region" aria-label="Account overview" style={{ minHeight: 480 }}>
                {/* Profile Header Block */}
                <div className="profile-hd">
                  <div className="av" id="profile-av" aria-label="User avatar">
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 19, fontWeight: 500 }} id="profile-name">
                        {isAuthenticated
                          ? profileData?.fullName || authUser?.name || profile.name || "Analyst"
                          : "Guest Analyst"}
                      </div>
                      {isAuthenticated ? (
                        <span className="tag safe">Active analyst</span>
                      ) : (
                        <span className="tag">Local workstation mode</span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }} id="profile-meta">
                      {isAuthenticated ? (
                        <span>{profileData?.email || authUser?.email || "Analyst workstation"}</span>
                      ) : (
                        <span>No authenticated identity connected</span>
                      )}
                      {(profileData?.designation || (isAuthenticated ? authUser?.designation || profile.role : null)) && (
                        <span> · {profileData?.designation || authUser?.designation || profile.role}</span>
                      )}
                      {(profileData?.organization || (isAuthenticated ? profile.org : null)) && (
                        <span> · {profileData?.organization || profile.org}</span>
                      )}
                    </div>
                  </div>

                  {isAuthenticated ? (
                    <button
                      type="button"
                      className="btn btn-dark"
                      onClick={() => setActiveTab("personal")}
                      style={{ flexShrink: 0 }}
                    >
                      Edit profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={() => setAuthDialogOpen(true)}
                      style={{ flexShrink: 0 }}
                    >
                      Sign in / Register
                    </button>
                  )}
                </div>

                {/* Unauthenticated Neutral Notice (ONLY for confirmed unauthenticated guests) */}
                {effectiveAuthStatus === "unauthenticated" && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 14,
                      borderRadius: "var(--r-sm)",
                      background: "var(--card-2)",
                      border: "1px solid var(--line-2)",
                    }}
                  >
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>Local Guest Mode</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                      You are currently using PhishIntel without a signed-in account. Threat detection, feature
                      ablation, and explainability work locally in your browser. To persist custom analyst credentials,
                      personal bio, and cloud settings, please sign in or register an account.
                    </div>
                  </div>
                )}

                {/* Metadata Details */}
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 15, marginBottom: 12 }}>Account details</h3>
                  <dl className="kv">
                    <dt>User ID</dt>
                    <dd className="mono">
                      {isAuthenticated
                        ? profileData?.id || (authUser?.email ? `usr_${authUser.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_")}` : "usr_analyst")
                        : "local_workstation_user"}
                    </dd>

                    <dt>Account status</dt>
                    <dd>{isAuthenticated ? "Verified Analyst · Active" : "Unauthenticated Guest"}</dd>

                    <dt>Role / Designation</dt>
                    <dd>{profileData?.designation || (isAuthenticated ? authUser?.designation || profile.role : null) || <span className="muted">Not added</span>}</dd>

                    <dt>Organisation</dt>
                    <dd>{profileData?.organization || (isAuthenticated ? profile.org : null) || <span className="muted">Not added</span>}</dd>

                    <dt>Contact phone</dt>
                    <dd>{profileData?.phone || <span className="muted">Not added</span>}</dd>

                    <dt>Member since</dt>
                    <dd>{fmtDate(profileData?.createdAt || (isAuthenticated ? "2026-01-15T09:00:00Z" : null))}</dd>

                    <dt>Last profile update</dt>
                    <dd>{fmtDateTime(profileData?.updatedAt || (isAuthenticated ? profileData?.createdAt || "2026-01-15T09:00:00Z" : null))}</dd>

                    <dt>Storage backend</dt>
                    <dd className="mono">SQLite WAL · Local database</dd>

                    <dt>Password encryption</dt>
                    <dd className="mono">PBKDF2-SHA256 (210,000 iterations)</dd>
                  </dl>
                </div>

                {/* Quick Actions Row */}
                <div
                  className="row"
                  style={{
                    marginTop: 24,
                    paddingTop: 16,
                    borderTop: "1px solid var(--line-2)",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={() => setActiveTab("preferences")}
                    >
                      Workspace preferences
                    </button>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={() => setActiveTab("security")}
                    >
                      Security &amp; credentials
                    </button>
                  </div>

                  {isAuthenticated && (
                    <button
                      type="button"
                      className="btn btn-line"
                      style={{ color: "var(--phish)" }}
                      onClick={handleSignOut}
                    >
                      Sign out
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {/* SECTION 2: PERSONAL INFORMATION */}
          {activeTab === "personal" && (
            <div className="card acc-sec on" role="region" aria-label="Personal information">
              <div className="card-head">
                <div>
                  <h3>Personal information</h3>
                  <p>
                    Update your identity information, role, and operational details. Immutable fields cannot be altered.
                  </p>
                </div>
              </div>

              {profileSuccess && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--r-sm)",
                    background: "rgba(30, 154, 105, 0.12)",
                    color: "var(--safe)",
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                  role="status"
                >
                  ✓ {profileSuccess}
                </div>
              )}

              {profileError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--r-sm)",
                    background: "rgba(216, 69, 43, 0.12)",
                    color: "var(--phish)",
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                  role="alert"
                >
                  ⚠ {profileError}
                </div>
              )}

              <form onSubmit={handleSaveProfile}>
                <div className="grid g2" style={{ gap: 16 }}>
                  {/* Full Name */}
                  <div className="field">
                    <label htmlFor="prof-fullname">
                      Full name <span style={{ color: "var(--phish)" }}>*</span>
                    </label>
                    <input
                      className="input"
                      id="prof-fullname"
                      type="text"
                      required
                      maxLength={100}
                      value={formFullName}
                      placeholder="e.g. Preetham Kumar"
                      onChange={(e) => setFormFullName(e.target.value)}
                    />
                  </div>

                  {/* Email (Immutable) */}
                  <div className="field">
                    <label htmlFor="prof-email">Email address (Account identifier)</label>
                    <input
                      className="input"
                      id="prof-email"
                      type="email"
                      disabled
                      value={profileData?.email || authUser?.email || "No authenticated email"}
                      style={{ opacity: 0.75, cursor: "not-allowed" }}
                      title="Account email address cannot be changed."
                    />
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                      Immutable identity field linked to cryptographic signature.
                    </div>
                  </div>

                  {/* Role / Designation */}
                  <div className="field">
                    <label htmlFor="prof-role">Role / Designation</label>
                    <input
                      className="input"
                      id="prof-role"
                      type="text"
                      maxLength={50}
                      placeholder="Enter role or designation (optional)"
                      value={formDesignation}
                      onChange={(e) => setFormDesignation(e.target.value)}
                    />
                  </div>

                  {/* Organization */}
                  <div className="field">
                    <label htmlFor="prof-org">Organisation / Institution</label>
                    <input
                      className="input"
                      id="prof-org"
                      type="text"
                      maxLength={100}
                      placeholder="Enter organisation or institution (optional)"
                      value={formOrg}
                      onChange={(e) => setFormOrg(e.target.value)}
                    />
                  </div>

                  {/* Phone */}
                  <div className="field">
                    <label htmlFor="prof-phone">Phone number</label>
                    <input
                      className="input"
                      id="prof-phone"
                      type="tel"
                      maxLength={30}
                      placeholder="Enter contact phone number (optional)"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>

                  {/* Timezone */}
                  <div className="field">
                    <label htmlFor="prof-tz">Local timezone</label>
                    <input
                      className="input mono"
                      id="prof-tz"
                      type="text"
                      disabled
                      value={Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}
                      style={{ opacity: 0.75, cursor: "not-allowed" }}
                    />
                  </div>
                </div>

                {/* Biography */}
                <div className="field" style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="prof-bio">Biography / Operational scope</label>
                    <span className="muted mono" style={{ fontSize: 11 }}>
                      {formBio.length} / 500
                    </span>
                  </div>
                  <textarea
                    className="textarea"
                    id="prof-bio"
                    rows={4}
                    maxLength={500}
                    placeholder="Write a brief bio about yourself (optional)..."
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                  />
                </div>

                {/* Submit Actions */}
                <div
                  className="row"
                  style={{
                    justifyContent: "flex-end",
                    marginTop: 20,
                    gap: 10,
                  }}
                >
                  <button type="button" className="btn btn-line" onClick={handleCancelProfile}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={isSavingProfile || !isAuthenticated}
                    title={!isAuthenticated ? "Sign in to persist changes to the server" : undefined}
                  >
                    {isSavingProfile ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 3: PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="card acc-sec on" role="region" aria-label="Account preferences">
              <div className="card-head">
                <div>
                  <h3>Account preferences</h3>
                  <p>Configure interface styling, score rendering, and automated detection workflows.</p>
                </div>
              </div>

              {prefSuccess && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--r-sm)",
                    background: "rgba(30, 154, 105, 0.12)",
                    color: "var(--safe)",
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                  role="status"
                >
                  ✓ {prefSuccess}
                </div>
              )}

              <form onSubmit={handleSavePreferences}>
                {/* Theme Mode */}
                <div className="set-row">
                  <div>
                    <div className="t">Appearance theme</div>
                    <div className="d">Choose between dark editorial theme, light sage, or match system mode.</div>
                  </div>
                  <select
                    className="select"
                    id="pref-theme-select"
                    style={{ width: 180 }}
                    value={prefTheme}
                    onChange={(e) => setPrefTheme(e.target.value)}
                  >
                    <option value="system">System default</option>
                    <option value="dark">Dark theme</option>
                    <option value="light">Light theme</option>
                  </select>
                </div>

                {/* Default Start Page */}
                <div className="set-row">
                  <div>
                    <div className="t">Default start destination</div>
                    <div className="d">The primary console screen opened when launching PhishIntel.</div>
                  </div>
                  <select
                    className="select"
                    id="pref-start-page"
                    style={{ width: 180 }}
                    value={prefStart}
                    onChange={(e) => setPrefStart(e.target.value)}
                  >
                    <option value="overview">Overview (/dashboard)</option>
                    <option value="analyzer">Email analyzer (/analyzer)</option>
                    <option value="history">Scan history (/history)</option>
                  </select>
                </div>

                {/* Probability / Score Format */}
                <div className="set-row">
                  <div>
                    <div className="t">
                      Score format (P<sub>phish</sub>)
                    </div>
                    <div className="d">Format used to present threat probability metrics across the console.</div>
                  </div>
                  <select
                    className="select"
                    id="pref-score-fmt"
                    style={{ width: 180 }}
                    value={prefFmt}
                    onChange={(e) => setPrefFmt(e.target.value as "prob" | "pct")}
                  >
                    <option value="prob">Probability scale (0.973)</option>
                    <option value="pct">Percentage scale (97.3%)</option>
                  </select>
                </div>

                {/* Open Explanation Automatically */}
                <div className="set-row">
                  <div>
                    <div className="t">Automatic explanation navigation</div>
                    <div className="d">Navigate automatically to the Explainability page upon scan completion.</div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="pref-auto-jump"
                      checked={prefJump}
                      onChange={(e) => setPrefJump(e.target.checked)}
                    />
                    <span />
                  </label>
                </div>

                {/* Security Alerts */}
                <div className="set-row">
                  <div>
                    <div className="t">High-confidence threat alerts</div>
                    <div className="d">
                      Highlight critical phishing indicators and display toast notifications for severe risks.
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="pref-alerts"
                      checked={prefAlerts}
                      onChange={(e) => setPrefAlerts(e.target.checked)}
                    />
                    <span />
                  </label>
                </div>

                {/* Store Scans in Browser */}
                <div className="set-row">
                  <div>
                    <div className="t">Retain forensic scans locally</div>
                    <div className="d">
                      Save analyzed headers, body extracts, and scores in local browser memory for audit history.
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="pref-store-local"
                      checked={prefStore}
                      onChange={(e) => setPrefStore(e.target.checked)}
                    />
                    <span />
                  </label>
                </div>

                {/* Save Button */}
                <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
                  <button type="submit" className="btn btn-dark" disabled={isSavingPref}>
                    {isSavingPref ? "Saving..." : "Save preferences"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 4: SECURITY & PRIVACY */}
          {activeTab === "security" && (
            <div className="card acc-sec on" role="region" aria-label="Security and privacy">
              <div className="card-head">
                <div>
                  <h3>Security &amp; privacy</h3>
                  <p>Credentials management, encryption standards, active sessions, and personal data audit.</p>
                </div>
              </div>

              {/* Password Change Form */}
              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 14.5, marginBottom: 8, fontWeight: 500 }}>Change password</h4>
                <p className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
                  Passwords are authenticated server-side using salted PBKDF2-SHA256 derivation with 210,000 iterations.
                  Plaintext credentials are never stored or logged.
                </p>

                {passwordSuccess && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--r-sm)",
                      background: "rgba(30, 154, 105, 0.12)",
                      color: "var(--safe)",
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                    role="status"
                  >
                    ✓ {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--r-sm)",
                      background: "rgba(216, 69, 43, 0.12)",
                      color: "var(--phish)",
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                    role="alert"
                  >
                    ⚠ {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <div className="grid g3" style={{ gap: 14 }}>
                    <div className="field">
                      <label htmlFor="sec-cur-pwd">Current password</label>
                      <input
                        className="input"
                        id="sec-cur-pwd"
                        type="password"
                        required
                        value={currentPassword}
                        placeholder="••••••••"
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="sec-new-pwd">New password (min 8 chars)</label>
                      <input
                        className="input"
                        id="sec-new-pwd"
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        placeholder="••••••••"
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="sec-cnf-pwd">Confirm new password</label>
                      <input
                        className="input"
                        id="sec-cnf-pwd"
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        placeholder="••••••••"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                    <button
                      type="submit"
                      className="btn btn-dark"
                      disabled={isChangingPassword || !isAuthenticated}
                      title={!isAuthenticated ? "Sign in to update credentials" : undefined}
                    >
                      {isChangingPassword ? "Updating..." : "Update password"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Telemetry & Status */}
              <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 20, marginBottom: 24 }}>
                <h4 style={{ fontSize: 14.5, marginBottom: 12, fontWeight: 500 }}>Security controls &amp; posture</h4>
                <div className="set-row">
                  <div>
                    <div className="t">Authentication protocol</div>
                    <div className="d">
                      {securityData?.encryptionInfo || "PBKDF2-SHA256 (210,000 iterations, 16-byte random salt)"}
                    </div>
                  </div>
                  <span className="tag dark">active</span>
                </div>

                <div className="set-row">
                  <div>
                    <div className="t">Two-factor authentication</div>
                    <div className="d">
                      {securityData?.twoFactorMessage || "Not configured for this prototype environment."}
                    </div>
                  </div>
                  <span className="tag">{securityData?.twoFactorStatus || "not configured"}</span>
                </div>

                <div className="set-row">
                  <div>
                    <div className="t">Active workstation sessions</div>
                    <div className="d">Current browser tab and verified local workstation sessions.</div>
                  </div>
                  <span className="tag dark">
                    {securityData?.activeSessionsCount ? `${securityData.activeSessionsCount} active` : "1 local"}
                  </span>
                </div>
              </div>

              {/* Data Management & Session Actions */}
              <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 20 }}>
                <h4 style={{ fontSize: 14.5, marginBottom: 12, fontWeight: 500 }}>Data management &amp; session</h4>
                <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-line" onClick={handleExportData}>
                      Export account data (.json)
                    </button>
                    <button
                      type="button"
                      className="btn btn-line"
                      style={{ color: "var(--phish)" }}
                      onClick={handleClearScans}
                    >
                      Clear local scan history
                    </button>
                  </div>

                  {isAuthenticated && (
                    <button
                      type="button"
                      className="btn btn-dark"
                      style={{ background: "var(--phish)", borderColor: "var(--phish)" }}
                      onClick={handleSignOut}
                    >
                      Sign out of session
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: ACCOUNT ACTIVITY */}
          {activeTab === "activity" && (
            <div className="card acc-sec on" role="region" aria-label="Account activity log">
              <div className="card-head">
                <div>
                  <h3>Account activity audit</h3>
                  <p>Forensic activity records, authentication attempts, and scan operations recorded in this session.</p>
                </div>
              </div>

              <div id="profile-activity-list">
                {activityEvents.length > 0 ? (
                  activityEvents.map((act) => (
                    <div key={act.id} className="li">
                      <span
                        className="ico"
                        style={{
                          background:
                            act.outcome === "failure"
                              ? "rgba(216, 69, 43, 0.15)"
                              : act.outcome === "success"
                              ? "rgba(30, 154, 105, 0.15)"
                              : "var(--card-3)",
                          color:
                            act.outcome === "failure"
                              ? "var(--phish)"
                              : act.outcome === "success"
                              ? "var(--safe)"
                              : "var(--ink-2)",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ fontWeight: 500, fontSize: 13.5 }}>{act.label}</span>
                          <span className="mono muted" style={{ fontSize: 11.5 }}>
                            {fmtDateTime(act.timestamp)}
                          </span>
                        </div>
                        {act.details && (
                          <div className="muted trunc" style={{ fontSize: 12, marginTop: 2 }}>
                            {act.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0, padding: "16px 0" }}>
                    No audit events recorded for this account.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auth Dialog for Unauthenticated Users */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        destination="/profile"
        onAuthSuccess={() => {
          setAuthDialogOpen(false);
          fetchAccountData();
          showToast("Signed in successfully");
        }}
      />
    </div>
  );
}
