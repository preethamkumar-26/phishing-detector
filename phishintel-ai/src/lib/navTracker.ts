// Client-side navigation & KPI animation state tracker for PhishIntel

let previousPath: string | null = null;
let currentPath: string | null = null;
let dashboardCountersAnimated = false;
let modelEvaluationCountersAnimated = false;

export function recordPathTransition(newPath: string) {
  if (typeof window === "undefined") return;
  if (currentPath !== newPath) {
    previousPath = currentPath;
    currentPath = newPath;
    try {
      if (previousPath) {
        sessionStorage.setItem("phishintel-prev-path", previousPath);
      }
      sessionStorage.setItem("phishintel-curr-path", newPath);
    } catch {}
  }
}

export function markFromLanding() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("phishintel-from-landing", "1");
  } catch {}
}

/**
 * Pure check: returns true if Dashboard KPI counters should animate in this session.
 * Does not mutate state during render.
 */
export function shouldDashboardAnimate(): boolean {
  if (typeof window === "undefined") return false;
  return !dashboardCountersAnimated;
}

/**
 * Explicit lifecycle trigger: marks Dashboard counters as completed.
 * Called in useEffect when the page mounts/animates.
 */
export function markDashboardAnimated(): void {
  dashboardCountersAnimated = true;
}

/**
 * Pure check: returns true if Model Evaluation KPI counters should animate in this session.
 * Does not mutate state during render.
 */
export function shouldAnalyticsAnimate(): boolean {
  if (typeof window === "undefined") return false;
  return !modelEvaluationCountersAnimated;
}

/**
 * Explicit lifecycle trigger: marks Model Evaluation counters as completed.
 * Called in useEffect when the page mounts/animates.
 */
export function markModelEvaluationAnimated(): void {
  modelEvaluationCountersAnimated = true;
}

export function resetKpiAnimationState(): void {
  dashboardCountersAnimated = false;
  modelEvaluationCountersAnimated = false;
}
