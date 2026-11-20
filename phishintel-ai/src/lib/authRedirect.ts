/**
 * Utility functions for authentication redirects and URL validation.
 * Complies with PhishIntel Branded Landing Page & Auth Implementation Guide.
 */

/**
 * Validates and sanitizes internal redirect paths to prevent open redirects.
 * Only accepts paths starting with a single '/' and rejects protocols, backslashes, or '//'.
 */
export function safeNext(candidate: string | null | undefined, fallback = "/dashboard"): string {
  if (!candidate || typeof candidate !== "string") return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("://")) return fallback;
  return trimmed;
}

/**
 * Resolves the absolute site URL for OAuth redirects.
 */
export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
