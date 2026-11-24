import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { EvaluationMetricsResponse } from "@/types/evaluation";

const FASTAPI_BASE_URL =
  (process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function GET() {
  // 1. Production FastAPI evaluation endpoint as primary source of truth
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

  // 2. Fallback to verified versioned evaluation artifact in public/ if backend is offline
  try {
    const artifactPath = path.join(process.cwd(), "public", "evaluation_metrics.json");
    if (fs.existsSync(artifactPath)) {
      const content = fs.readFileSync(artifactPath, "utf-8");
      const json: EvaluationMetricsResponse = JSON.parse(content);
      return NextResponse.json(json);
    }
  } catch {}

  const fallback: EvaluationMetricsResponse = {
    status: "unavailable",
    reason: "artifact_not_found",
    artifact: "evaluation_metrics.json",
  };
  return NextResponse.json(fallback);
}
