import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-2xl shadow-black/60">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4 border-b border-[var(--border-color)]", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-[var(--text-primary)] flex items-center justify-between", className)}>
      {children}
    </h3>
  );
}

export function DialogDescription({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-[var(--text-muted)]", className)}>
      {children}
    </p>
  );
}

export function DialogFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-6 flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]", className)}>
      {children}
    </div>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors"
      aria-label="Close"
    >
      <X className="w-5 h-5" />
    </button>
  );
}
