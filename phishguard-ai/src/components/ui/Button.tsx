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
      "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-[var(--primary-accent)] hover:bg-[var(--primary-hover)] text-[var(--text-on-accent)] shadow-sm shadow-black/10 border border-[var(--text-on-accent)]/20 hover:-translate-y-px hover:shadow-md",
      secondary:
        "bg-[var(--bg-surface)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-muted)]",
      outline:
        "bg-transparent hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-muted)]",
      ghost:
        "bg-transparent hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
      danger:
        "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
      md: "text-sm px-4 py-2 rounded-xl gap-2",
      lg: "text-base px-5 py-2.5 rounded-xl gap-2.5 font-semibold",
      icon: "p-2 rounded-xl h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
