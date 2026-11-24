/**
 * Shared client/server configuration for the short registration cooldown.
 *
 * This is deliberately not exposed through NEXT_PUBLIC_*: the route handler
 * remains the source of truth and only returns a remaining duration.
 */
export const APP_AUTH_COOLDOWN_SECONDS = 300;

export const AUTH_RATE_LIMIT_ACTIONS = ["registration"] as const;
export type AuthRateLimitAction = (typeof AUTH_RATE_LIMIT_ACTIONS)[number];
