import React from "react";
import { cn } from "@/lib/utils";

export type RadiantVariant = "standard" | "subtle" | "static" | "none" | boolean;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  radiant?: RadiantVariant;
  phase?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Card({
  className,
  children,
  radiant = "standard",
  phase,
  ...props
}: CardProps) {
  const isRadiant = radiant !== "none" && radiant !== false;
  const radiantVariantClass =
    radiant === "subtle"
      ? "pg-radiant-surface pg-radiant-subtle"
      : radiant === "static"
      ? "pg-radiant-surface pg-radiant-static"
      : isRadiant
      ? "pg-radiant-surface"
      : "";

  const phaseClass = phase ? `pg-radiant-phase-${phase}` : "";

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-150",
        radiantVariantClass,
        phaseClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-6 border-b border-[var(--border-color)]/70 flex flex-col space-y-2 rounded-t-xl", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-[var(--text-primary)] tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-relaxed text-[var(--text-muted)]", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-4 border-t border-[var(--border-color)]/70 bg-[var(--bg-elevated)]/40 flex items-center rounded-b-xl", className)}
      {...props}
    >
      {children}
    </div>
  );
}

