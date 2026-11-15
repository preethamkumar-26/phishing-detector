"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme | null;
  toggleTheme: () => void;
  setThemeMode: (theme: Theme) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "phishguard-theme";

function getStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
  } catch (error) {
    console.warn("Unable to read the saved theme preference.", error);
    return null;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(() => {
    if (typeof window === "undefined") return null;
    return getStoredTheme() ?? "dark";
  });
  const [transitionState, setTransitionState] = useState<{ active: boolean; targetTheme: Theme } | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const applyTheme = useCallback((nextTheme: Theme, animate = false) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (animate) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!prefersReduced) {
        root.classList.add("theme-transitioning");
        root.setAttribute("data-theme-transitioning", "true");
        setTransitionState({ active: true, targetTheme: nextTheme });

        if (transitionTimerRef.current) {
          clearTimeout(transitionTimerRef.current);
        }

        transitionTimerRef.current = setTimeout(() => {
          root.classList.remove("theme-transitioning");
          root.removeAttribute("data-theme-transitioning");
          setTransitionState(null);
          transitionTimerRef.current = null;
        }, 650);
      }
    }

    root.classList.toggle("dark", nextTheme === "dark");
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const syncTheme = () => applyTheme(getStoredTheme() ?? "dark", false);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) syncTheme();
    };

    syncTheme();
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const currentTheme = theme ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, true);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn("Unable to save the theme preference.", error);
    }
  }, [applyTheme, theme]);

  const setThemeMode = useCallback(
    (nextTheme: Theme) => {
      applyTheme(nextTheme, true);
      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch (error) {
        console.warn("Unable to save the theme preference.", error);
      }
    },
    [applyTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode, isTransitioning: !!transitionState?.active }}>
      {children}
      {transitionState?.active && (
        <div
          aria-hidden="true"
          className={`theme-ambient-wave fixed inset-0 pointer-events-none z-[9999] ${
            transitionState.targetTheme === "light"
              ? "bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.12)_0%,rgba(56,189,248,0.08)_40%,transparent_70%)]"
              : "bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15)_0%,rgba(37,99,235,0.08)_45%,transparent_70%)]"
          }`}
        />
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
