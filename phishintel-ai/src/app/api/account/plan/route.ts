import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/auth";

export async function GET(req: Request) {
  try {
    await authenticateRequest(req);

    return NextResponse.json({
      plan: {
        name: "Open Research Prototype",
        status: "active_unmetered",
        billingConnected: false,
        billingMessage: "No paid subscription or commercial payment provider is configured. This prototype provides open research access for academic threat evaluation.",
        renewalDate: null,
        priceMonthly: 0,
        features: [
          "Direct access to PAHF-Net Availability-Gated Hierarchical Fusion & DANN model",
          "Multi-modal feature attribution & explainability heatmap",
          "Forensic audit logging and scan history",
          "Local workstation database persistence",
        ],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
