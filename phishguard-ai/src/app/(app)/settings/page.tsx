"use client";

import React, { useState } from "react";
import { usePhishGuard } from "@/context/PhishGuardContext";

export default function SettingsPage() {
  const { settings, updateSettings, testServiceConnection, logActivity, showToast } = usePhishGuard();

  const [tVal, setTVal] = useState<number>(settings.T);
  const [useSvc, setUseSvc] = useState<boolean>(settings.useService);
  const [endpoint, setEndpoint] = useState<string>(settings.endpoint);
  const [testing, setTesting] = useState<boolean>(false);

  const handleTSliderChange = (newT: number) => {
    setTVal(newT);
  };

  const handleTSliderCommit = (newT: number) => {
    updateSettings({ T: newT });
    logActivity(`Set threshold T to ${newT.toFixed(2)}`);
    showToast(`Threshold set to ${newT.toFixed(2)} for new scans`);
  };

  const handleSaveService = () => {
    updateSettings({
      useService: useSvc,
      endpoint: endpoint.trim(),
    });
    logActivity("Updated model service settings");
    showToast(useSvc && endpoint.trim() ? "Model service settings saved" : "Using local preview");
  };

  const handleTestConnection = async () => {
    setTesting(true);
    await testServiceConnection(endpoint.trim());
    setTesting(false);
  };

  const handleStoreToggle = (checked: boolean) => {
    updateSettings({ store: checked });
    showToast(
      checked
        ? "Scans will be kept in this browser"
        : "Stored scans removed. New scans last for this session only"
    );
  };

  const sliderPercent = ((tVal - 0.05) / 0.9) * 100;

  return (
    <div>
      {/* Page Header */}
      <div className="ph">
        <div>
          <h1>Settings &amp; resources</h1>
          <p>Decision threshold, inference endpoint, data handling and reference material.</p>
        </div>
      </div>

      <div className="grid g-2-1" style={{ alignItems: "start" }}>
        {/* Left Column Settings Cards */}
        <div className="stack" style={{ gap: 10 }}>
          {/* Decision Threshold Card */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Decision threshold</h3>
                <p>An email is classified as phishing when P<sub>phish</sub> ≥ T.</p>
              </div>
              <span className="tag acc" id="t-state">
                calibrated
              </span>
            </div>
            <div className="row" style={{ gap: 18 }}>
              <input
                type="range"
                id="s-t"
                min={0.05}
                max={0.95}
                step={0.01}
                value={tVal}
                style={{ ["--v" as any]: `${sliderPercent}%` }}
                aria-label="Threshold T"
                onChange={(e) => handleTSliderChange(parseFloat(e.target.value))}
                onMouseUp={() => handleTSliderCommit(tVal)}
                onTouchEnd={() => handleTSliderCommit(tVal)}
              />
              <span
                className="big"
                style={{ color: "var(--ink)", fontSize: 36, minWidth: 84, textAlign: "right" }}
                id="s-t-v"
              >
                {tVal.toFixed(2)}
              </span>
            </div>
            <div className="row between muted mono" style={{ fontSize: 11, marginTop: 6 }}>
              <span>more sensitive</span>
              <span>fewer false alarms</span>
            </div>
            <p className="note" style={{ marginTop: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <span>
                T should be chosen on a validation split and recorded with the evaluation artifact. Until then this
                value is a working default. Changing it affects new scans only.
              </span>
            </p>
          </div>

          {/* Model Service Card */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Model service</h3>
                <p>Send scans to a PhishGuard inference endpoint instead of the local preview.</p>
              </div>
            </div>

            <div className="set-row">
              <div>
                <div className="t">Use model service</div>
                <div className="d">
                  Enabled scans use the FastAPI model. Connection or response errors are surfaced instead of silently
                  replacing the model result.
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  id="s-use"
                  checked={useSvc}
                  onChange={(e) => setUseSvc(e.target.checked)}
                />
                <span />
              </label>
            </div>

            <div className="field" style={{ marginTop: 6 }}>
              <label htmlFor="s-ep">Endpoint (POST, JSON)</label>
              <input
                className="input mono"
                id="s-ep"
                placeholder="http://127.0.0.1:8000/api/v1/analyze"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
              Request: <span className="mono">&#123;subject, sender, content, headers&#125;</span> · Response:{" "}
              <span className="mono">&#123;success, scan_id, is_phishing, verdict, confidence_score, risk_score, p_phish,
                indicators, explainability&#125;</span>
            </p>

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-line"
                disabled={testing}
                onClick={handleTestConnection}
              >
                {testing ? "Testing…" : "Test connection"}
              </button>
              <button type="button" className="btn btn-dark" onClick={handleSaveService}>
                Save
              </button>
            </div>
          </div>

          {/* Data Handling & Notifications */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Data handling &amp; notifications</h3>
              </div>
            </div>

            <div className="set-row">
              <div>
                <div className="t">Store scans in this browser</div>
                <div className="d">Off: scans last only for this session.</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  id="s-store"
                  checked={settings.store}
                  onChange={(e) => handleStoreToggle(e.target.checked)}
                />
                <span />
              </label>
            </div>

            <div className="set-row">
              <div>
                <div className="t">Mask card and account numbers</div>
                <div className="d">Show only the last four digits in results and history.</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked disabled />
                <span />
              </label>
            </div>

            <div className="set-row">
              <div>
                <div className="t">Notify on phishing decision</div>
                <div className="d">Delivery needs a notification backend. Not connected.</div>
              </div>
              <label className="switch">
                <input type="checkbox" disabled />
                <span />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column Resources Card */}
        <div className="card" id="resources">
          <div className="card-head">
            <div>
              <h3>Resources</h3>
            </div>
          </div>

          <div className="res-link">
            <span className="ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4h12l4 4v12H4z" />
                <path d="M8 12h8M8 16h6" />
              </svg>
            </span>
            <div>
              <div className="t">Reference paper</div>
              <div className="d">Hosseinzadeh et al., Scientific Reports (2025). Background literature only.</div>
            </div>
          </div>

          <div className="res-link">
            <span className="ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </span>
            <div>
              <div className="t">Research poster</div>
              <div className="d">Smarter Phishing Email Detection. Dataset summary and limitations.</div>
            </div>
          </div>

          <div className="res-link">
            <span className="ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
              </svg>
            </span>
            <div>
              <div className="t">Keyboard</div>
              <div className="d">
                <kbd>Ctrl</kbd> + <kbd>↵</kbd> analyse · <kbd>G</kbd> then <kbd>A</kbd> analyzer · <kbd>G</kbd> then{" "}
                <kbd>H</kbd> history
              </div>
            </div>
          </div>

          <div className="res-link">
            <span className="ico">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
              </svg>
            </span>
            <div>
              <div className="t">About the local preview</div>
              <div className="d">
                Without a model service, scores come from a transparent rule-weighted scorer over the 68 structured
                features. The 768-d text branch needs trained weights, so it is excluded.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
