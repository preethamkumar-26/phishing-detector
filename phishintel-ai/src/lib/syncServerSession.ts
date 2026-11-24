export async function syncServerSession(accessToken: string): Promise<void> {
  const response = await fetch("/api/account/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  if (response.ok) return;

  const body = await response.json().catch(() => null) as { error?: string } | null;
  throw new Error(body?.error || "Unable to establish the server account session.");
}
