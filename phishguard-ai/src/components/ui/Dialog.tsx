"use client";

import React, { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogContextValue {
  titleId: string;
  descriptionId: string;
  requestClose: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  mobileSheet?: boolean;
  disableDismiss?: boolean;
  restoreFocusOnClose?: boolean;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const EXIT_DURATION_MS = 165;

export function Dialog({
  open,
  onOpenChange,
  children,
  className,
  mobileSheet = false,
  disableDismiss = false,
  restoreFocusOnClose = true,
  triggerRef,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);
  const hasAutoFocusedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  const disableDismissRef = useRef(disableDismiss);
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    disableDismissRef.current = disableDismiss;
  }, [disableDismiss]);

  // Sync mount cleanly for exit animation without blocking first open
  if (open && !rendered) {
    setRendered(true);
  }

  const requestClose = () => {
    if (disableDismissRef.current) return;
    onOpenChangeRef.current(false);
  };

  // Unmount cleanly after exit animation finishes
  useEffect(() => {
    if (open) return;
    if (!rendered) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const delay = reducedMotion ? 85 : EXIT_DURATION_MS;
    const timer = window.setTimeout(() => {
      setRendered(false);
      if (restoreFocusOnClose) {
        const target = triggerRef?.current ?? previousActiveRef.current;
        if (target && target.isConnected) {
          target.focus({ preventScroll: true });
        }
      }
      previousActiveRef.current = null;
    }, delay);

    return () => window.clearTimeout(timer);
  }, [open, rendered, restoreFocusOnClose, triggerRef]);

  // Body scroll lock, Escape dismissal, and initial focus placement when opening
  useEffect(() => {
    if (!open) {
      hasAutoFocusedRef.current = false;
      return;
    }

    if (!previousActiveRef.current && document.activeElement instanceof HTMLElement) {
      previousActiveRef.current = document.activeElement;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    let rafId: number | null = null;
    if (!hasAutoFocusedRef.current) {
      rafId = window.requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;

        // If focus is already inside this dialog, do not steal it
        if (document.activeElement && panel.contains(document.activeElement)) {
          hasAutoFocusedRef.current = true;
          return;
        }

        const autoTarget = panel.querySelector<HTMLElement>('[data-autofocus="true"]');
        if (autoTarget) {
          autoTarget.focus({ preventScroll: true });
          hasAutoFocusedRef.current = true;
          return;
        }
        const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (firstFocusable) {
          firstFocusable.focus({ preventScroll: true });
          hasAutoFocusedRef.current = true;
          return;
        }
        panel.focus({ preventScroll: true });
        hasAutoFocusedRef.current = true;
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disableDismissRef.current) {
        e.preventDefault();
        onOpenChangeRef.current(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.getClientRects().length > 0
    );

    if (focusables.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === panel || !panel.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !panel.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };

  const hasChildren = React.Children.toArray(children).length > 0;
  if (!rendered || (!open && !hasChildren)) return null;

  const state = open ? "open" : "closed";

  const dialogDom = (
    <DialogContext.Provider value={{ titleId, descriptionId, requestClose }}>
      <div
        className={cn(
          "fixed inset-0 z-50 flex justify-center",
          mobileSheet ? "items-end p-0 sm:items-center sm:p-4" : "items-center p-4"
        )}
      >
        <div
          data-state={state}
          className="pg-dialog-backdrop fixed inset-0 bg-[rgba(20,24,20,0.44)] backdrop-blur-sm"
          onClick={requestClose}
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          data-state={state}
          onKeyDown={handlePanelKeyDown}
          className={cn(
            "pg-dialog-panel relative z-10 w-full overflow-y-auto border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 shadow-[0_24px_60px_-12px_rgba(28,31,26,0.30)] outline-none",
            mobileSheet
              ? "max-h-[92dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-h-[calc(100vh-2rem)] sm:max-w-[440px] sm:rounded-2xl sm:pb-6"
              : "max-h-[calc(100vh-2rem)] max-w-lg rounded-2xl",
            !open && "pointer-events-none",
            className
          )}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialogDom, document.body);
}

export function DialogHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4", className)}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  const ctx = useContext(DialogContext);
  return (
    <h3
      id={ctx?.titleId}
      className={cn("text-lg font-semibold text-[var(--text-primary)] flex items-center justify-between gap-3", className)}
    >
      {children}
    </h3>
  );
}

export function DialogDescription({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = useContext(DialogContext);
  return (
    <p id={ctx?.descriptionId} className={cn("text-sm text-[var(--text-muted)]", className)}>
      {children}
    </p>
  );
}

export function DialogFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-6 flex items-center justify-end gap-2 pt-4", className)}>
      {children}
    </div>
  );
}

export function DialogClose({
  onClose,
  disabled = false,
  className,
}: {
  onClose?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const ctx = useContext(DialogContext);
  const handleClick = onClose ?? ctx?.requestClose;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-accent)] disabled:opacity-50 transition-colors",
        className
      )}
      aria-label="Close dialog"
    >
      <X className="w-4 h-4" />
    </button>
  );
}
