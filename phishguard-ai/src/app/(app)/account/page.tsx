"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  User,
  Shield,
  Sliders,
  Activity,
  Layers,
  Mail,
  Building,
  Briefcase,
  Phone,
  FileText,
  Calendar,
  Lock,
  Check,
  AlertCircle,
  Laptop,
  LogOut,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Save,
  X,
  Edit3,
} from "lucide-react";

type SectionId = "profile" | "security" | "preferences" | "activity" | "plan";

interface SectionNavItem {
  id: SectionId;
  label: string;
  description: string;
  icon: React.ElementType;
}

const SECTIONS: SectionNavItem[] = [
  { id: "profile", label: "Personal Profile", description: "Identity, contacts & affiliations", icon: User },
  { id: "security", label: "Security & Privacy", description: "Password, access & sessions", icon: Shield },
  { id: "preferences", label: "Preferences", description: "Theme, alerts & display view", icon: Sliders },
  { id: "activity", label: "Account Activity", description: "Audit trail & security events", icon: Activity },
  { id: "plan", label: "Plan & Usage", description: "Research tier & evaluation limits", icon: Layers },
];

interface ProfileData {
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

interface PreferencesData {
  theme: "dark" | "light" | "system";
  emailNotifications: boolean;
  securityAlerts: boolean;
  scanCompletionNotifications: boolean;
  productUpdates: boolean;
  timeZone: string;
  language: string;
  defaultAnalysisView: "side-by-side" | "stacked";
  showExplanatoryDetails: boolean;
}

interface ActivityEvent {
  id: string;
  eventType: string;
  label: string;
  outcome: string;
  details: string | null;
  timestamp: string;
}

interface ActivityResponse {
  activity: ActivityEvent[];
  totalCount: number;
  summary: {
    totalScans: number;
    lastScanAt: string | null;
    accountCreatedAt: string;
    totalEvents: number;
  };
}

interface SessionItem {
  id: string;
  userAgent: string;
  ipHint: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

interface UsageResponse {
  usage: {
    periodStart: string;
    periodEnd: string;
    scansUsedCurrentPeriod: number;
    totalLifetimeScans: number;
    scanLimit: number | null;
    apiRequestsUsed: number | null;
    storageMetering: string;
  };
  plan: {
    name: string;
    status: string;
    tierDescription: string;
  };
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const { setThemeMode } = useTheme();

  // Active section management synchronized with ?section=
  const initialSection = (searchParams.get("section") as SectionId) || "profile";
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    return SECTIONS.some((s) => s.id === initialSection) ? initialSection : "profile";
  });

  const handleSelectSection = (id: SectionId) => {
    setActiveSection(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", id);
    router.replace(`/account?${params.toString()}`);
  };

  // Profile state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    organization: "",
    designation: "",
    bio: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState<PreferencesData>({
    theme: "system",
    emailNotifications: false,
    securityAlerts: true,
    scanCompletionNotifications: true,
    productUpdates: false,
    timeZone: "UTC",
    language: "en",
    defaultAnalysisView: "side-by-side",
    showExplanatoryDetails: true,
  });
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSuccessMsg, setPreferencesSuccessMsg] = useState("");

