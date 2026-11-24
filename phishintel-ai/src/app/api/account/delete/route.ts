import { NextResponse } from "next/server";
import { authenticateRequest, deleteUserAccount } from "@/lib/server/auth";

export async function POST(req: Request) {
  try {
    const user = await authenticateRequest(req);
    const deleted = deleteUserAccount(user.id);
    return NextResponse.json({
      success: deleted,
      message: "Account and associated workstation records have been permanently purged.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
