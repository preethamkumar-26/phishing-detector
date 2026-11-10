import React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("w-full", className)} data-tabs-root>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          activeValue: value,
          onSelect: onValueChange,
        } as unknown as Record<string, unknown>);
      })}
    </div>
  );
}

export function TabsList({
  children,
  className,
  activeValue,
  onSelect,
}: {
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
  onSelect?: (val: string) => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-[#101729] rounded-xl border border-[#273449]",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          isActive: (child.props as { value: string }).value === activeValue,
          onSelect,
        } as unknown as Record<string, unknown>);
      })}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
  isActive,
  onSelect,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
  onSelect?: (val: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(value)}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 flex items-center gap-1.5",
        isActive
          ? "bg-[#8B5CF6] text-white shadow-sm"
          : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1B2740]/60",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
  activeValue,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  activeValue?: string;
}) {
  if (value !== activeValue) return null;
  return <div className={cn("mt-4 focus-visible:outline-none", className)}>{children}</div>;
}