  // Activity state
  const [activityData, setActivityData] = useState<ActivityResponse | null>(null);
  const [activityCategory, setActivityCategory] = useState("all");
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Plan & Usage state
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Auth headers helper
  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (user?.email) {
      headers["x-user-email"] = user.email;
    }
    return headers;
  }, [user]);

  // Fetch Activity
  const fetchActivity = useCallback(async (cat = "all") => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/account/activity?category=${cat}&limit=30`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setActivityData(data);
      }
    } catch {} finally {
      setLoadingActivity(false);
    }
  }, [getAuthHeaders]);

  // Fetch Sessions
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/account/sessions", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
      }
    } catch {} finally {
      setLoadingSessions(false);
    }
  }, [getAuthHeaders]);

  // Load initial data on mount or user change
  useEffect(() => {
    let ignore = false;

    async function loadAccountData() {
      try {
        const headers = getAuthHeaders();
        const [profRes, prefRes, actRes, sessRes, usageRes] = await Promise.all([
          fetch("/api/account/profile", { headers }),
          fetch("/api/account/preferences", { headers }),
          fetch("/api/account/activity?category=all&limit=30", { headers }),
          fetch("/api/account/sessions", { headers }),
          fetch("/api/account/usage", { headers }),
        ]);

        if (ignore) return;

        if (profRes.ok) {
          const profData = await profRes.json();
          if (!ignore && profData.profile) {
            setProfile(profData.profile);
            setProfileForm({
              fullName: profData.profile.fullName || "",
              phone: profData.profile.phone || "",
              organization: profData.profile.organization || "",
              designation: profData.profile.designation || "",
              bio: profData.profile.bio || "",
            });
          }
        }
        if (prefRes.ok) {
          const prefData = await prefRes.json();
          if (!ignore && prefData.preferences) setPreferences(prefData.preferences);
        }
        if (actRes.ok) {
          const actData = await actRes.json();
          if (!ignore && actData) setActivityData(actData);
        }
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          if (!ignore && sessData.sessions) setSessions(sessData.sessions);
        }
        if (usageRes.ok) {
          const uData = await usageRes.json();
          if (!ignore && uData) setUsageData(uData);
        }
      } catch (err) {
        if (!ignore) setProfileError(err instanceof Error ? err.message : "Failed to load account.");
      } finally {
        if (!ignore) {
          setLoadingProfile(false);
          setLoadingPreferences(false);
          setLoadingActivity(false);
          setLoadingSessions(false);
          setLoadingUsage(false);
        }
      }
    }

    void loadAccountData();
    return () => {
      ignore = true;
    };
  }, [getAuthHeaders]);

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccessMsg("");

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save profile changes.");

      setProfile(data.profile);
      setIsEditingProfile(false);
      setProfileSuccessMsg("Profile updated successfully.");
      setTimeout(() => setProfileSuccessMsg(""), 4000);
      fetchActivity(activityCategory);

      // Keep client AuthProvider updated if name/designation changed
      try {
        const rawUsers = window.localStorage.getItem("phishguard-users");
        if (rawUsers) {
          const users = JSON.parse(rawUsers);
          if (Array.isArray(users)) {
            const updated = users.map((u: { email: string; name: string; designation?: string }) =>
              u.email === data.profile.email
                ? {
                    ...u,
                    name: data.profile.fullName,
                    designation: data.profile.designation || undefined,
                  }
                : u
            );
            window.localStorage.setItem("phishguard-users", JSON.stringify(updated));
            window.dispatchEvent(new Event("storage"));
          }
        }
      } catch {}
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccessMsg("");

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password update failed.");

      setPasswordSuccessMsg(data.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccessMsg(""), 5000);
      fetchActivity(activityCategory);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Save preferences
  const handleSavePreferences = async (updated: Partial<PreferencesData>) => {
    const next = { ...preferences, ...updated };
    setPreferences(next);
    setSavingPreferences(true);
    setPreferencesSuccessMsg("");

    try {
      const res = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(next),
      });

      if (!res.ok) throw new Error("Failed to persist preferences.");
      const data = await res.json();
      setPreferences(data.preferences);
      setPreferencesSuccessMsg("Preferences saved.");
      setTimeout(() => setPreferencesSuccessMsg(""), 3000);

      // Sync theme with ThemeProvider if changed
      if (updated.theme && (updated.theme === "light" || updated.theme === "dark")) {
        setThemeMode(updated.theme);
      }
    } catch {
      setPreferencesSuccessMsg("Failed to save preference.");
    } finally {
      setSavingPreferences(false);
    }
  };

  const displayName = profile?.fullName || user?.name || "";
  const displayEmail = profile?.email || user?.email || "";
  const userInitials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Not available";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      return new Date(isoString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <PageHeader
        title="Account & Profile"
        description="Manage your personal information, security, preferences, and account usage."
      />

      {/* Mobile/Tablet Horizontal Tabs */}
      <div className="lg:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--border-color)]">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleSelectSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[var(--primary-accent)] text-white shadow-sm"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]/70"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Desktop Left-Side In-Page Navigation */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
          <Card phase={1} className="border-[var(--border-color)] p-2 space-y-1 sticky top-24">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Account Sections
            </div>
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const active = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => handleSelectSection(sec.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                    active
                      ? "bg-[var(--primary-accent)] text-white shadow-sm shadow-blue-900/30"
                      : "hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${active ? "bg-white/20 text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${active ? "text-white" : "text-[var(--text-primary)]"}`}>
                      {sec.label}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${active ? "text-white/80" : "text-[var(--text-muted)]"}`}>
                      {sec.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </Card>
        </aside>

        {/* Right Main Content Panel */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* SECTION 1: PERSONAL PROFILE */}
          {activeSection === "profile" && (
            <div className="space-y-6">
              <Card phase={2} className="border-[var(--border-color)]">
                <CardHeader className="p-6 pb-4 border-b border-[var(--border-color)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <User className="w-5 h-5 text-[var(--primary-accent)]" />
                        Personal Profile
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Identity details, institutional affiliations, and contact information
                      </CardDescription>
                    </div>
                    {!isEditingProfile ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (profile) {
                            setProfileForm({
                              fullName: profile.fullName || "",
                              phone: profile.phone || "",
                              organization: profile.organization || "",
                              designation: profile.designation || "",
                              bio: profile.bio || "",
                            });
                          }
                          setIsEditingProfile(true);
                        }}
                        className="self-start sm:self-auto text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        Edit Profile
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (profile) {
                            setProfileForm({
                              fullName: profile.fullName || "",
                              phone: profile.phone || "",
                              organization: profile.organization || "",
                              designation: profile.designation || "",
                              bio: profile.bio || "",
                            });
                          }
                          setIsEditingProfile(false);
                          setProfileError("");
                        }}
                        className="self-start sm:self-auto text-xs text-[var(--text-muted)]"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {loadingProfile && (
                    <div className="py-2 text-center text-xs text-[var(--text-muted)] animate-pulse">
                      Loading persistent profile data...
                    </div>
                  )}
                  {profileSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  {/* Top Avatar & Name Banner */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-[var(--border-color)]">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[var(--primary-accent)] via-[#6366F1] to-[var(--secondary-accent)] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-900/30 ring-4 ring-[var(--bg-elevated)] shrink-0 overflow-hidden">
                      {profile?.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={profile.avatarUrl}
                          alt={displayName || "Profile photo"}
                          className="w-full h-full object-cover"
                        />
                      ) : userInitials ? (
                        <span>{userInitials}</span>
                      ) : (
                        <User className="w-9 h-9 text-white/90" />
                      )}
                    </div>
                    <div className="text-center sm:text-left space-y-1">
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        {displayName || <span className="text-[var(--text-muted)] italic font-normal">Not provided</span>}
                      </h2>
                      {displayEmail && (
                        <p className="text-xs text-[var(--text-muted)] font-mono">
                          {displayEmail}
                        </p>
                      )}
                      {profile?.createdAt && (
                        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            Registered: {formatDate(profile.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Edit Form vs Read View */}
                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                          Full Name <span className="text-red-500">*</span>
                          <input
                            type="text"
                            required
                            value={profileForm.fullName}
                            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                            className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                            placeholder="Enter your full name"
                          />
                        </label>

                        <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                          Phone Number (Optional)
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                            placeholder="Enter your phone number"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                          Organization / Institution (Optional)
                          <input
                            type="text"
                            value={profileForm.organization}
                            onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })}
                            className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                            placeholder="e.g. University or organization"
                          />
                        </label>

                        <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                          Job Title / Designation (Optional)
                          <input
                            type="text"
                            value={profileForm.designation}
                            onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                            className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                            placeholder="e.g. Security Analyst"
                          />
                        </label>
                      </div>

                      <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                        Short Bio (Optional)
                        <textarea
                          rows={3}
                          value={profileForm.bio}
                          onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                          className="w-full p-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                          placeholder="Write a short bio about yourself"
                        />
                      </label>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (profile) {
                              setProfileForm({
                                fullName: profile.fullName || "",
                                phone: profile.phone || "",
                                organization: profile.organization || "",
                                designation: profile.designation || "",
                                bio: profile.bio || "",
                              });
                            }
                            setIsEditingProfile(false);
                          }}
                          disabled={savingProfile}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          isLoading={savingProfile}
                          disabled={savingProfile}
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider">
                          <Mail className="w-3.5 h-3.5" /> Email Address
                        </div>
                        <div className="font-semibold text-[var(--text-primary)] font-mono">
                          {displayEmail || <span className="text-[var(--text-muted)] italic font-normal">Not provided</span>}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] pt-1">
                          Primary login identifier (read-only in prototype)
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider">
                          <Phone className="w-3.5 h-3.5" /> Phone Number
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {profile?.phone || <span className="text-[var(--text-muted)] italic font-normal">Not added</span>}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider">
                          <Building className="w-3.5 h-3.5" /> Organization / Institution
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {profile?.organization || <span className="text-[var(--text-muted)] italic font-normal">Not added</span>}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider">
                          <Briefcase className="w-3.5 h-3.5" /> Designation
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {profile?.designation || <span className="text-[var(--text-muted)] italic font-normal">Not added</span>}
                        </div>
                      </div>

                      <div className="sm:col-span-2 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-wider">
                          <FileText className="w-3.5 h-3.5" /> Biography
                        </div>
                        <div className="text-[var(--text-primary)] text-xs leading-relaxed">
                          {profile?.bio || <span className="text-[var(--text-muted)] italic font-normal">Not added</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION 2: SECURITY & PRIVACY */}
          {activeSection === "security" && (
            <div className="space-y-6">
              {/* Password Change Card */}
              <Card className="border-[var(--border-color)]">
                <CardHeader className="p-6 pb-4 border-b border-[var(--border-color)]">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[var(--primary-accent)]" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your account credentials using PBKDF2-SHA256 server-side encryption
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {passwordSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{passwordSuccessMsg}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                      Current Password
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                        placeholder="••••••••"
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                      New Password (at least 8 characters)
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                        placeholder="••••••••"
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-medium text-[var(--text-muted)]">
                      Confirm New Password
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                        placeholder="••••••••"
                      />
                    </label>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={updatingPassword}
                      disabled={updatingPassword}
                      className="text-xs"
                    >
                      Update Password
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Two-Factor Authentication Status Card */}
              <Card className="border-[var(--border-color)]">
                <CardHeader className="p-6 pb-4 border-b border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Two-Factor Authentication (2FA)
                      </CardTitle>
                      <CardDescription>Multi-factor verification for identity confirmation</CardDescription>
                    </div>
                    <Badge variant="outline" size="sm">Not Configured</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 text-xs space-y-2 text-[var(--text-muted)]">
                  <p>
                    Two-factor authentication (TOTP/SMS) is not configured in this research prototype.
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]/80">
                    Accounts are protected via server-verified PBKDF2-SHA256 password hashing with unique per-user salts.
                  </p>
                </CardContent>
              </Card>

              {/* Active Sessions Card */}
              <Card className="border-[var(--border-color)]">
                <CardHeader className="p-6 pb-4 border-b border-[var(--border-color)]">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[var(--secondary-accent)]" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription>Active device sessions recognized by the authentication system</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {loadingSessions && (
                    <div className="py-2 text-center text-xs text-[var(--text-muted)] animate-pulse">
                      Loading active sessions...
                    </div>
                  )}
                  {sessions.length > 0 ? (
                    <div className="divide-y divide-[var(--border-color)]/60">
                      {sessions.map((sess) => (
                        <div key={sess.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--primary-accent)] shrink-0">
                              <Laptop className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <span>{sess.userAgent}</span>
                                {sess.isCurrent && (
                                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-[var(--primary-accent)] border border-blue-500/30">
                                    Current Device
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
                                {sess.ipHint} • Last active: {formatDateTime(sess.lastActiveAt)}
                              </div>
                            </div>
                          </div>
                          {sess.isCurrent ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                signOut();
                                router.replace("/");
                              }}
                              className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10"
                            >
                              <LogOut className="w-3.5 h-3.5 mr-1" />
                              Sign out
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await fetch(`/api/account/sessions?sessionId=${sess.id}`, {
                                  method: "DELETE",
                                  headers: getAuthHeaders(),
                                });
                                fetchSessions();
                              }}
                              className="text-xs"
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">No active sessions enumerated.</p>
                  )}
                </CardContent>
              </Card>

              {/* Truthful Privacy Statement */}
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] space-y-1">
                <span className="font-bold text-[var(--text-primary)] block">Privacy & Data Handling</span>
                <p>
                  All account records, activity logs, and email scan records are stored locally in the server&apos;s dedicated SQLite database. Passwords are never stored in plaintext and cannot be retrieved by administrators.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: PREFERENCES */}
          {activeSection === "preferences" && (
            <div className="space-y-6">
              <Card className="border-[var(--border-color)]">
                <CardHeader className="p-6 pb-4 border-b border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[var(--primary-accent)]" />
                        Application Preferences
                      </CardTitle>
                      <CardDescription>Customize appearance, notifications, and default analysis layout</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingPreferences && (
                        <span className="text-xs text-[var(--text-muted)] animate-pulse">Saving...</span>
                      )}
                      {preferencesSuccessMsg && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {preferencesSuccessMsg}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6 text-xs">
                  {loadingPreferences && (
                    <div className="py-2 text-center text-xs text-[var(--text-muted)] animate-pulse">
                      Loading preferences...
                    </div>
                  )}
                  {/* Theme Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Appearance Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3 max-w-sm">
                      {(["dark", "light", "system"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleSavePreferences({ theme: t })}
                          className={`p-3 rounded-xl border text-center capitalize font-semibold transition-all ${
                            preferences.theme === t
                              ? "border-[var(--primary-accent)] bg-[var(--primary-accent)]/15 text-[var(--primary-accent)]"
                              : "border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Notification Alerts
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] cursor-pointer">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[var(--text-primary)]">Security Threat Alerts</div>
                        <div className="text-[11px] text-[var(--text-muted)]">Immediate alert when high-risk credential phishing is flagged</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.securityAlerts}
                        onChange={(e) => handleSavePreferences({ securityAlerts: e.target.checked })}
                        className="w-4 h-4 accent-[var(--primary-accent)] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] cursor-pointer">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[var(--text-primary)]">Scan Completion Notifications</div>
                        <div className="text-[11px] text-[var(--text-muted)]">Notify when batch or manual analyzer finishes evaluation</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.scanCompletionNotifications}
                        onChange={(e) => handleSavePreferences({ scanCompletionNotifications: e.target.checked })}
                        className="w-4 h-4 accent-[var(--primary-accent)] cursor-pointer"
                      />
                    </label>

                    <p className="text-[11px] text-[var(--text-muted)] italic">
                      Note: Email delivery will be dispatched when an outbound SMTP mailer service is configured.
                    </p>
                  </div>

                  {/* Analysis View Defaults */}
                  <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Email Analyzer Display Defaults
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block space-y-1.5">
                        <span className="font-medium text-[var(--text-muted)]">Default Inspection View</span>
                        <select
                          value={preferences.defaultAnalysisView}
                          onChange={(e) => handleSavePreferences({ defaultAnalysisView: e.target.value as "side-by-side" | "stacked" })}
                          className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                        >
                          <option value="side-by-side">Side-by-Side (Split Panel)</option>
                          <option value="stacked">Stacked (Vertical)</option>
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="font-medium text-[var(--text-muted)]">Time Zone</span>
                        <select
                          value={preferences.timeZone}
                          onChange={(e) => handleSavePreferences({ timeZone: e.target.value })}
                          className="w-full h-10 px-3 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--primary-accent)]"
                        >
                          <option value="UTC">UTC (Universal Time)</option>
                          <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                          <option value="America/New_York">America/New_York (EST/EDT)</option>
                          <option value="Europe/London">Europe/London (GMT/BST)</option>
                        </select>
                      </label>
                    </div>

                    <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] cursor-pointer mt-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[var(--text-primary)]">Show Explanatory Model Highlights</div>
                        <div className="text-[11px] text-[var(--text-muted)]">Automatically highlight multi-modal feature tokens and group attributions upon scan completion</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.showExplanatoryDetails}
                        onChange={(e) => handleSavePreferences({ showExplanatoryDetails: e.target.checked })}
                        className="w-4 h-4 accent-[var(--primary-accent)] cursor-pointer"
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION 4: ACCOUNT ACTIVITY */}
          {activeSection === "activity" && (
            <div className="space-y-6">
              {loadingActivity && (
                <div className="py-2 text-center text-xs text-[var(--text-muted)] animate-pulse">
                  Retrieving activity logs from database...
                </div>
              )}
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Scans Performed</span>
                  <span className="text-2xl font-bold font-mono text-[var(--text-primary)] mt-1 block">
                    {activityData?.summary.totalScans ?? 0}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Verified in database</span>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Most Recent Scan</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1 block truncate">
                    {formatDate(activityData?.summary.lastScanAt)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Authoritative timestamp</span>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Account Created</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] mt-1 block truncate">
                    {formatDate(activityData?.summary.accountCreatedAt)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Initial registration</span>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Total Logged Events</span>
                  <span className="text-2xl font-bold font-mono text-[var(--primary-accent)] mt-1 block">
                    {activityData?.summary.totalEvents ?? 0}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">Security audit records</span>
                </div>
              </div>

              {/* Filterable Activity Log Table */}
              <Card className="border-[var(--border-color)]">
                <CardHeader className="p-5 pb-3 border-b border-[var(--border-color)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[var(--primary-accent)]" />
                        Audit Trail & Account Events
                      </CardTitle>
                      <CardDescription>Authoritative record of authentication, profile updates, and scan operations</CardDescription>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                      {[
                        { id: "all", label: "All" },
                        { id: "auth", label: "Auth" },
                        { id: "profile", label: "Profile" },
                        { id: "security", label: "Security" },
                        { id: "scans", label: "Scans" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setActivityCategory(cat.id);
                            fetchActivity(cat.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors ${
                            activityCategory === cat.id
                              ? "bg-[var(--primary-accent)] text-white"
                              : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {activityData?.activity && activityData.activity.length > 0 ? (
                    <div className="divide-y divide-[var(--border-color)]/60 text-xs">
                      {activityData.activity.map((ev) => (
                        <div key={ev.id} className="p-4 hover:bg-[var(--bg-elevated)]/40 transition-colors flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                              <span>{ev.label}</span>
                              <span
                                className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                                  ev.outcome === "success"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                    : ev.outcome === "failure"
                                    ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                }`}
                              >
                                {ev.outcome}
                              </span>
                            </div>
                            {ev.details && (
                              <div className="text-[11px] text-[var(--text-muted)]">
                                {ev.details}
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] font-mono shrink-0 whitespace-nowrap">
                            {formatDateTime(ev.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] space-y-1">
                      <HelpCircle className="w-6 h-6 mx-auto text-[var(--text-muted)]/60" />
                      <p className="font-semibold">No activity records found</p>
                      <p className="text-[11px]">No events have been recorded in this category yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* SECTION 5: PLAN & USAGE */}
          {activeSection === "plan" && (
            <div className="space-y-6">
              <Card className="border-[var(--border-color)]">
                <CardHeader className="p-6 pb-4 border-b border-[var(--border-color)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[var(--primary-accent)]" />
                        Account Plan & Entitlements
                      </CardTitle>
                      <CardDescription>Academic threat research environment and quota definitions</CardDescription>
                    </div>
                    <Badge variant="accent" size="sm">Open Research Prototype</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6 text-xs">
                  {loadingUsage && (
                    <div className="py-2 text-center text-xs text-[var(--text-muted)] animate-pulse">
                      Calculating usage metrics from database...
                    </div>
                  )}
                  {/* Truthful Status Banner */}
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 space-y-1 text-[var(--text-primary)]">
                    <span className="font-bold block text-sm">Non-Metered Academic Research Access</span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      No commercial subscription, paid plan, or billing provider is connected. This prototype provides open research access for evaluated threat analysis, model inference, and explainable neural NLP exploration.
                    </p>
                  </div>

                  {/* Usage Breakdown */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Authoritative Usage Metrics (Current Period)
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Scans Used</span>
                        <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">
                          {usageData?.usage.scansUsedCurrentPeriod ?? 0}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block">This calendar month</span>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Scan Quota Limit</span>
                        <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          Unlimited
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block">Local prototype tier</span>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Lifetime Scans</span>
                        <span className="text-2xl font-bold font-mono text-[var(--secondary-accent)]">
                          {usageData?.usage.totalLifetimeScans ?? 0}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block">Total evaluated records</span>
                      </div>
                    </div>
                  </div>

                  {/* Included Research Features */}
                  <div className="space-y-2 pt-4 border-t border-[var(--border-color)]">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Active Prototype Capabilities
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        "5-Branch Feature Fusion + Custom Residual Network inference model",
                        "Multi-modal feature attribution & explainability heatmap",
                        "Local persistent SQLite database audit trail",
                        "Forensic scan history export (JSON / CSV format)",
                        "Real-time heuristic threat indicator scanner",
                        "Responsive Dark / Light frosted design system",
                      ].map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]/60 text-[11px] text-[var(--text-primary)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-muted)]">Loading Account & Profile...</div>}>
      <AccountContent />
    </Suspense>
  );
}
