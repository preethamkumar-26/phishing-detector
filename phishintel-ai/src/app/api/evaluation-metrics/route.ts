import { NextResponse } from "next/server";
import { EvaluationMetricsResponse } from "@/types/evaluation";

const FASTAPI_BASE_URL =
  (process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/v1/evaluation-metrics`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const data: EvaluationMetricsResponse = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  const fallback: EvaluationMetricsResponse = {
    status: "unavailable",
    reason: "artifact_not_found",
    artifact: "evaluation_metrics.json",
  };
  return NextResponse.json(fallback);
}
