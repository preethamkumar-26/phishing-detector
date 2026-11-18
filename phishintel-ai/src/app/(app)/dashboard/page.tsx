"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePhishGuard, ScanItem } from "@/context/PhishGuardContext";

const ACT = [74, 81, 69, 92, 88, 104, 97, 110, 95, 121, 108, 117, 126, 146];
const ACT_P = [19, 22, 18, 26, 23, 29, 25, 31, 24, 34, 28, 32, 34, 39];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

const BASELINE_TIME = 1794747600000;

const fmtAbs = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtRel = (ts: number, now = BASELINE_TIME) => {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  return Math.round(h / 24) + " d ago";
};

export default function OverviewPage() {
  const router = useRouter();
  const { scans, setSelectedScanId, evalArtifact, serviceStatus, formatP } = usePhishGuard();

  const handleOpenScan = (id: string) => {
    setSelectedScanId(id);
    router.push("/explainability");
  };

  const feedScans = useMemo(() => scans.slice(0, 5), [scans]);
  const hotScan = useMemo(() => feedScans.find((s) => s.decision === "PHISHING"), [feedScans]);
  const recentTableScans = useMemo(() => scans.slice(0, 6), [scans]);
  const lastScan = scans[0];

  // Sparkline points
  const sparkSvg = useMemo(() => {
    const max = Math.max(...ACT), min = Math.min(...ACT);
    const pts = ACT.map((v, i) => [
      4 + i * (142 / (ACT.length - 1)),
      38 - ((v - min) / (max - min)) * 30,
    ]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const l = pts[pts.length - 1];
    return { d, lx: l[0], ly: l[1] };
  }, []);

  // Radar SVG constants
  const radarNodes = useMemo(() => {
    const cx = 400, cy = 432;
    const pt = (r: number, a: number) => [
      cx + r * Math.cos((a * Math.PI) / 180),
      cy - r * Math.sin((a * Math.PI) / 180),
    ];

    const degreeTicks: Array<{ x1: number; y1: number; x2: number; y2: number; long: boolean }> = [];
    for (let i = 0, a = 3; a <= 177; a += 1.2, i++) {
      const long = i % 6 === 0;
      const [x1, y1] = pt(334, a);
      const [x2, y2] = pt(long ? 356 : 349, a);
      degreeTicks.push({ x1, y1, x2, y2, long });
    }

    const innerTicks: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let a = 4; a <= 176; a += 1.6) {
      const [x1, y1] = pt(152, a);
      const [x2, y2] = pt(166, a);
      innerTicks.push({ x1, y1, x2, y2 });
    }

    const rate = 0.269, gr = 120;
    const a0 = 150, a1 = a0 - rate * 120;
    const [gx0, gy0] = pt(gr, a0);
    const [gx1, gy1] = pt(gr, a1);
    const [tx0, ty0] = pt(gr, 30);

    const outerNodes = [
      { r: 292, a: 154, label: "Outlook", sub: "612", anchor: "end", dx: -10, dy: 4 },
      { r: 292, a: 122, label: "Gmail", sub: "498", anchor: "middle", dx: 0, dy: -26 },
      { r: 292, a: 56, label: "Yahoo", sub: "187", anchor: "middle", dx: 0, dy: -26 },
      { r: 292, a: 24, label: "MAPI", sub: "131", anchor: "start", dx: 10, dy: 4 },
      { r: 226, a: 112, label: "+384", sub: "Flagged", anchor: "middle", dx: 0, dy: -26, size: 15 },
    ].map((n) => {
      const [x, y] = pt(n.r, n.a);
      return { ...n, x, y };
    });

    const branchSquaresOuter = [
      { l: "F", a: 160 },
      { l: "S", a: 132 },
      { l: "T", a: 64 },
      { l: "U", a: 40 },
      { l: "M", a: 18 },
    ].map((b) => {
      const [x, y] = pt(226, b.a);
      return { ...b, x, y };
    });

    const branchSquaresInner = [
      { l: "U", a: 86 },
      { l: "M", a: 146 },
    ].map((b) => {
      const [x, y] = pt(186, b.a);
      return { ...b, x, y };
    });

    const warningMarkers = [
      { r: 262, a: 98 },
      { r: 258, a: 30 },
      { r: 256, a: 148 },
    ].map((m) => {
      const [x, y] = pt(m.r, m.a);
      return { x, y };
    });

    return {
      cx,
      cy,
      degreeTicks,
      innerTicks,
      gauge: { gx0, gy0, gx1, gy1, tx0, ty0, gr },
      outerNodes,
      branchSquaresOuter,
      branchSquaresInner,
      warningMarkers,
    };
  }, []);

  // 14 days activity bars
  const maxBar = useMemo(() => Math.max(...ACT), []);
  const [nowTime, setNowTime] = React.useState<number>(BASELINE_TIME);
  const today = useMemo(() => new Date(nowTime), [nowTime]);

  React.useEffect(() => {
    setNowTime(Date.now());
  }, []);

  return (
    <div>
      {/* ================= DASHBOARD HERO ================= */}
      <div className="panel-dark hero no-hover">
        {/* Left column */}
        <div className="hero-left" style={{ display: "flex", flexDirection: "column", gap: 22, paddingBottom: 22 }}>
          <div className="hero-title">
            <span className="sq" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </span>
            Detection overview
          </div>

          <div>
            <div className="lbl" style={{ fontSize: "12.5px", marginBottom: 12 }}>
              Emails analysed
            </div>
            <div className="big">
              1,428<small>30 days</small>
            </div>
            <svg
              id="spark"
              width="150"
              height="44"
              viewBox="0 0 150 44"
              style={{ marginTop: 14, display: "block" }}
              aria-hidden="true"
            >
              <path
                d={sparkSvg.d}
                fill="none"
                stroke="rgba(236,238,229,.75)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx={sparkSvg.lx} cy={sparkSvg.ly} r="3" fill="#ECEEE5" />
            </svg>
          </div>
        </div>

        {/* Center column: Radar SVG */}
        <div className="hero-center">
          <svg
            id="radar"
            viewBox="0 0 800 400"
            preserveAspectRatio="xMidYMax meet"
            role="img"
            aria-label="Phishing rate 26.9 percent across 1,428 analysed emails"
          >
            <defs>
              <radialGradient id="rcore" cx="50%" cy="20%" r="80%">
                <stop offset="0" stopColor="#3B423D" />
                <stop offset="0.55" stopColor="#232824" />
                <stop offset="1" stopColor="#191D1A" />
              </radialGradient>
            </defs>

            {radarNodes.degreeTicks.map((t, i) => (
              <line
                key={i}
                x1={t.x1.toFixed(1)}
                y1={t.y1.toFixed(1)}
                x2={t.x2.toFixed(1)}
                y2={t.y2.toFixed(1)}
                stroke={`rgba(236,238,229,${t.long ? 0.3 : 0.13})`}
              />
            ))}

            <circle cx={radarNodes.cx} cy={radarNodes.cy} r="292" fill="none" stroke="rgba(236,238,229,.11)" />
            <circle cx={radarNodes.cx} cy={radarNodes.cy} r="226" fill="none" stroke="rgba(236,238,229,.09)" />

            {radarNodes.innerTicks.map((t, i) => (
              <line
                key={i}
                x1={t.x1.toFixed(1)}
                y1={t.y1.toFixed(1)}
                x2={t.x2.toFixed(1)}
                y2={t.y2.toFixed(1)}
                stroke="rgba(236,238,229,.12)"
              />
            ))}

            <circle cx={radarNodes.cx} cy={radarNodes.cy} r="140" fill="url(#rcore)" stroke="rgba(236,238,229,.10)" />

            {/* Gauge path */}
            <path
              d={`M${radarNodes.gauge.gx0} ${radarNodes.gauge.gy0} A${radarNodes.gauge.gr} ${radarNodes.gauge.gr} 0 0 1 ${radarNodes.gauge.tx0} ${radarNodes.gauge.ty0}`}
              fill="none"
              stroke="rgba(236,238,229,.07)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={`M${radarNodes.gauge.gx0} ${radarNodes.gauge.gy0} A${radarNodes.gauge.gr} ${radarNodes.gauge.gr} 0 0 1 ${radarNodes.gauge.gx1} ${radarNodes.gauge.gy1}`}
              fill="none"
              stroke="#EF6A1E"
              strokeWidth="5"
              strokeLinecap="round"
            />

            <text
              x={radarNodes.cx}
              y="364"
              textAnchor="middle"
              fill="#ECEEE5"
              fontFamily="var(--font-outfit), Outfit, system-ui"
              fontWeight="300"
              fontSize="54"
              letterSpacing="-1.5"
            >
              26.9<tspan fontSize="26" dx="2">%</tspan>
            </text>
            <text
              x={radarNodes.cx}
              y="386"
              textAnchor="middle"
              fill="#8C9388"
              fontFamily="var(--font-outfit), Outfit, system-ui"
              fontSize="13"
            >
              Phishing rate · 30d
            </text>

            {/* Apex node (1,428 Emails) */}
            <circle cx={radarNodes.cx} cy={radarNodes.cy - 292} r="3" fill="#ECEEE5" opacity=".75" />
            <text
              x={radarNodes.cx}
              y={radarNodes.cy - 292 - 30}
              textAnchor="middle"
              fill="#ECEEE5"
              fontFamily="var(--font-outfit), Outfit, system-ui"
              fontSize="17"
            >
              1,428
            </text>
            <text
              x={radarNodes.cx}
              y={radarNodes.cy - 292 - 16}
              textAnchor="middle"
              fill="#8C9388"
              fontFamily="var(--font-outfit), Outfit, system-ui"
              fontSize="10.5"
            >
              Emails
            </text>
            <rect x={radarNodes.cx - 6} y={radarNodes.cy - 292 - 6} width="12" height="12" rx="2" fill="#ECEEE5" />

            {/* Outer labeled nodes */}
            {radarNodes.outerNodes.map((n, i) => (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r="3" fill="#ECEEE5" opacity=".75" />
                <text
                  x={n.x + n.dx}
                  y={n.y + n.dy}
                  textAnchor={n.anchor as any}
                  fill="#ECEEE5"
                  fontFamily="var(--font-outfit), Outfit, system-ui"
                  fontSize={n.size || 14}
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text
                    x={n.x + n.dx}
                    y={n.y + n.dy + 13}
                    textAnchor={n.anchor as any}
                    fill="#8C9388"
                    fontFamily="var(--font-outfit), Outfit, system-ui"
                    fontSize="10.5"
                  >
                    {n.sub}
                  </text>
                )}
              </g>
            ))}

            {/* Branch badges on 226 ring */}
            {radarNodes.branchSquaresOuter.map((b, i) => (
              <g key={i}>
                <rect
                  x={b.x - 8}
                  y={b.y - 8}
                  width="16"
                  height="16"
                  rx="3"
                  fill="#262B27"
                  stroke="rgba(236,238,229,.16)"
                />
                <text
                  x={b.x}
                  y={b.y + 3.5}
                  textAnchor="middle"
                  fill="#ECEEE5"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                  fontSize="9"
                >
                  {b.l}
                </text>
              </g>
            ))}

            {/* Branch badges on 186 ring */}
            {radarNodes.branchSquaresInner.map((b, i) => (
              <g key={i}>
                <rect
                  x={b.x - 7}
                  y={b.y - 7}
                  width="14"
                  height="14"
                  rx="3"
                  fill="#262B27"
                  stroke="rgba(236,238,229,.12)"
                />
                <text
                  x={b.x}
                  y={b.y + 3}
                  textAnchor="middle"
                  fill="#8C9388"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                  fontSize="8"
                >
                  {b.l}
                </text>
              </g>
            ))}

            {/* Warning triangles */}
            {radarNodes.warningMarkers.map((m, i) => (
              <g key={i}>
                <path
                  d={`M${m.x} ${m.y - 9} L${m.x + 9} ${m.y + 7} L${m.x - 9} ${m.y + 7} Z`}
                  fill="#EF6A1E"
                  stroke="#EF6A1E"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <rect x={m.x - 0.9} y={m.y - 3} width="1.8" height="5" fill="#131614" />
                <rect x={m.x - 0.9} y={m.y + 3.4} width="1.8" height="1.8" fill="#131614" />
              </g>
            ))}
          </svg>
        </div>

        {/* Right column: Live Feed */}
        <div className="hero-right" style={{ paddingBottom: 22 }}>
          <div className="feed-head">
            <span className="live">
              <i aria-hidden="true" />
              Live feed
            </span>
            <button className="d-btn" type="button" title="Window">
              24h
            </button>
            <Link href="/history" className="d-btn" aria-label="Open scan history">
              ···
            </Link>
          </div>

          <div className="feed" id="feed">
            {feedScans.map((s) => {
              const isHot = s === hotScan;
              const isPhish = s.decision === "PHISHING";
              return (
                <button
                  key={s.id}
                  type="button"
                  className={isHot ? "hot" : ""}
                  onClick={() => handleOpenScan(s.id)}
                  title={`Open explanation for ${s.id}`}
                >
                  <span className="ic" aria-hidden="true">
                    {isPhish ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.5 1.5 21h21L12 2.5Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4.5Z" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="m5 12.5 4.5 4.5L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="t">
                    <b>{isPhish ? "Phishing" : "Safe"}</b>
                    <span className="sep">|</span>
                    {s.email.subject}
                  </span>
                </button>
              );
            })}

            <Link
              href="/history"
              className="d-btn"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--r-sm)",
                background: "rgba(236,238,229,.045)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span className="ic" style={{ background: "transparent", color: "inherit" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </span>
              <span className="t" style={{ opacity: 0.7 }}>
                {scans.length} scans in history
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ================= 2 KPI CARDS (MAIL SOURCES & TOP INDICATORS) ================= */}
      <div className="grid g2 mt">
        {/* Card 1: Mail Sources */}
        <div className="card warm">
          <div className="card-head">
            <div>
              <h3>Mail sources</h3>
            </div>
            <Link href="/history" className="go" aria-label="View history breakdown">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </Link>
          </div>
          <div className="src-row">
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                borderRadius: "var(--r-sm)",
                background: "rgba(255,255,255,.4)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            Outlook headers<span className="v">612</span>
          </div>
          <div className="src-row">
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                borderRadius: "var(--r-sm)",
                background: "rgba(255,255,255,.4)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            Gmail headers<span className="v">498</span>
          </div>
          <div className="src-row">
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                borderRadius: "var(--r-sm)",
                background: "rgba(255,255,255,.4)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            Yahoo headers<span className="v">187</span>
          </div>
          <div className="src-row">
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                borderRadius: "var(--r-sm)",
                background: "rgba(255,255,255,.4)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M3 10h18" />
              </svg>
            </span>
            MAPI export<span className="v">131</span>
          </div>
        </div>

        {/* Card 2: Top Indicators */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Top indicators</h3>
            </div>
            <Link href="/explainability" className="go" aria-label="Open explainability">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </Link>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            <div className="meter-row">
              <span className="k">Urgency / pressure</span>
              <div className="meter">
                <i style={{ width: "80%", ["--c" as any]: "var(--phish)" }} />
              </div>
              <span className="v">241</span>
            </div>
            <div className="meter-row">
              <span className="k">Credential request</span>
              <div className="meter">
                <i style={{ width: "59%", ["--c" as any]: "var(--accent)" }} />
              </div>
              <span className="v">176</span>
            </div>
            <div className="meter-row">
              <span className="k">URL anomaly</span>
              <div className="meter">
                <i style={{ width: "51%", ["--c" as any]: "var(--accent)" }} />
              </div>
              <span className="v">152</span>
            </div>
            <div className="meter-row">
              <span className="k">Transfer request</span>
              <div className="meter">
                <i style={{ width: "44%", ["--c" as any]: "var(--fin)" }} />
              </div>
              <span className="v">133</span>
            </div>
            <div className="meter-row">
              <span className="k">Reply-To mismatch</span>
              <div className="meter">
                <i style={{ width: "33%", ["--c" as any]: "var(--safe)" }} />
              </div>
              <span className="v">98</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= METADATA STRIP ================= */}
      <div className="strip no-hover">
        <div className="it">
          <span className="mk">WS</span>
          <div>
            <div className="k">Workspace created</div>
            <div className="v mono" style={{ fontSize: "12.5px" }}>
              24 Sep 2026 · 11:05
            </div>
          </div>
        </div>
        <div className="ln" />
        <div className="it">
          <span className="mk">LS</span>
          <div>
            <div className="k">Last scan</div>
            <div className="v mono" style={{ fontSize: "12.5px" }} suppressHydrationWarning>
              {lastScan ? fmtAbs(lastScan.ts) : "—"}
            </div>
          </div>
        </div>
        <div className="ln" />
        <div className="it">
          <span className="mk">EV</span>
          <div>
            <div className="k">Last evaluation</div>
            <div className="v mono" style={{ fontSize: "12.5px" }}>
              {evalArtifact ? `${evalArtifact.date || "loaded"} · ${evalArtifact.model_version || ""}` : "none on record"}
            </div>
          </div>
        </div>
        <div className="ln" />
        <Link href="/history" className="btn btn-accent">
          Full history
        </Link>
      </div>

      {/* ================= RECENT SCANS & ACTIVITY ================= */}
      <div className="grid g-2-1 mt">
        {/* Recent scans table */}
        <div className="card no-hover">
          <div className="card-head">
            <div>
              <h3>Recent scans</h3>
              <p>Latest analyses in this workspace. Select a row to open its explanation.</p>
            </div>
            <Link href="/analyzer" className="btn btn-dark btn-sm">
              Scan email
            </Link>
          </div>
          <div className="tbl-wrap">
            <table className="tbl" id="recent-tbl">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Decision</th>
                  <th className="num">P<sub>phish</sub></th>
                  <th className="num">When</th>
                </tr>
              </thead>
              <tbody>
                {recentTableScans.map((s) => {
                  const isPhish = s.decision === "PHISHING";
                  return (
                    <tr
                      key={s.id}
                      className="clickable"
                      tabIndex={0}
                      onClick={() => handleOpenScan(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleOpenScan(s.id);
                      }}
                      title="Open explanation"
                    >
                      <td>
                        <div className="trunc">{s.email.subject}</div>
                        <div className="t-sub trunc">{s.email.from}</div>
                      </td>
                      <td>
                        <span className={`verdict ${isPhish ? "v-phish" : "v-safe"}`}>
                          {isPhish ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2.5 1.5 21h21L12 2.5Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4.5Z" />
                            </svg>
                          ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="m5 12.5 4.5 4.5L19 7" />
                            </svg>
                          )}
                          {isPhish ? "Phishing" : "Safe"}
                        </span>
                      </td>
                      <td className="num">{formatP(s.P)}</td>
                      <td className="num muted" suppressHydrationWarning>{fmtRel(s.ts, nowTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity 14 days chart */}
        <div className="card no-hover">
          <div className="card-head">
            <div>
              <h3>Activity · 14 days</h3>
              <p>Daily volume, split by decision.</p>
            </div>
          </div>
          <div className="bars" role="img" aria-label="Daily scan volume over 14 days">
            {ACT.map((v, i) => {
              const p = ACT_P[i];
              const sf = v - p;
              return (
                <div key={i} className="col" title={`Day ${i + 1}: ${v} scanned · ${p} phishing`}>
                  <i className="p" style={{ height: `${((p / maxBar) * 100).toFixed(1)}%` }} />
                  <i className="s" style={{ height: `${((sf / maxBar) * 100).toFixed(1)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="bars-x">
            {ACT.map((_, i) => {
              const d = new Date(today.getTime() - (13 - i) * 864e5);
              return <span key={i}>{i % 2 ? "" : d.getDate()}</span>;
            })}
          </div>
          <div className="legend" style={{ marginTop: 14 }}>
            <span>
              <i style={{ background: "#3A3F38" }} />
              Safe
            </span>
            <span>
              <i style={{ background: "var(--accent)" }} />
              Phishing
            </span>
            <span style={{ marginLeft: "auto" }} className="mono">
              26.9% flagged
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
