export type MailSourceType = "Outlook" | "Gmail" | "Yahoo" | "MAPI" | "Other";

type HeaderInput = string | Record<string, string> | null | undefined;

function normalizeHeaders(headers: HeaderInput) {
  if (typeof headers === "string") return headers.toLowerCase();
  if (!headers || typeof headers !== "object") return "";

  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("\n")
    .toLowerCase();
}

/**
 * Classifies the service which handled the message, not the organisation that
 * sent it. Raw .eml uploads retain their header block, while older scans may
 * have headers stored as an object, so both forms are supported here.
 */
export function classifyMailSource({
  headers,
  from = "",
  origin,
}: {
  headers: HeaderInput;
  from?: string;
  origin?: string;
}): MailSourceType {
  const headerText = normalizeHeaders(headers);
  const sender = from.toLowerCase();
  const uploadOrigin = origin?.toLowerCase();

  if (/\bx-mailer:\s*[^\n]*\bmapi\b/.test(headerText) || /\bmapi\b/.test(headerText) || uploadOrigin === "mapi") {
    return "MAPI";
  }

  if (
    /\bx-(?:ms-exchange|microsoft-antispam|forefront-antispam-report)\b/.test(headerText) ||
    /\b(?:outlook|hotmail|live)\.com\b|\b(?:office365|protection\.outlook)\.com\b/.test(headerText) ||
    /\bx-mailer:\s*[^\n]*\boutlook\b/.test(headerText) ||
    /@(outlook|hotmail|live)\.com\b/.test(sender)
  ) {
    return "Outlook";
  }

  if (
    /\bx-(?:gm-message-state|google-smtp-source|received):/.test(headerText) ||
    /\b(?:gmail|googlemail|google)\.com\b/.test(headerText) ||
    /@gmail\.com\b/.test(sender)
  ) {
    return "Gmail";
  }

  if (
    /\bx-(?:ymail|yahoo)\b/.test(headerText) ||
    /\byahoo(?:inc)?\.com\b/.test(headerText) ||
    /@yahoo\.com\b/.test(sender)
  ) {
    return "Yahoo";
  }

  return "Other";
}
