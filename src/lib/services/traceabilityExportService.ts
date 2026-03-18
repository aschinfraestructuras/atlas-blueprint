/**
 * Traceability Matrix Export Service
 * CSV and PDF exports for the traceability matrix.
 */
import jsPDF from "jspdf";
import { fullPdfHeader, projectInfoStripHtml } from "./pdfProjectHeader";
import type { TraceabilityRow } from "./traceabilityService";

const BRAND = {
  primary: "#2F4F75",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F8FAFC",
  white: "#FFFFFF",
  text: "#111827",
  ok: "#059669",
  nok: "#DC2626",
};

export interface TraceabilityExportLabels {
  title: string;
  generatedOn: string;
  project: string;
  material: string;
  materialName: string;
  pame: string;
  supplier: string;
  lot: string;
  lotStatus: string;
  ce: string;
  test: string;
  testResult: string;
  ppi: string;
  workItem: string;
  total: string;
  fullyTraced: string;
}

export interface TraceabilityExportMeta {
  projectName: string;
  projectCode: string;
  locale: string;
}

/* ── CSV ──────────────────────────────────────────────────────── */

export function exportTraceabilityCsv(
  rows: TraceabilityRow[],
  labels: TraceabilityExportLabels,
  meta: TraceabilityExportMeta,
) {
  const headers = [
    labels.material, labels.materialName, labels.pame, labels.supplier,
    labels.lot, labels.lotStatus, labels.ce, labels.test, labels.testResult,
    labels.ppi, labels.workItem,
  ];

  const csvRows = rows.map(r => [
    r.material_code, r.material_name, r.pame_status ?? "",
    r.supplier_name ?? "", r.lot_code ?? "", r.lot_reception_status ?? "",
    r.lot_ce_marking === null ? "" : r.lot_ce_marking ? "Sim" : "Não",
    r.test_code ?? "", r.test_pass_fail ?? r.test_status ?? "",
    r.ppi_code ?? "", `${r.work_item_code ?? ""} ${r.work_item_name ?? ""}`.trim(),
  ]);

  const content = [headers, ...csvRows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rastreabilidade_${meta.projectCode}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── PDF ──────────────────────────────────────────────────────── */

export function exportTraceabilityPdf(
  rows: TraceabilityRow[],
  labels: TraceabilityExportLabels,
  meta: TraceabilityExportMeta,
  logoBase64: string | null,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const dateStr = new Date().toLocaleDateString(meta.locale === "es" ? "es-ES" : "pt-PT");

  // Header via HTML rendering approach — we'll use manual drawing
  let y = margin;

  // Logo / title block
  doc.setFillColor(25, 47, 72);
  doc.rect(margin, y, pageW - 2 * margin, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("ATLAS QMS", margin + 4, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(meta.projectName, margin + 4, y + 11);
  doc.setFontSize(8);
  doc.text(`${labels.title} — ${dateStr}`, pageW - margin - 4, y + 6, { align: "right" });
  doc.text(`${meta.projectCode}`, pageW - margin - 4, y + 11, { align: "right" });
  y += 18;

  // Summary line
  const fullyTraced = rows.filter(r => r.lot_id && r.test_result_id && r.work_item_id).length;
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.text(`${labels.total}: ${rows.length} | ${labels.fullyTraced}: ${fullyTraced}`, margin, y);
  y += 6;

  // Table headers
  const cols = [
    { label: labels.material, w: 22 },
    { label: labels.materialName, w: 38 },
    { label: labels.pame, w: 18 },
    { label: labels.supplier, w: 32 },
    { label: labels.lot, w: 24 },
    { label: labels.lotStatus, w: 18 },
    { label: labels.ce, w: 12 },
    { label: labels.test, w: 24 },
    { label: labels.testResult, w: 18 },
    { label: labels.ppi, w: 24 },
    { label: labels.workItem, w: 43 },
  ];

  const drawTableHeader = (yPos: number) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, yPos, pageW - 2 * margin, 7, "F");
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPos + 7, pageW - margin, yPos + 7);
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    let x = margin + 1;
    cols.forEach(col => {
      doc.text(col.label.toUpperCase(), x, yPos + 5);
      x += col.w;
    });
    return yPos + 8;
  };

  y = drawTableHeader(y);

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);

  rows.forEach((row, idx) => {
    if (y > pageH - 16) {
      doc.addPage();
      y = margin;
      y = drawTableHeader(y);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, pageW - 2 * margin, 6, "F");
    }

    doc.setTextColor(17, 24, 39);
    let x = margin + 1;
    const values = [
      row.material_code,
      (row.material_name ?? "").substring(0, 28),
      row.pame_status ?? "—",
      (row.supplier_name ?? "—").substring(0, 24),
      row.lot_code ?? "—",
      row.lot_reception_status ?? "—",
      row.lot_ce_marking === null ? "—" : row.lot_ce_marking ? "✓" : "✗",
      row.test_code ?? "—",
      row.test_pass_fail ?? row.test_status ?? "—",
      row.ppi_code ?? "—",
      `${row.work_item_code ?? ""} ${(row.work_item_name ?? "").substring(0, 25)}`.trim() || "—",
    ];

    values.forEach((val, i) => {
      // Color coding for status fields
      if (i === 2 && val === "approved") doc.setTextColor(5, 150, 105);
      else if (i === 8 && (val === "pass" || val === "approved")) doc.setTextColor(5, 150, 105);
      else if (i === 8 && (val === "fail" || val === "rejected")) doc.setTextColor(220, 38, 38);
      else doc.setTextColor(17, 24, 39);

      doc.text(String(val), x, y + 3);
      x += cols[i].w;
    });

    y += 6;
  });

  // Footer
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(6);
  doc.text(`Atlas QMS — ${labels.generatedOn}: ${dateStr}`, margin, pageH - 6);
  doc.text(`Pág. 1/${doc.getNumberOfPages()}`, pageW - margin, pageH - 6, { align: "right" });

  doc.save(`rastreabilidade_${meta.projectCode}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
