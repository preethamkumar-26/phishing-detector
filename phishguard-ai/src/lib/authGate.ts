export type AuthModalMode = "signIn" | "register";

export const ALLOWED_INTERNAL_ROUTES = new Set<string>([
  "/dashboard",
  "/analyzer",
  "/explainability",
  "/analytics",
  "/evaluation",
  "/history",
  "/settings",
  "/account",
]);

export function sanitizeInternalDestination(destination?: string | null): string | null {
  if (typeof destination !== "string") return null;
  const trimmed = destination.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, "https://phishguard.local");
    if (parsed.origin !== "https://phishguard.local") return null;
    if (!ALLOWED_INTERNAL_ROUTES.has(parsed.pathname)) return null;

    if (parsed.pathname === "/analyzer") {
      const mode = parsed.searchParams.get("mode");
      if (mode === "upload" || mode === "paste") {
        return `/analyzer?mode=${mode}`;
      }
    }

    return parsed.pathname;
  } catch {
    return null;
  }
}

export function isAllowedInternalRoute(destination?: string | null): boolean {
  return sanitizeInternalDestination(destination) !== null;
}

export function getAuthGateCopy(
  destination: string | null,
  mode: AuthModalMode
): { heading: string; description: string } {
  const safeDest = sanitizeInternalDestination(destination);
  const heading = "Welcome to PhishGuard AI";

  if (!safeDest || safeDest === "/dashboard") {
    return {
      heading,
      description: "Sign in or create an account to continue to your secure workspace.",
    };
  }

  if (safeDest.startsWith("/analyzer")) {
    return {
      heading: mode === "register" ? "Create Account to Scan" : "Sign in to Analyze",
      description: "Authentication required to run email threat analysis and view explanation reports.",
    };
  }

  return {
    heading,
    description: "Please sign in to access your security workspace.",
  };
}
