"use client";

import React, { useEffect, useState, useRef } from "react";

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

function createFormatter(decimals: number, suffix: string): (val: number) => string {
  return (val: number) => {
    const fixed = decimals > 0
      ? val.toFixed(decimals)
      : Math.round(val).toLocaleString("en-US");
    return `${fixed}${suffix}`;
  };
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
  const resolvedFormatter = formatter ?? createFormatter(decimals, suffix);

  const target = typeof value === "number"
    ? value
    : Number(String(value).replace(/[^0-9.-]/g, ""));

  const isNumeric = !isNaN(target) && isFinite(target);

  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (!isNumeric) return String(value);
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return resolvedFormatter(target);
    }
    return `${decimals > 0 ? (0).toFixed(decimals) : "0"}${suffix}`;
  });

  const prevTargetRef = useRef(target);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (!isNumeric) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const startValue = isFirstMountRef.current ? 0 : prevTargetRef.current;
    isFirstMountRef.current = false;
    prevTargetRef.current = target;

    let rafId: number;
    let timeoutId: ReturnType<typeof setTimeout>;
    let startTime: number | null = null;

    const runAnimation = () => {
      const step = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeOutCubic(progress);
        const current = startValue + (target - startValue) * easedProgress;

        setDisplayValue(resolvedFormatter(current));

        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          setDisplayValue(resolvedFormatter(target));
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
  }, [target, isNumeric, duration, delay, resolvedFormatter]);

  if (!isNumeric) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span suppressHydrationWarning className={className}>
      {displayValue}
    </span>
  );
}
