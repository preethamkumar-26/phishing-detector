import { supabase } from "@/lib/supabaseClient";
import type { ScanItem } from "@/context/PhishGuardContext";

/**
 * Checks if Supabase client is configured with real credentials.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes("your-project-id") && !key.includes("your-anon"));
}

/**
 * Save an email analysis scan to Supabase public.scans table.
 */
export async function saveScanToSupabase(
  scan: ScanItem,
  _userIdOverride?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase credentials not configured." };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required to persist scan." };
    }
    const verifiedUserId = session.user.id;

    const row = {
      id: scan.id,
      user_id: verifiedUserId,
      created_at: new Date(scan.ts).toISOString(),
      subject: scan.email.subject || "Untitled Email",
      from_email: scan.email.from || "",
      reply_to: scan.email.replyTo || "",
      body: scan.email.body || "",
      headers: scan.email.headers || "",
      urls: scan.urls || [],
      decision: scan.decision,
      risk: scan.risk,
      risk_score: scan.riskScore,
      p_value: scan.P,
      threshold: scan.T,
      model_version: scan.modelVersion || "PAHF-Net",
      indicators: scan.indicators || [],
      modalities: scan.modalities || {},
      gate_weights: scan.gateWeights || {},
      raw_payload: scan,
    };

    const { error } = await supabase.from("scans").upsert(row, { onConflict: "id" });

    if (error) {
      if (error.code === "PGRST205") {
        console.warn(
          "[Supabase] 'scans' table not found in Supabase. Please run the provided SQL migration in Supabase SQL Editor."
        );
      } else {
        console.warn("[Supabase] Failed to save scan to Supabase:", error.message);
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    console.warn("[Supabase] Exception while saving scan:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetch scans from Supabase public.scans table scoped strictly to the authenticated user.
 */
export async function fetchScansFromSupabase(_userIdOverride?: string): Promise<ScanItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return [];
    }

    const verifiedUserId = session.user.id;

    const { data, error } = await supabase
      .from("scans")
      .select("*")
      .eq("user_id", verifiedUserId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      if (error.code !== "PGRST205") {
        console.warn("[Supabase] Failed to fetch scans:", error.message);
      }
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row: any): ScanItem => {
      if (row.raw_payload && typeof row.raw_payload === "object") {
        return row.raw_payload as ScanItem;
      }

      const pVal = typeof row.p_value === "number" ? row.p_value : 0;
      const defaultModalities = row.modalities || {};
      const defaultGateWeights = row.gate_weights || { text: 0.4, url: 0.3, structure: 0.15, linguistic: 0.15 };
      const defaultAvail = {
        text: true,
        url: Array.isArray(row.urls) && row.urls.length > 0,
        structure: true,
        linguistic: true,
      };

      return {
        id: row.id,
        ts: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        src: "user",
        T: typeof row.threshold === "number" ? row.threshold : 0.5,
        P: pVal,
        localP: pVal,
        engine: "service",
        modelVersion: row.model_version || "PAHF-Net",
        decision: row.decision === "PHISHING" ? "PHISHING" : "SAFE",
        risk: row.risk === "High" ? "High" : "Low",
        riskScore: typeof row.risk_score === "number" ? row.risk_score : Math.round(pVal * 100),
        indicators: Array.isArray(row.indicators) ? row.indicators : [],
        email: {
          subject: row.subject || "",
          from: row.from_email || "",
          replyTo: row.reply_to || "",
          body: row.body || "",
          headers: row.headers || "",
        },
        fromReg: "",
        fromDom: "",
        urls: Array.isArray(row.urls) ? row.urls : [],
        modalities: defaultModalities,
        gateWeights: defaultGateWeights,
        availabilityMask: defaultAvail,
        modalityContributions: { text: 0, url: 0, structure: 0, linguistic: 0 },
        fusedScore: pVal,
        entities: {
          sector: "Other",
          amounts: [],
          tx: "",
          cards: [],
          accts: [],
          orgs: [],
        },
      };
    });
  } catch (err) {
    console.warn("[Supabase] Exception while fetching scans:", err);
    return [];
  }
}

/**
 * Delete a scan from Supabase public.scans table.
 */
export async function deleteScanFromSupabase(scanId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false };

  try {
    const { error } = await supabase.from("scans").delete().eq("id", scanId);
    if (error) {
      console.warn("[Supabase] Failed to delete scan:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error" };
  }
}

/**
 * Clear user scans from Supabase public.scans table.
 */
export async function clearScansFromSupabase(userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false };

  try {
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        finalUserId = session.user.id;
      }
    }

    let query = supabase.from("scans").delete();
    if (finalUserId) {
      query = query.eq("user_id", finalUserId);
    } else {
      query = query.neq("id", "");
    }
    const { error } = await query;
    if (error) {
      console.warn("[Supabase] Failed to clear scans:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error" };
  }
}
