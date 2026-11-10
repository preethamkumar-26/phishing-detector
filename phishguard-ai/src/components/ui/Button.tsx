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
      "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

    const variantStyles = {
      primary:
        "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-sm shadow-violet-900/30 border border-violet-400/20",
      secondary:
        "bg-[#1B2740] hover:bg-[#233354] text-[#F3F4F6] border border-[#273449] hover:border-slate-600",
      outline:
        "bg-transparent hover:bg-slate-800/60 text-[#F3F4F6] border border-[#273449] hover:border-slate-500",
      ghost:
        "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white",
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

