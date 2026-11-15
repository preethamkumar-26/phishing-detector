"use client";

import React, { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [isRippling, setIsRippling] = useState(false);

  const handleClick = () => {
    setIsRippling(true);
    toggleTheme();
    setTimeout(() => setIsRippling(false), 650);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]/50 active:scale-95 group overflow-hidden"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {/* Ripple ring animation on click */}
      {isRippling && (
        <span
          className="absolute inset-0 rounded-full bg-[var(--primary-accent)]/20 animate-ping pointer-events-none"
          style={{ animationDuration: "600ms", animationIterationCount: "1" }}
        />
      )}

      <div className="relative w-5 h-5 flex items-center justify-center pointer-events-none">
        {/* Sun Icon (Illuminated when dark, ready to transition to daylight) */}
        <Sun
          className={`w-5 h-5 absolute inset-0 text-amber-400 dark:text-amber-300 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark
              ? "rotate-0 scale-100 opacity-100 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]"
              : "rotate-90 scale-0 opacity-0"
          }`}
        />

        {/* Moon Icon (Illuminated when light, ready to transition to night) */}
        <Moon
          className={`w-5 h-5 absolute inset-0 text-indigo-600 dark:text-indigo-400 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            !isDark
              ? "rotate-0 scale-100 opacity-100 drop-shadow-[0_0_6px_rgba(99,102,241,0.35)]"
              : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </div>
    </button>
  );
}
