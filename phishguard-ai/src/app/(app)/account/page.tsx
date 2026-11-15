"use client";

import React, { useState, useMemo } from "react";
import { usePhishGuard } from "@/context/PhishGuardContext";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtAbs = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AccountPage() {
  const { profile, updateProfile, settings, updateSettings, activity, usage, logActivity, showToast } =
    usePhishGuard();

  const [activeSec, setActiveSec] = useState<"profile" | "info" | "security" | "prefs" | "activity" | "plan">(
    "profile"
  );

  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [org, setOrg] = useState(profile.org);
  const [team, setTeam] = useState(profile.team);

  const initials = useMemo(() => {
    const w = (name || "Analyst").trim().split(/\s+/);
    return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }, [name]);

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const handleSaveProfile = () => {
    updateProfile({
      name: name.trim() || "Analyst",
      role: role.trim(),
      org: org.trim(),
      team: team.trim(),
    });
    logActivity("Updated profile");
    showToast("Profile saved in this browser");
  };

  const handleCancelProfile = () => {
    setName(profile.name);
    setRole(profile.role);
    setOrg(profile.org);
    setTeam(profile.team);
    showToast("Changes discarded");
  };

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Account</h1>
          <p>
            Your profile and preferences. Without an identity service connected, these are stored only in this browser.
          </p>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "240px minmax(0, 1fr)", alignItems: "start" }}
        id="acc-grid"
      >
        {/* Left Side Navigation */}
        <div className="card" style={{ padding: 10 }}>
          <nav className="side-nav" aria-label="Account sections">
            <button
              type="button"
              className={activeSec === "profile" ? "on" : ""}
              onClick={() => setActiveSec("profile")}
            >
              Personal profile
            </button>
            <button
              type="button"
              className={activeSec === "info" ? "on" : ""}
              onClick={() => setActiveSec("info")}
            >
              Profile information
            </button>
            <button
              type="button"
              className={activeSec === "security" ? "on" : ""}
              onClick={() => setActiveSec("security")}
            >
              Security &amp; privacy
            </button>
            <button
              type="button"
              className={activeSec === "prefs" ? "on" : ""}
              onClick={() => setActiveSec("prefs")}
            >
              Preferences
            </button>
            <button
              type="button"
              className={activeSec === "activity" ? "on" : ""}
              onClick={() => setActiveSec("activity")}
            >
              Account activity
            </button>
            <button
              type="button"
              className={activeSec === "plan" ? "on" : ""}
              onClick={() => setActiveSec("plan")}
            >
              Plan &amp; usage
            </button>
          </nav>
        </div>

        {/* Right Content Sections */}
        <div>
          {/* Section 1: Personal profile */}
          {activeSec === "profile" && (
            <div className="card acc-sec on">
              <div className="profile-hd">
                <div className="av" id="acc-av">
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 19 }} id="acc-name">
                    {profile.name || "Analyst"}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }} id="acc-role">
                    {[profile.role, profile.org].filter(Boolean).join(" · ") || "Security analyst"}
                  </div>
                </div>
              </div>

              <div className="grid g2" style={{ marginTop: 22 }}>
                <div className="field">
                  <label htmlFor="p-name">Display name</label>
                  <input
                    className="input"
                    id="p-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-role">Role</label>
                  <input
                    className="input"
                    id="p-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-org">Organisation</label>
                  <input
                    className="input"
                    id="p-org"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-team">Team</label>
                  <input
                    className="input"
                    id="p-team"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                  />
                </div>
              </div>

              <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
                <button type="button" className="btn btn-line" onClick={handleCancelProfile}>
                  Cancel
                </button>
                <button type="button" className="btn btn-dark" onClick={handleSaveProfile}>
                  Save profile
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Profile information */}
          {activeSec === "info" && (
            <div className="card acc-sec on">
              <div className="card-head">
                <div>
                  <h3>Profile information</h3>
                  <p>Identity fields provided by the sign-in service</p>
                </div>
              </div>
              <dl className="kv">
                <dt>Email</dt>
                <dd>analyst@phishguard.local</dd>
                <dt>User ID</dt>
                <dd className="mono">usr_analyst_01</dd>
                <dt>Sign-in method</dt>
                <dd>local PBKDF2</dd>
                <dt>Time zone</dt>
                <dd>{timeZone}</dd>
                <dt>Member since</dt>
                <dd>24 Sep 2026</dd>
              </dl>
            </div>
          )}

          {/* Section 3: Security & privacy */}
          {activeSec === "security" && (
            <div className="card acc-sec on">
              <div className="card-head">
                <div>
                  <h3>Security &amp; privacy</h3>
                  <p>Managed by your identity provider once connected</p>
                </div>
              </div>
              <div className="set-row">
                <div>
                  <div className="t">Password &amp; passkeys</div>
                  <div className="d">Handled by the identity provider. PhishGuard never stores credentials.</div>
                </div>
                <span className="tag">configured</span>
              </div>
              <div className="set-row">
                <div>
                  <div className="t">Two-factor authentication</div>
                  <div className="d">Enforced at sign-in by your organisation&apos;s policy.</div>
                </div>
                <span className="tag">not connected</span>
              </div>
              <div className="set-row">
                <div>
                  <div className="t">Active sessions</div>
                  <div className="d">This browser only.</div>
                </div>
                <span className="tag">1 session</span>
              </div>
              <div className="set-row">
                <div>
                  <div className="t">Store scans in this browser</div>
                  <div className="d">Email content you analyse is kept in local storage so it appears in history.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="s-store2"
                    checked={settings.store}
                    onChange={(e) => updateSettings({ store: e.target.checked })}
                  />
                  <span />
                </label>
              </div>
            </div>
          )}

          {/* Section 4: Preferences */}
          {activeSec === "prefs" && (
            <div className="card acc-sec on">
              <div className="card-head">
                <div>
                  <h3>Preferences</h3>
                </div>
              </div>
              <div className="set-row">
                <div>
                  <div className="t">Start page</div>
                  <div className="d">Page shown when PhishGuard opens.</div>
                </div>
                <select
                  className="select"
                  id="pref-start"
                  style={{ width: 200 }}
                  value={settings.start}
                  onChange={(e) => {
                    updateSettings({ start: e.target.value });
                    showToast("Start page updated");
                  }}
                >
                  <option value="overview">Overview</option>
                  <option value="analyzer">Email analyzer</option>
                  <option value="history">Scan history</option>
                </select>
              </div>
              <div className="set-row">
                <div>
                  <div className="t">Score format</div>
                  <div className="d">
                    How P<sub>phish</sub> is displayed.
                  </div>
                </div>
                <select
                  className="select"
                  id="pref-fmt"
                  style={{ width: 200 }}
                  value={settings.fmt}
                  onChange={(e) => {
                    updateSettings({ fmt: e.target.value as "prob" | "pct" });
                    showToast("Score format updated");
                  }}
                >
                  <option value="prob">Probability (0.973)</option>
                  <option value="pct">Percent (97.3%)</option>
                </select>
              </div>
              <div className="set-row">
                <div>
                  <div className="t">Open explanation after each scan</div>
                  <div className="d">Jump to Explainability automatically when an analysis finishes.</div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    id="pref-jump"
                    checked={settings.jump}
                    onChange={(e) => updateSettings({ jump: e.target.checked })}
                  />
                  <span />
                </label>
              </div>
            </div>
          )}

          {/* Section 5: Account activity */}
          {activeSec === "activity" && (
            <div className="card acc-sec on">
              <div className="card-head">
                <div>
                  <h3>Account activity</h3>
                  <p>Recent actions in this browser</p>
                </div>
              </div>
              <div id="acc-activity">
                {activity.length ? (
                  activity.slice(0, 15).map((a, i) => (
                    <div key={i} className="li">
                      <span className="ico">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m9 6 6 6-6 6" />
                        </svg>
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className="trunc" style={{ maxWidth: 520 }}>
                          {a.text}
                        </div>
                        <div className="n">{fmtAbs(a.ts)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    No activity yet in this browser.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 6: Plan & usage */}
          {activeSec === "plan" && (
            <div className="card acc-sec on">
              <div className="card-head">
                <div>
                  <h3>Plan &amp; usage</h3>
                </div>
                <span className="tag">research build</span>
              </div>
              <dl className="kv">
                <dt>Scans this browser</dt>
                <dd>{usage.scans}</dd>
                <dt>Model-service calls</dt>
                <dd>{usage.calls}</dd>
                <dt>Billing</dt>
                <dd>not configured</dd>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
