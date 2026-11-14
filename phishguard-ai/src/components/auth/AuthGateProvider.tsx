"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AuthModalMode, sanitizeInternalDestination } from "@/lib/authGate";

export interface OpenAuthDialogOptions {
  mode?: AuthModalMode;
  destination?: string | null;
  reason?: string | null;
  triggerEl?: HTMLElement | null;
}

interface AuthGateContextValue {
  isOpen: boolean;
  mode: AuthModalMode;
  pendingDestination: string | null;
  requireAuth: (destination: string, options?: Omit<OpenAuthDialogOptions, "destination">) => void;
  openAuthDialog: (options?: OpenAuthDialogOptions) => void;
  openAuthGateForRedirect: (destination: string) => void;
  closeAuthDialog: () => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("signIn");
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState<string | null>(null);

  const triggerRef = useRef<HTMLElement | null>(null);
  const queuedRequestRef = useRef<OpenAuthDialogOptions | null>(null);
  const pendingDestinationRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);
  const hasCompletedAuthRef = useRef(false);

  const updatePendingDestination = useCallback((next: string | null) => {
    pendingDestinationRef.current = next;
    setPendingDestination(next);
  }, []);

  const navigateSafe = useCallback(
    (destination?: string | null) => {
      const safe = sanitizeInternalDestination(destination) ?? "/dashboard";
      router.push(safe);
    },
    [router]
  );

  const openAuthDialog = useCallback(
    (options?: OpenAuthDialogOptions) => {
      const nextMode = options?.mode ?? "signIn";
      const safeDestination = sanitizeInternalDestination(options?.destination);

      if (status === "authenticated") {
        navigateSafe(safeDestination ?? "/dashboard");
        return;
      }

      if (status === "loading") {
        queuedRequestRef.current = {
          mode: nextMode,
          destination: safeDestination,
          reason: options?.reason ?? null,
          triggerEl: options?.triggerEl ?? (document.activeElement as HTMLElement | null),
        };
        return;
      }

      if (!isOpen) {
        triggerRef.current =
          options?.triggerEl ??
          (typeof document !== "undefined" && document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
      }

      if (options && "destination" in options) {
        updatePendingDestination(safeDestination);
      }
      hasCompletedAuthRef.current = false;
      isOpenRef.current = true;
      setCustomReason(options?.reason ?? null);
      setMode(nextMode);
      setIsOpen(true);
    },
    [isOpen, navigateSafe, status, updatePendingDestination]
  );

  const requireAuth = useCallback(
    (destination: string, options?: Omit<OpenAuthDialogOptions, "destination">) => {
      const safeDestination = sanitizeInternalDestination(destination);
      if (status === "authenticated") {
        navigateSafe(safeDestination);
        return;
      }
      openAuthDialog({
        ...options,
        mode: options?.mode ?? "signIn",
        destination: safeDestination,
      });
    },
    [navigateSafe, openAuthDialog, status]
  );

  const openAuthGateForRedirect = useCallback(
    (destination: string) => {
      const safeDestination = sanitizeInternalDestination(destination);
      window.setTimeout(() => {
        triggerRef.current = null;
        hasCompletedAuthRef.current = false;
        isOpenRef.current = true;
        updatePendingDestination(safeDestination);
        setCustomReason(null);
        setMode("signIn");
        setIsOpen(true);
      }, 40);
    },
    [updatePendingDestination]
  );

  const closeAuthDialog = useCallback(() => {
    isOpenRef.current = false;
    hasCompletedAuthRef.current = false;
    setIsOpen(false);
    setCustomReason(null);
    updatePendingDestination(null);
  }, [updatePendingDestination]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        closeAuthDialog();
      } else {
        isOpenRef.current = true;
        setIsOpen(true);
      }
    },
    [closeAuthDialog]
  );

  const handleAuthSuccess = useCallback(() => {
    if (hasCompletedAuthRef.current || !isOpenRef.current) return;
    hasCompletedAuthRef.current = true;
    isOpenRef.current = false;

    const target = sanitizeInternalDestination(pendingDestinationRef.current) ?? "/dashboard";
    updatePendingDestination(null);
    setCustomReason(null);
    setIsOpen(false);
    router.push(target);
  }, [router, updatePendingDestination]);

  // Flush queued click or handle cross-tab auth resolution asynchronously without dialog flicker
  useEffect(() => {
    if (status === "loading") return;

    const queued = queuedRequestRef.current;
    if (queued) {
      queuedRequestRef.current = null;
      const timer = window.setTimeout(() => {
        if (status === "authenticated") {
          navigateSafe(queued.destination ?? "/dashboard");
        } else {
          openAuthDialog(queued);
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (isOpen && status === "authenticated" && !hasCompletedAuthRef.current) {
      const timer = window.setTimeout(() => {
        handleAuthSuccess();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [status, isOpen, handleAuthSuccess, navigateSafe, openAuthDialog]);

  const contextValue = useMemo<AuthGateContextValue>(
    () => ({
      isOpen,
      mode,
      pendingDestination,
      requireAuth,
      openAuthDialog,
      openAuthGateForRedirect,
      closeAuthDialog,
    }),
    [
      isOpen,
      mode,
      pendingDestination,
      requireAuth,
      openAuthDialog,
      openAuthGateForRedirect,
      closeAuthDialog,
    ]
  );

  return (
    <AuthGateContext.Provider value={contextValue}>
      {children}
      <AuthDialog
        open={isOpen}
        onOpenChange={handleDialogOpenChange}
        mode={mode}
        onModeChange={setMode}
        destination={pendingDestination}
        reason={customReason}
        onAuthSuccess={handleAuthSuccess}
        triggerRef={triggerRef}
      />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error("useAuthGate must be used within an AuthGateProvider.");
  }
  return context;
}

