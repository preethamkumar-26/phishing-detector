export type AuthModalMode = "signIn" | "register";

export const ALLOWED_INTERNAL_ROUTES = new Set<string>([
  "/dashboard",
  "/analyzer",
  "/explainability",
  "/analytics",
  "/history",
  "/settings",
  "/account",
  "/research/architecture",
  "/research/datasets",
  "/research/sources",
  "/research/papers",
]);

/**
 * Validates that a pending destination is an allowlisted internal application
 * route. Rejects external URLs, protocol-relative URLs, or unknown paths.
 */
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
      heading,
      description:
        mode === "register"
          ? "Create an account to analyze an email."
          : "Log in to analyze an email.",
    };
  }

  if (safeDest === "/history") {
    return {
      heading,
      description:
        mode === "register"
          ? "Create an account to access your scan history."
          : "Log in to access your scan history.",
    };
  }

  if (safeDest === "/analytics") {
    return {
      heading,
      description:
        mode === "register"
          ? "Create an account to explore research analytics."
          : "Log in to view model analytics and evaluation metrics.",
    };
  }

  if (safeDest === "/explainability") {
    return {
      heading,
      description:
        mode === "register"
          ? "Create an account to inspect explainability insights."
          : "Log in to inspect token explainability and attention weights.",
    };
  }

  if (safeDest.startsWith("/research")) {
    return {
      heading,
      description:
        mode === "register"
          ? "Create an account to access the research workspace."
          : "Log in to access the research workspace.",
    };
  }

  return {
    heading,
    description:
      mode === "register"
        ? "Create an account to manage your PhishGuard AI workspace."
        : "Log in to manage your PhishGuard AI workspace.",
  };
}

