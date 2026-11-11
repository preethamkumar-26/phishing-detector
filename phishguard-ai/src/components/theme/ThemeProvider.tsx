"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme | null;
  toggleTheme: () => void;
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
  const [theme, setTheme] = useState<Theme | null>(null);

  const applyTheme = useCallback((nextTheme: Theme) => {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => applyTheme(getStoredTheme() ?? (mediaQuery.matches ? "dark" : "light"));
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) syncTheme();
    };

    syncTheme();
    mediaQuery.addEventListener("change", syncTheme);
    window.addEventListener("storage", handleStorage);

    return () => {
      mediaQuery.removeEventListener("change", syncTheme);
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const currentTheme = theme ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn("Unable to save the theme preference.", error);
    }
  }, [applyTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
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
