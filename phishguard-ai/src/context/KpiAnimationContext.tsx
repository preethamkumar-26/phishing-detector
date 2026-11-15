"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export interface KpiAnimationContextType {
  dashboardCountersAnimated: boolean;
  modelEvaluationCountersAnimated: boolean;
  markDashboardAnimated: () => void;
  markModelEvaluationAnimated: () => void;
  shouldAnimateDashboard: () => boolean;
  shouldAnimateModelEvaluation: () => boolean;
}

const KpiAnimationContext = createContext<KpiAnimationContextType | null>(null);

export function KpiAnimationProvider({ children }: { children: React.ReactNode }) {
  // In-memory session state: persists during client-side navigation between pages,
  // but naturally resets when a full browser reload occurs.
  const [dashboardAnimated, setDashboardAnimated] = useState(false);
  const [modelEvalAnimated, setModelEvalAnimated] = useState(false);

  // Synchronous refs to prevent race conditions during route transition mounting
  const dashboardAnimatedRef = useRef(false);
  const modelEvalAnimatedRef = useRef(false);

  const markDashboardAnimated = useCallback(() => {
    dashboardAnimatedRef.current = true;
    setDashboardAnimated(true);
  }, []);

  const markModelEvaluationAnimated = useCallback(() => {
    modelEvalAnimatedRef.current = true;
    setModelEvalAnimated(true);
  }, []);

  const shouldAnimateDashboard = useCallback(() => {
    return !dashboardAnimatedRef.current;
  }, []);

  const shouldAnimateModelEvaluation = useCallback(() => {
    return !modelEvalAnimatedRef.current;
  }, []);

  return (
    <KpiAnimationContext.Provider
      value={{
        dashboardCountersAnimated: dashboardAnimated,
        modelEvaluationCountersAnimated: modelEvalAnimated,
        markDashboardAnimated,
        markModelEvaluationAnimated,
        shouldAnimateDashboard,
        shouldAnimateModelEvaluation,
      }}
    >
      {children}
    </KpiAnimationContext.Provider>
  );
}

export function useKpiAnimation(): KpiAnimationContextType {
  const context = useContext(KpiAnimationContext);
  if (!context) {
    throw new Error("useKpiAnimation must be used within a KpiAnimationProvider.");
  }
  return context;
}
