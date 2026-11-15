import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] " +
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none hover:disabled:transform-none hover:disabled:shadow-none active:disabled:scale-100 " +
      "select-none group/btn motion-reduce:transform-none motion-reduce:transition-none";

    const variantStyles = {
      primary:
        "bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] text-white shadow-sm shadow-blue-900/20 border border-white/20 " +
        "hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(37,99,235,0.28)] dark:hover:shadow-[0_4px_20px_rgba(59,130,246,0.32)] " +
        "active:translate-y-0 active:scale-[0.98] " +
        "[&_svg.lucide-arrow-right]:transition-transform [&_svg.lucide-arrow-right]:duration-200 hover:[&_svg.lucide-arrow-right]:translate-x-0.5 " +
        "[&_svg.lucide-chevron-right]:transition-transform [&_svg.lucide-chevron-right]:duration-200 hover:[&_svg.lucide-chevron-right]:translate-x-0.5 " +
        "[&_svg.lucide-arrow-left]:transition-transform [&_svg.lucide-arrow-left]:duration-200 hover:[&_svg.lucide-arrow-left]:-translate-x-0.5 " +
        "[&_svg.lucide-chevron-left]:transition-transform [&_svg.lucide-chevron-left]:duration-200 hover:[&_svg.lucide-chevron-left]:-translate-x-0.5",
      secondary:
        "bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-hover)] text-[var(--text-primary)] border border-[var(--border-color)] " +
        "hover:border-[var(--primary-accent)]/45 hover:-translate-y-px hover:shadow-xs " +
        "active:translate-y-0 active:scale-[0.98] " +
        "[&_svg.lucide-arrow-right]:transition-transform [&_svg.lucide-arrow-right]:duration-200 hover:[&_svg.lucide-arrow-right]:translate-x-0.5 " +
        "[&_svg.lucide-chevron-right]:transition-transform [&_svg.lucide-chevron-right]:duration-200 hover:[&_svg.lucide-chevron-right]:translate-x-0.5 " +
        "[&_svg.lucide-arrow-left]:transition-transform [&_svg.lucide-arrow-left]:duration-200 hover:[&_svg.lucide-arrow-left]:-translate-x-0.5 " +
        "[&_svg.lucide-chevron-left]:transition-transform [&_svg.lucide-chevron-left]:duration-200 hover:[&_svg.lucide-chevron-left]:-translate-x-0.5",
      outline:
        "bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)] " +
        "hover:border-[var(--primary-accent)]/50 hover:text-[var(--primary-accent)] hover:-translate-y-px hover:shadow-xs " +
        "active:translate-y-0 active:scale-[0.98] " +
        "[&_svg.lucide-arrow-right]:transition-transform [&_svg.lucide-arrow-right]:duration-200 hover:[&_svg.lucide-arrow-right]:translate-x-0.5 " +
        "[&_svg.lucide-chevron-right]:transition-transform [&_svg.lucide-chevron-right]:duration-200 hover:[&_svg.lucide-chevron-right]:translate-x-0.5 " +
        "[&_svg.lucide-arrow-left]:transition-transform [&_svg.lucide-arrow-left]:duration-200 hover:[&_svg.lucide-arrow-left]:-translate-x-0.5 " +
        "[&_svg.lucide-chevron-left]:transition-transform [&_svg.lucide-chevron-left]:duration-200 hover:[&_svg.lucide-chevron-left]:-translate-x-0.5",
      ghost:
        "bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:-translate-y-px " +
        "active:translate-y-0 active:scale-[0.98] " +
        "[&_svg.lucide-arrow-right]:transition-transform [&_svg.lucide-arrow-right]:duration-200 hover:[&_svg.lucide-arrow-right]:translate-x-0.5 " +
        "[&_svg.lucide-chevron-right]:transition-transform [&_svg.lucide-chevron-right]:duration-200 hover:[&_svg.lucide-chevron-right]:translate-x-0.5 " +
        "[&_svg.lucide-arrow-left]:transition-transform [&_svg.lucide-arrow-left]:duration-200 hover:[&_svg.lucide-arrow-left]:-translate-x-0.5 " +
        "[&_svg.lucide-chevron-left]:transition-transform [&_svg.lucide-chevron-left]:duration-200 hover:[&_svg.lucide-chevron-left]:-translate-x-0.5",
      danger:
        "bg-red-500/15 hover:bg-red-500/25 text-red-700 dark:text-red-300 border border-red-500/35 hover:border-red-500/50 " +
        "active:scale-[0.98]",
    };

    const sizeStyles = {
      sm: "text-xs px-3.5 py-1.5 h-8 rounded-full gap-1.5",
      md: "text-sm px-4.5 py-2 h-9 rounded-full gap-2",
      lg: "text-base px-6 py-2.5 h-11 rounded-full gap-2.5 font-semibold",
      icon: "p-0 h-9 w-9 rounded-full shrink-0 flex items-center justify-center [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110 active:[&_svg]:scale-95",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
