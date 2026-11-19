export const MODEL_ENDPOINT_STORAGE_KEY = "phishintel_model_endpoint";
export const USE_MODEL_SERVICE_STORAGE_KEY = "phishintel_use_model_service";

const DEFAULT_ANALYZE_ENDPOINT =
  (process.env.NEXT_PUBLIC_FASTAPI_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000") +
  "/api/v1/analyze";

export interface RuntimeBackendConfig {
  base_url: string;
  analyze_endpoint: string;
  health_endpoint: string;
  updated_at?: string;
}

export function normalizeAnalyzeEndpoint(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_ANALYZE_ENDPOINT;
  return trimmed.endsWith("/api/v1/analyze") ? trimmed : `${trimmed}/api/v1/analyze`;
}

export async function getActiveAnalyzeEndpoint(): Promise<string> {
  const saved =
    typeof window !== "undefined" ? localStorage.getItem(MODEL_ENDPOINT_STORAGE_KEY) : null;
  if (saved) return normalizeAnalyzeEndpoint(saved);

  const detected = await autoDetectBackendEndpoint();
  return detected.endpoint;
}

export async function fetchWithBackendAutoRetry(
  analyzeEndpoint: string,
  init?: RequestInit
): Promise<Response> {
  const endpoint = normalizeAnalyzeEndpoint(analyzeEndpoint);

  try {
    return await fetch(endpoint, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;

    const detected = await autoDetectBackendEndpoint();
    const retryEndpoint = normalizeAnalyzeEndpoint(detected.endpoint);
    if (!detected.connected || retryEndpoint === endpoint) {
      throw new Error(
        `Unable to reach the PhishIntel backend at ${endpoint}. Automatic discovery did not find a different live endpoint${
          error instanceof Error ? ` (${error.message})` : ""
        }.`
      );
    }

    try {
      return await fetch(retryEndpoint, init);
    } catch (retryError) {
      if (retryError instanceof Error && retryError.name === "AbortError") throw retryError;
      throw new Error(
        `Unable to reach the PhishIntel backend at ${endpoint}; retry at the discovered endpoint ${retryEndpoint} also failed${
          retryError instanceof Error ? ` (${retryError.message})` : ""
        }.`
      );
    }
  }
}

export function deriveHealthEndpoint(analyzeEndpoint: string): string {
  return normalizeAnalyzeEndpoint(analyzeEndpoint).replace(/\/api\/v1\/analyze$/, "/health");
}

/**
 * Checks if a backend endpoint is live and reachable.
 */
export async function checkBackendConnection(
  analyzeEndpoint: string,
  timeoutMs = 3500
): Promise<{ ok: boolean; endpoint: string; error?: string }> {
  const normalized = normalizeAnalyzeEndpoint(analyzeEndpoint);
  const healthUrl = deriveHealthEndpoint(normalized);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(healthUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, endpoint: normalized, error: `HTTP ${res.status} from ${healthUrl}` };
    }
    return { ok: true, endpoint: normalized };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      endpoint: normalized,
      error: err instanceof Error ? err.message : "Backend unreachable",
    };
  }
}

/**
 * Automatically detects the live FastAPI endpoint:
 * 1. Reads /runtime-backend.json written by FastAPI on startup
 * 2. Falls back to saved localStorage value or NEXT_PUBLIC_FASTAPI_URL
 * 3. Verifies reachability and saves the working endpoint to localStorage
 */
export async function autoDetectBackendEndpoint(): Promise<{
  endpoint: string;
  connected: boolean;
  source: "runtime_file" | "saved" | "default";
}> {
  // 1. Try the file automatically written by FastAPI
  try {
    const res = await fetch(`/runtime-backend.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as Partial<RuntimeBackendConfig>;
      if (data.analyze_endpoint) {
        const candidate = normalizeAnalyzeEndpoint(data.analyze_endpoint);
        const probe = await checkBackendConnection(candidate);
        if (probe.ok) {
          if (typeof window !== "undefined") {
            localStorage.setItem(MODEL_ENDPOINT_STORAGE_KEY, candidate);
          }
          return { endpoint: candidate, connected: true, source: "runtime_file" };
        }
      }
    }
  } catch {
    // Ignore and fall back
  }

  // 2. Fallback to saved localStorage endpoint
  const saved =
    typeof window !== "undefined" ? localStorage.getItem(MODEL_ENDPOINT_STORAGE_KEY) : null;
  if (saved) {
    const candidate = normalizeAnalyzeEndpoint(saved);
    const probe = await checkBackendConnection(candidate);
    return { endpoint: candidate, connected: probe.ok, source: "saved" };
  }

  // 3. Fallback to env/default
  const fallback = normalizeAnalyzeEndpoint(DEFAULT_ANALYZE_ENDPOINT);
  const probe = await checkBackendConnection(fallback);
  if (probe.ok && typeof window !== "undefined") {
    localStorage.setItem(MODEL_ENDPOINT_STORAGE_KEY, fallback);
  }
  return { endpoint: fallback, connected: probe.ok, source: "default" };
}