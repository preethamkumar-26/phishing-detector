"use client";

import React, { useEffect, useState } from "react";
import { usePhishGuard } from "@/context/PhishGuardContext";
import { REPOSITORY_URL, ARCHITECTURE_IMAGE_PATH, BASE_PAPER_PATH } from "@/config/resources";
import {
  autoDetectBackendEndpoint,
  checkBackendConnection,
  MODEL_ENDPOINT_STORAGE_KEY,
  normalizeAnalyzeEndpoint,
  USE_MODEL_SERVICE_STORAGE_KEY,
} from "@/lib/backendDiscovery";

export default function SettingsPage() {
  const { settings, updateSettings, logActivity, showToast } = usePhishGuard();

  const [tVal, setTVal] = useState<number>(settings.T);
  const [useSvc, setUseSvc] = useState<boolean>(settings.useService);
  const [endpoint, setEndpoint] = useState<string>(settings.endpoint);
  const [testing, setTesting] = useState<boolean>(false);
  const [serviceStatus, setServiceStatus] = useState<{
    type: "checking" | "connected" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const savedToggle = localStorage.getItem(USE_MODEL_SERVICE_STORAGE_KEY);
    if (savedToggle !== null) setUseSvc(savedToggle === "true");

    const detectBackend = async () => {
      setServiceStatus({ type: "checking", message: "Detecting running FastAPI backend..." });
      try {
        const detected = await autoDetectBackendEndpoint();
        if (cancelled) return;

        setEndpoint(detected.endpoint);
        setServiceStatus(
          detected.connected
            ? { type: "connected", message: `Connected to ${detected.endpoint}` }
            : {
                type: "error",
                message: `Backend not reachable at ${detected.endpoint}. Start FastAPI and test the connection.`,
              }
        );
      } catch (error) {
        if (cancelled) return;
        setServiceStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Backend detection failed.",
        });
      }
    };

    void detectBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (localStorage.getItem(USE_MODEL_SERVICE_STORAGE_KEY) === null) {
      setUseSvc(settings.useService);
    }
  }, [settings.useService]);

  const handleTSliderChange = (newT: number) => {
    setTVal(newT);
  };

  const handleTSliderCommit = (newT: number) => {
    updateSettings({ T: newT });
    logActivity(`Set threshold T to ${newT.toFixed(2)}`);
    showToast(`Threshold set to ${newT.toFixed(2)} for new scans`);
  };

  const handleSaveService = () => {
    const normalizedEndpoint = normalizeAnalyzeEndpoint(endpoint);
    setEndpoint(normalizedEndpoint);
    localStorage.setItem(MODEL_ENDPOINT_STORAGE_KEY, normalizedEndpoint);
    localStorage.setItem(USE_MODEL_SERVICE_STORAGE_KEY, String(useSvc));
    updateSettings({
      useService: useSvc,
      endpoint: normalizedEndpoint,
    });
    logActivity("Updated model service settings");
    setServiceStatus({ type: "connected", message: `Saved endpoint: ${normalizedEndpoint}` });
    showToast(useSvc ? "Model service settings saved" : "Using local preview");
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setServiceStatus({ type: "checking", message: "Detecting and testing backend connection..." });
    try {
      const detected = await autoDetectBackendEndpoint();
      const target = detected.connected ? detected.endpoint : normalizeAnalyzeEndpoint(endpoint);
      const probe = await checkBackendConnection(target);

      if (probe.ok) {
        setEndpoint(probe.endpoint);
        localStorage.setItem(MODEL_ENDPOINT_STORAGE_KEY, probe.endpoint);
        setServiceStatus({ type: "connected", message: `Connected to ${probe.endpoint}` });
      } else {
        setServiceStatus({
          type: "error",
          message: `Unable to reach ${probe.endpoint}: ${probe.error || "Connection failed"}`,
        });
      }
    } catch (error) {
      setServiceStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Connection test failed.",
      });
    } finally {
      setTesting(false);
    }
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
                <p>Send scans to a PhishIntel inference endpoint instead of the local preview.</p>
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
            {serviceStatus && (
              <p
                role="status"
                className="muted"
                style={{
                  fontSize: 12,
                  margin: "8px 0 0",
                  color:
                    serviceStatus.type === "connected"
                      ? "var(--success, #15803d)"
                      : serviceStatus.type === "error"
                        ? "var(--danger, #dc2626)"
                        : undefined,
                }}
              >
                {serviceStatus.message}
              </p>
            )}
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

          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="res-link"
            aria-label="GitHub repository (opens in new tab)"
          >
            <span className="ico" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div className="t" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>GitHub repository</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  style={{ opacity: 0.65 }}
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </div>
              <div className="d">Source code, pipeline and model documentation.</div>
            </div>
          </a>

          <a
            href={ARCHITECTURE_IMAGE_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="res-link"
            aria-label="PhishIntel - Architecture (opens full diagram in new tab)"
          >
            <span className="ico" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path d="M10 6.5h4M17.5 10v4M10 17.5h4M6.5 10v4" />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div className="t" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>PhishIntel - Architecture</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  style={{ opacity: 0.65 }}
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </div>
              <div className="d">PAHF-Net end-to-end model architecture diagram (full resolution).</div>
            </div>
          </a>

          <a
            href={BASE_PAPER_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="res-link"
            aria-label="Base Paper (opens PDF in new tab)"
          >
            <span className="ico" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4h12l4 4v12H4z" />
                <path d="M8 12h8M8 16h6" />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div className="t" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>Base Paper</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  style={{ opacity: 0.65 }}
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </div>
              <div className="d">Hosseinzadeh et al., Scientific Reports (2025). Foundational paper extended by PhishIntel.</div>
            </div>
          </a>

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
