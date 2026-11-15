"use client";

import React, { useEffect, useState, useMemo } from "react";

export interface CountUpNumberProps {
  value: number | string;
  duration?: number;
  delay?: number;
  className?: string;
  /** Number of decimal places to display (default: 0 for integers) */
  decimals?: number;
  /** Suffix appended after the number (e.g. "%") */
  suffix?: string;
  formatter?: (val: number) => string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUpNumber({
  value,
  duration = 1050,
  delay = 0,
  className,
  decimals = 0,
  suffix = "",
  formatter,
}: CountUpNumberProps) {
  const formatFn = useMemo(() => {
    if (formatter) return formatter;
    return (val: number) => {
      const fixed = decimals > 0
        ? val.toFixed(decimals)
        : Math.round(val).toLocaleString("en-US");
      return `${fixed}${suffix}`;
    };
  }, [formatter, decimals, suffix]);

  const target = typeof value === "number"
    ? value
    : Number(String(value).replace(/[^0-9.-]/g, ""));

  const isNumeric = !isNaN(target) && isFinite(target);

  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (!isNumeric) return String(value);
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return formatFn(target);
    }
    return formatFn(0);
  });

  useEffect(() => {
    if (!isNumeric) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;
    let startTime: number | null = null;
    const startValue = 0;
    const endValue = target;

    const runAnimation = () => {
      const step = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeOutCubic(progress);
        const current = startValue + (endValue - startValue) * easedProgress;

        setDisplayValue(formatFn(current));

        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          setDisplayValue(formatFn(endValue));
        }
      };
      rafId = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timeoutId = setTimeout(runAnimation, delay);
    } else {
      runAnimation();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [target, isNumeric, duration, delay, formatFn]);

  if (!isNumeric) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span suppressHydrationWarning className={className}>
      {displayValue}
    </span>
  );
}
