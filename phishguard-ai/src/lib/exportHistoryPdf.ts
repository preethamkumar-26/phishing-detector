import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ScanItem } from "@/context/PhishGuardContext";

export interface ExportPdfOptions {
  scans: ScanItem[];
  filterLabel?: string;
  query?: string;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const cleanPdfText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/₹/g, "Rs. ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x00-\x7F]/g, "");
};

const sanitizeSender = (from: string): string => {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  const raw = m ? `${m[1].trim() ? m[1].trim() + " " : ""}<${m[2].trim()}>` : from;
  return cleanPdfText(raw);
};

export function exportHistoryPdf({ scans, filterLabel }: ExportPdfOptions): void {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const usableWidth = pageWidth - margin * 2; // ~769.89 pt

  // Calculate high-level summary KPIs
  const totalCount = scans.length;
  const phishCount = scans.filter((s) => s.decision === "PHISHING").length;
  const safeCount = totalCount - phishCount;
  const meanP = totalCount ? scans.reduce((acc, s) => acc + s.P, 0) / totalCount : 0;

  // 1. Top Header Bar (PhishIntel Branding)
  doc.setFillColor(28, 31, 26); // #1C1F1A
  doc.rect(0, 0, pageWidth, 54, "F");

  // Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PhishIntel", margin, 29);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(239, 106, 30); // #EF6A1E
  doc.text("FORENSIC EMAIL THREAT AUDIT & SCAN HISTORY REPORT", margin + 82, 29);

  // Right Header Metadata
  doc.setFontSize(8);
  doc.setTextColor(214, 217, 200);
  doc.text("OFFICIAL · FORENSIC AUDIT LOG", pageWidth - margin, 24, { align: "right" });
  doc.text(
    `Exported: ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
    pageWidth - margin,
    37,
    { align: "right" }
  );

  // 2. Sub-strip Context & Scope
  doc.setFillColor(236, 238, 226); // #ECEEE2
  doc.rect(0, 54, pageWidth, 24, "F");
  doc.setTextColor(70, 75, 65);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");

  const scopeText = [
    `Architecture: PAHF-Net (Hierarchical Fusion & DANN)`,
    `Engine: v1.2-prod`,
    `Records: ${totalCount}`,
    filterLabel ? `Filter: ${filterLabel}` : `Scope: Full scan audit log`,
  ].join("  ·  ");

  doc.text(scopeText, margin, 70);

  // 3. Four KPI Metric Boxes
  const kpiTop = 90;
  const kpiHeight = 44;
  const kpiWidth = (usableWidth - 30) / 4;

  const kpis = [
    { label: "TOTAL AUDITED SCANS", val: String(totalCount), color: [28, 31, 26] },
    { label: "PHISHING INCURSIONS", val: String(phishCount), color: [216, 69, 43] },
    { label: "VERIFIED SAFE EMAILS", val: String(safeCount), color: [30, 154, 105] },
    { label: "MEAN P(PHISH) SCORE", val: meanP.toFixed(3), color: [28, 31, 26] },
  ];

  kpis.forEach((k, i) => {
    const x = margin + i * (kpiWidth + 10);
    doc.setFillColor(248, 249, 245);
    doc.setDrawColor(220, 222, 210);
    doc.roundedRect(x, kpiTop, kpiWidth, kpiHeight, 4, 4, "FD");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(115, 120, 105);
    doc.text(k.label, x + 10, kpiTop + 14);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.val, x + 10, kpiTop + 34);
  });

  // 4. Prepare Table Data
  const tableRows = scans.map((s) => {
    const topContribs = s.rows
      .filter((r) => r.contrib > 0)
      .sort((a, b) => b.contrib - a.contrib)
      .slice(0, 2)
      .map((r) => `${r.id} (+${r.contrib.toFixed(2)})`)
      .join(", ") || "Baseline / Safe";

    return [
      s.id,
      formatDate(s.ts),
      sanitizeSender(s.email.from),
      cleanPdfText(s.email.subject),
      s.decision,
      s.P.toFixed(3),
      s.T.toFixed(2),
      s.src === "sample" ? `sample · ${topContribs}` : `user · ${topContribs}`,
    ];
  });

  // 5. Generate Audit Table
  const totalPagesExp = "{total_pages_count_string}";

  autoTable(doc, {
    startY: 148,
    margin: { left: margin, right: margin, bottom: 40 },
    head: [["Scan ID", "Timestamp", "Sender", "Subject", "Verdict", "P(phish)", "Threshold", "Signals / Source"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [28, 31, 26], // #1C1F1A
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      cellPadding: 6,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 35, 30],
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 245],
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: "bold" },
      1: { cellWidth: 85 },
      2: { cellWidth: 150 },
      3: { cellWidth: 195 },
      4: { cellWidth: 65, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 48, halign: "right" },
      6: { cellWidth: 42, halign: "right" },
      7: { cellWidth: 125 },
    },
    didParseCell: (data) => {
      // Color-code verdicts
      if (data.section === "body" && data.column.index === 4) {
        if (data.cell.raw === "PHISHING") {
          data.cell.styles.textColor = [216, 69, 43];
          data.cell.styles.fillColor = [254, 237, 235];
        } else if (data.cell.raw === "SAFE") {
          data.cell.styles.textColor = [30, 154, 105];
          data.cell.styles.fillColor = [236, 248, 243];
        }
      }
    },
    didDrawPage: (data) => {
      // Footer on every page
      doc.setFontSize(8);
      doc.setTextColor(140, 145, 135);
      doc.setFont("helvetica", "normal");
      doc.setDrawColor(220, 222, 210);
      doc.line(margin, pageHeight - 26, pageWidth - margin, pageHeight - 26);
      doc.text("PhishIntel Security Platform · PAHF-Net Availability-Gated Threat Architecture", margin, pageHeight - 14);

      const pageStr = `Page ${data.pageNumber} of ${totalPagesExp}`;
      doc.text(pageStr, pageWidth - margin, pageHeight - 14, { align: "right" });
    },
  });

  // Calculate total pages for footer placeholder
  if (typeof doc.putTotalPages === "function") {
    doc.putTotalPages(totalPagesExp);
  }

  // Trigger user file download
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `phishintel-scan-history-${dateStr}.pdf`;
  doc.save(fileName);
}
