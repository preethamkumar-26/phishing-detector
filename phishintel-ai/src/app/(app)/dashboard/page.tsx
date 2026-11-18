"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePhishGuard } from "@/context/PhishGuardContext";
import { classifyMailSource, MailSourceType } from "@/lib/mailSource";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

const fmtAbs = (ts: number) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtRel = (ts: number, now: number) => {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + " h ago";
  return Math.round(h / 24) + " d ago";
};

export default function OverviewPage() {
  const router = useRouter();
  const { scans, setSelectedScanId, evalArtifact, formatP } = usePhishGuard();

  const [timeWindow, setTimeWindow] = useState<"30d" | "24h">("30d");
  const [nowTime, setNowTime] = useState<number>(() => Date.now());

  useEffect(() => {
    setNowTime(Date.now());
    const interval = setInterval(() => setNowTime(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenScan = (id: string) => {
    setSelectedScanId(id);
    router.push("/explainability");
  };

  // Filter scans by active window
  const windowScans = useMemo(() => {
    const windowMs = timeWindow === "24h" ? 24 * 3600 * 1000 : 30 * 864e5;
    const cutoff = nowTime - windowMs;
    return scans.filter((s) => s.ts >= cutoff);
  }, [scans, timeWindow, nowTime]);

  const totalAnalysed = windowScans.length;
  const flaggedCount = useMemo(
    () => windowScans.filter((s) => s.decision === "PHISHING").length,
    [windowScans]
  );
  const phishingRate = totalAnalysed > 0 ? flaggedCount / totalAnalysed : null;

  // Feeds and recent tables
  const feedScans = useMemo(() => {
    const list = timeWindow === "24h" ? windowScans : scans;
    return list.slice(0, 5);
  }, [scans, windowScans, timeWindow]);

  const hotScan = useMemo(() => feedScans.find((s) => s.decision === "PHISHING"), [feedScans]);
  const recentTableScans = useMemo(() => scans.slice(0, 6), [scans]);
  const lastScan = scans[0];
  const firstScan = scans[scans.length - 1];

  // 14-day activity bars ending today
  const activity14Days = useMemo(() => {
    const todayEnd = new Date(nowTime);
    todayEnd.setHours(23, 59, 59, 999);

    const buckets = [];
    for (let i = 13; i >= 0; i--) {
      const dayEnd = new Date(todayEnd.getTime() - i * 864e5);
      const dayStart = new Date(dayEnd.getTime() - 864e5 + 1);
      const dayScans = scans.filter((s) => s.ts >= dayStart.getTime() && s.ts <= dayEnd.getTime());
      const pCount = dayScans.filter((s) => s.decision === "PHISHING").length;
      const sCount = dayScans.length - pCount;
      const label = `${dayStart.getDate()} ${MON[dayStart.getMonth()]}`;
      buckets.push({
        label,
        date: dayStart,
        total: dayScans.length,
        phishing: pCount,
        safe: sCount,
      });
    }
    return buckets;
  }, [scans, nowTime]);

  const maxActivityBar = useMemo(() => {
    const maxVal = Math.max(0, ...activity14Days.map((b) => b.total));
    return maxVal > 0 ? maxVal : 1;
  }, [activity14Days]);

  const total14Days = useMemo(
    () => activity14Days.reduce((acc, b) => acc + b.total, 0),
    [activity14Days]
  );
  const flagged14Days = useMemo(
    () => activity14Days.reduce((acc, b) => acc + b.phishing, 0),
    [activity14Days]
  );
  const rate14Days = total14Days > 0 ? ((flagged14Days / total14Days) * 100).toFixed(1) : null;

  // Sparkline from 14 days activity
  const sparkSvg = useMemo(() => {
    const ptsCount = activity14Days.length;
    const max = Math.max(1, ...activity14Days.map((b) => b.total));
    const min = Math.min(...activity14Days.map((b) => b.total));
    const range = max === min ? 1 : max - min;

    const coords = activity14Days.map((b, i) => [
      4 + i * (142 / (ptsCount - 1)),
      38 - ((b.total - min) / range) * 30,
    ]);
    const d = coords.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const lastCoord = coords[coords.length - 1];
    return { d, lx: lastCoord[0], ly: lastCoord[1] };
  }, [activity14Days]);

  // Mail sources classification
  const mailSources = useMemo(() => {
    const counts: Record<MailSourceType, number> = {
      Outlook: 0,
      Gmail: 0,
      Yahoo: 0,
      MAPI: 0,
      Other: 0,
    };
    for (const s of windowScans) {
      const src = classifyMailSource({ headers: s.email.headers, from: s.email.from });
      counts[src] = (counts[src] || 0) + 1;
    }
    return counts;
  }, [windowScans]);

  // Top indicators aggregated from real scans
  const topIndicators = useMemo(() => {
    const firedMap = new Map<string, { title: string; count: number; category: string }>();
    for (const s of windowScans) {
      const seenTitles = new Set<string>();
      for (const ind of s.indicators || []) {
        if ((ind.score_impact ?? 0) <= 0) continue;
        const key = ind.title.trim();
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          const existing = firedMap.get(key) || {
            title: key,
            count: 0,
            category: ind.category || "security",
          };
          existing.count += 1;
          firedMap.set(key, existing);
        }
      }
    }
    return Array.from(firedMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [windowScans]);

  const maxIndicatorCount = useMemo(
    () => (topIndicators.length > 0 ? topIndicators[0].count : 1),
    [topIndicators]
  );

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

    const rate = phishingRate !== null ? Math.min(1, Math.max(0, phishingRate)) : 0;
    const gr = 120;
    const a0 = 150, a1 = a0 - rate * 120;
    const [gx0, gy0] = pt(gr, a0);
    const [gx1, gy1] = pt(gr, a1);
    const [tx0, ty0] = pt(gr, 30);

    const outerNodes = [
      { r: 292, a: 154, label: "Outlook", sub: String(mailSources.Outlook), anchor: "end", dx: -10, dy: 4 },
      { r: 292, a: 122, label: "Gmail", sub: String(mailSources.Gmail), anchor: "middle", dx: 0, dy: -26 },
      { r: 292, a: 56, label: "Yahoo", sub: String(mailSources.Yahoo), anchor: "middle", dx: 0, dy: -26 },
      {
        r: 292,
        a: 24,
        label: mailSources.Other > 0 && mailSources.MAPI === 0 ? "Other" : "MAPI",
        sub: String(mailSources.Other > 0 && mailSources.MAPI === 0 ? mailSources.Other : mailSources.MAPI),
        anchor: "start",
        dx: 10,
        dy: 4,
      },
      {
        r: 226,
        a: 112,
        label: `+${flaggedCount}`,
        sub: "Flagged",
        anchor: "middle",
        dx: 0,
        dy: -26,
        size: 15,
      },
    ].map((n) => {
      const [x, y] = pt(n.r, n.a);
      return { ...n, x, y };
    });

    // PAHF-Net modality tags (DeBERTa-v3 Text, URL, Structure, Linguistic)
    const branchSquaresOuter = [
      { l: "T", a: 150, title: "Text representation (256d)" },
      { l: "U", a: 115, title: "URL encoder (32d)" },
      { l: "S", a: 65, title: "Structure encoder (32d)" },
      { l: "L", a: 30, title: "Linguistic encoder (32d)" },
    ].map((b) => {
      const [x, y] = pt(226, b.a);
      return { ...b, x, y };
    });

    const branchSquaresInner = [
      { l: "g_t", a: 135 },
      { l: "g_u", a: 100 },
      { l: "g_s", a: 80 },
      { l: "g_l", a: 45 },
    ].map((b) => {
      const [x, y] = pt(186, b.a);
      return { ...b, x, y };
    });

    const warningMarkers = flaggedCount > 0
      ? [
          { r: 262, a: 98 },
          { r: 258, a: 30 },
          { r: 256, a: 148 },
        ].map((m) => {
          const [x, y] = pt(m.r, m.a);
          return { x, y };
        })
      : [];

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
  }, [phishingRate, mailSources, flaggedCount]);

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
              {totalAnalysed.toLocaleString()}
              <small>{timeWindow === "24h" ? "last 24h" : "30 days"}</small>
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
            aria-label={`Phishing rate ${phishingRate !== null ? (phishingRate * 100).toFixed(1) + " percent" : "none"} across ${totalAnalysed} analysed emails`}
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
            {phishingRate !== null && phishingRate > 0 && (
              <path
                d={`M${radarNodes.gauge.gx0} ${radarNodes.gauge.gy0} A${radarNodes.gauge.gr} ${radarNodes.gauge.gr} 0 0 1 ${radarNodes.gauge.gx1} ${radarNodes.gauge.gy1}`}
                fill="none"
                stroke="#EF6A1E"
                strokeWidth="5"
                strokeLinecap="round"
              />
            )}

            <text
              x={radarNodes.cx}
              y="364"
              textAnchor="middle"
              fill="#ECEEE5"
              fontFamily="var(--font-outfit), Outfit, system-ui"
              fontWeight="300"
              fontSize={phishingRate !== null ? "54" : "42"}
              letterSpacing="-1.5"
            >
              {phishingRate !== null ? (
                <>
                  {(phishingRate * 100).toFixed(1)}
                  <tspan fontSize="26" dx="2">%</tspan>
                </>
              ) : (
                "—"
              )}
            </text>
            <text
              x={radarNodes.cx}
              y="386"
              textAnchor="middle"
              fill="#8C9388"
              fontFamily="var(--font-outfit), Outfit, system-ui"
              fontSize="13"
            >
              {totalAnalysed > 0 ? `Phishing rate · ${timeWindow === "24h" ? "24h" : "30d"}` : "No scans in window"}
            </text>

            {/* Apex node (Total emails) */}
            <circle cx={radarNodes.cx} cy={radarNodes.cy - 292} r="3" fill="#ECEEE5" opacity=".75" />
            <text
              x={radarNodes.cx}
              y={radarNodes.cy - 292 - 30}
              textAnchor="middle"
              fill="#ECEEE5"
              fontFamily="var(--font-outfit), Outfit, system-ui"
              fontSize="17"
            >
              {totalAnalysed.toLocaleString()}
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

            {/* PAHF-Net modality badges on 226 ring */}
            {radarNodes.branchSquaresOuter.map((b, i) => (
              <g key={i}>
                <rect
                  x={b.x - 9}
                  y={b.y - 9}
                  width="18"
                  height="18"
                  rx="4"
                  fill="#262B27"
                  stroke="rgba(236,238,229,.22)"
                />
                <text
                  x={b.x}
                  y={b.y + 3.5}
                  textAnchor="middle"
                  fill="#ECEEE5"
                  fontFamily="var(--font-jetbrains-mono), monospace"
                  fontSize="9.5"
                  fontWeight="600"
                >
                  {b.l}
                </text>
              </g>
            ))}

            {/* PAHF-Net gate weights badges on 186 ring */}
            {radarNodes.branchSquaresInner.map((b, i) => (
              <g key={i}>
                <rect
                  x={b.x - 10}
                  y={b.y - 7}
                  width="20"
                  height="14"
                  rx="3"
                  fill="#262B27"
                  stroke="rgba(236,238,229,.14)"
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
            <button
              className={`d-btn ${timeWindow === "24h" ? "active" : ""}`}
              type="button"
              onClick={() => setTimeWindow((w) => (w === "24h" ? "30d" : "24h"))}
              title={`Toggle time window (currently ${timeWindow})`}
              style={timeWindow === "24h" ? { background: "rgba(239,106,30,.25)", borderColor: "var(--accent)" } : {}}
            >
              {timeWindow}
            </button>
            <Link href="/history" className="d-btn" aria-label="Open scan history">
              ···
            </Link>
          </div>

          <div className="feed" id="feed">
            {feedScans.length > 0 ? (
              feedScans.map((s) => {
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
                      {s.email.subject || "Untitled Email"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div style={{ padding: "16px 12px", textAlign: "center", fontSize: "13px", color: "rgba(236,238,229,.6)" }}>
                No scans recorded in {timeWindow === "24h" ? "the last 24 hours" : "this workspace"}.
              </div>
            )}

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
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>
                Classified from message headers & transport routes.
              </p>
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
            Outlook headers
            <span className="v mono">{mailSources.Outlook}</span>
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
            Gmail headers
            <span className="v mono">{mailSources.Gmail}</span>
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
            Yahoo headers
            <span className="v mono">{mailSources.Yahoo}</span>
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
            MAPI export
            <span className="v mono">{mailSources.MAPI}</span>
          </div>
          {mailSources.Other > 0 && (
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              Other / unknown
              <span className="v mono">{mailSources.Other}</span>
            </div>
          )}
        </div>

        {/* Card 2: Top Indicators */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Top indicators</h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0" }}>
                Threat signals triggered across evaluated scans.
              </p>
            </div>
            <Link href="/explainability" className="go" aria-label="Open explainability">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </Link>
          </div>
          <div className="stack" style={{ gap: 14 }}>
            {topIndicators.length > 0 ? (
              topIndicators.map((ind, idx) => {
                const pct = Math.max(12, Math.round((ind.count / maxIndicatorCount) * 100));
                const colors = ["var(--phish)", "var(--accent)", "var(--fin)", "#3A3F38", "var(--safe)"];
                const color = colors[idx % colors.length];
                return (
                  <div key={ind.title} className="meter-row" title={`Triggered in ${ind.count} scan(s)`}>
                    <span className="k">{ind.title}</span>
                    <div className="meter">
                      <i style={{ width: `${pct}%`, ["--c" as any]: color }} />
                    </div>
                    <span className="v mono">{ind.count}</span>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                No threat indicators triggered yet in scanned emails.
              </div>
            )}
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
              {firstScan ? fmtAbs(firstScan.ts) : "15 Nov 2026 · 10:00"}
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
                {recentTableScans.length > 0 ? (
                  recentTableScans.map((s) => {
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
                          <div className="trunc">{s.email.subject || "Untitled Email"}</div>
                          <div className="t-sub trunc">{s.email.from || "Unknown sender"}</div>
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
                        <td className="num muted" suppressHydrationWarning>
                          {fmtRel(s.ts, nowTime)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ padding: "32px 0", textAlign: "center" }} className="muted">
                      No emails scanned yet. Click "Scan email" above to analyze your first email.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity 14 days chart */}
        <div className="card no-hover">
          <div className="card-head">
            <div>
              <h3>Activity · 14 days</h3>
              <p>Emails scanned per day over the last 14 days, split into Safe and Phishing.</p>
            </div>
          </div>
          <div className="bars" role="img" aria-label="Emails scanned per day over the last 14 days, split into Safe and Phishing">
            {activity14Days.map((b, i) => {
              const pHeight = b.total > 0 ? (b.phishing / maxActivityBar) * 100 : 0;
              const sHeight = b.total > 0 ? (b.safe / maxActivityBar) * 100 : 0;
              return (
                <div
                  key={i}
                  className="col"
                  tabIndex={0}
                  title={`${b.label}: ${b.total} scanned (${b.safe} Safe, ${b.phishing} Phishing)`}
                  aria-label={`${b.label}: ${b.total} total, ${b.safe} safe, ${b.phishing} phishing`}
                >
                  <i className="p" style={{ height: `${pHeight.toFixed(1)}%` }} />
                  <i className="s" style={{ height: `${sHeight.toFixed(1)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="bars-x">
            {activity14Days.map((b, i) => (
              <span key={i} title={b.label}>
                {i % 2 === 0 ? b.date.getDate() : ""}
              </span>
            ))}
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
              {rate14Days ? `${rate14Days}% flagged` : "0 scans in 14d"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
