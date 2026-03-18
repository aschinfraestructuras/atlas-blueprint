/**
 * ncExportService — Exportação PDF de Não Conformidades
 *
 * - PDF individual: NC_<project>_<code>_<YYYYMMDD>.pdf
 * - PDF bulk:       NC_BULK_<project>_<YYYYMMDD_HHMM>.pdf
 * - Resumo por Work Item: NC_WORKITEM_<project>_<sector>_<YYYYMMDD>.pdf
 */

import { jsPDF } from "jspdf";
import type { NonConformity } from "./ncService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateStr(d?: string | null): string {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-PT");
}

function dateTimeStr(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-PT");
}

function todayStr(): string {
  return new Date().toLocaleDateString("pt-PT");
}

function fileDate(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function fileDateTime(): string {
  const s = new Date().toISOString().slice(0, 16);
  return s.slice(0, 10).replace(/-/g, "") + "_" + s.slice(11).replace(":", "");
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  primary:   "#1d4ed8",
  muted:     "#6b7280",
  border:    "#e5e7eb",
  bg:        "#f9fafb",
  white:     "#ffffff",
  text:      "#111827",
  textLight: "#6b7280",
  critical:  "#dc2626",
  major:     "#d97706",
  minor:     "#6b7280",
  headerBg:  "#1e3a5f",
  statusColors: {
    open:                 "#dc2626",
    in_progress:          "#2563eb",
    pending_verification: "#b45309",
    closed:               "#16a34a",
    archived:             "#9ca3af",
    draft:                "#9ca3af",
  } as Record<string, string>,
};

function sevColor(s: string): string {
  if (s === "critical" || s === "high")   return C.critical;
  if (s === "major"    || s === "medium") return C.major;
  return C.minor;
}

function stColor(s: string): string {
  return C.statusColors[s] ?? C.muted;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export interface NCExportLabels extends Record<string, string> {
  appName:        string;
  reportTitle:    string;
  bulkTitle:      string;
  wiSummaryTitle: string;
  generatedOn:    string;
  page:           string;
  of:             string;
  code:              string;
  title:             string;
  description:       string;
  severity:          string;
  category:          string;
  origin:            string;
  status:            string;
  responsible:       string;
  assignedTo:        string;
  detectedAt:        string;
  dueDate:           string;
  closureDate:       string;
  reference:         string;
  workItem:          string;
  capaTitle:          string;
  correction:         string;
  rootCause:          string;
  correctiveAction:   string;
  preventiveAction:   string;
  verificationMethod: string;
  verificationResult: string;
  verifiedBy:         string;
  verifiedAt:         string;
  wiSector:          string;
  wiBySeverity:      string;
  wiByStatus:        string;
  wiOpenNcs:         string;
  severity_minor:    string;
  severity_major:    string;
  severity_critical: string;
  status_draft:             string;
  status_open:              string;
  status_in_progress:       string;
  status_pending_verification: string;
  status_closed:            string;
  status_archived:          string;
  origin_manual:   string;
  origin_ppi:      string;
  origin_test:     string;
  origin_document: string;
  origin_audit:    string;
}

// ─── Page frame ───────────────────────────────────────────────────────────────

const W = 210, ML = 14, MR = 14, TW = W - ML - MR;

function drawPageFrame(
  doc: jsPDF,
  page: number,
  total: number,
  projectName: string,
  labels: NCExportLabels,
  logoBase64?: string | null,
) {
  doc.setFillColor(C.headerBg);
  doc.rect(0, 0, W, 18, "F");

  let logoEndX = ML;
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", ML, 2, 14, 14); logoEndX = ML + 16; } catch { /* ignore */ }
  }

  doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(C.white);
  doc.text(labels.appName, logoEndX, 8);

  doc.setFontSize(7).setFont("helvetica", "normal").setTextColor("#93c5fd");
  doc.text(projectName, logoEndX, 13.5);

  doc.setFontSize(7).setTextColor(C.white);
  doc.text(`${labels.page} ${page} ${labels.of} ${total}`, W - MR, 13.5, { align: "right" });

  doc.setFontSize(7).setTextColor(C.textLight);
  doc.text(`${labels.generatedOn}: ${todayStr()}`, ML, 293);
  doc.text(labels.appName, W - MR, 293, { align: "right" });
  doc.setDrawColor(C.border).setLineWidth(0.3);
  doc.line(ML, 289, W - MR, 289);
}

// ─── Render single NC content ─────────────────────────────────────────────────

function renderNCContent(doc: jsPDF, nc: NonConformity, labels: NCExportLabels, startY: number): number {
  const lineH = 5.5;
  const secGap = 4;
  let y = startY;

  function sectionHeader(title: string, cy: number): number {
    doc.setFillColor(C.bg);
    doc.rect(ML, cy, TW, 6.5, "F");
    doc.setFontSize(7.5).setFont("helvetica", "bold").setTextColor(C.primary);
    doc.text(title.toUpperCase(), ML + 2, cy + 4.5);
    return cy + 9;
  }

  function fieldLabel(txt: string, x: number, cy: number) {
    doc.setFontSize(6.5).setFont("helvetica", "bold").setTextColor(C.textLight);
    doc.text(txt.toUpperCase(), x, cy);
  }

  function fieldValue(txt: string | null | undefined, x: number, cy: number, maxW = TW / 2 - 4) {
    if (!txt) return;
    doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(C.text);
    const lines = doc.splitTextToSize(txt, maxW);
    doc.text(lines, x, cy + lineH - 0.5);
  }

  function gridRow(
    lbl1: string, val1: string | null | undefined,
    lbl2: string, val2: string | null | undefined,
    cy: number,
  ): number {
    const col2 = ML + TW / 2 + 2;
    fieldLabel(lbl1, ML, cy);
    fieldValue(val1 ?? "—", ML, cy, TW / 2 - 4);
    fieldLabel(lbl2, col2, cy);
    fieldValue(val2 ?? "—", col2, cy, TW / 2 - 4);
    return cy + lineH + 4;
  }

  // ── Header: code + badges ─────────────────────────────────────────────────

  y = sectionHeader("Identificação", y);

  fieldLabel(labels.code, ML, y);
  doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(C.primary);
  doc.text(nc.code ?? nc.reference ?? "—", ML, y + lineH + 0.5);

  // Severity badge
  const svC = sevColor(nc.severity);
  const svT = (labels as Record<string, string>)[`severity_${nc.severity}`] ?? nc.severity;
  doc.setFillColor(svC); doc.setDrawColor(svC); doc.setLineWidth(0.4);
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.roundedRect(ML + TW - 35, y - 1, 35, 8, 2, 2, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.roundedRect(ML + TW - 35, y - 1, 35, 8, 2, 2, "S");
  doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(svC);
  doc.text(svT, ML + TW - 17.5, y + 4, { align: "center" });

  // Status badge
  const stC = stColor(nc.status);
  const stT = (labels as Record<string, string>)[`status_${nc.status}`] ?? nc.status;
  doc.setFillColor(stC); doc.setDrawColor(stC);
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.roundedRect(ML + TW - 74, y - 1, 36, 8, 2, 2, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  doc.roundedRect(ML + TW - 74, y - 1, 36, 8, 2, 2, "S");
  doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(stC);
  doc.text(stT, ML + TW - 56, y + 4, { align: "center" });

  y += lineH + 6;

  // Title
  if (nc.title) {
    doc.setFontSize(10).setFont("helvetica", "bold").setTextColor(C.text);
    doc.text(nc.title, ML, y);
    y += lineH + 1;
  }

  // Description
  doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(C.textLight);
  const descLines = doc.splitTextToSize(nc.description, TW);
  doc.text(descLines, ML, y);
  y += descLines.length * 4.2 + secGap;

  // Grid fields
  y = gridRow(labels.severity, svT, labels.category, nc.category_outro ?? nc.category, y);
  y = gridRow(
    labels.origin, (labels as Record<string, string>)[`origin_${nc.origin}`] ?? nc.origin,
    labels.reference, nc.reference, y,
  );
  y = gridRow(labels.detectedAt, dateStr(nc.detected_at), labels.dueDate, dateStr(nc.due_date), y);
  y = gridRow(labels.responsible, nc.responsible, labels.assignedTo, nc.assigned_to, y);

  y += secGap;

  // ── CAPA ─────────────────────────────────────────────────────────────────

  if (nc.correction || nc.root_cause || nc.corrective_action || nc.preventive_action
    || nc.verification_method || nc.verification_result) {
    y = sectionHeader(labels.capaTitle, y);

    function capaRow(lbl: string, val: string | null | undefined, cy: number): number {
      if (!val) return cy;
      fieldLabel(lbl, ML, cy);
      const lines = doc.splitTextToSize(val, TW);
      doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(C.text);
      doc.text(lines, ML, cy + lineH - 0.5);
      return cy + lines.length * 4.5 + 4;
    }

    y = capaRow(labels.correction, nc.correction, y);
    y = capaRow(labels.rootCause, nc.root_cause, y);
    y = capaRow(labels.correctiveAction, nc.corrective_action, y);
    y = capaRow(labels.preventiveAction, nc.preventive_action, y);
    y = capaRow(labels.verificationMethod, nc.verification_method, y);
    y = capaRow(labels.verificationResult, nc.verification_result, y);

    if (nc.verified_by) {
      y = gridRow(labels.verifiedBy, nc.verified_by, labels.verifiedAt, dateTimeStr(nc.verified_at), y);
    }
    y += secGap;
  }

  // ── Closure ───────────────────────────────────────────────────────────────
  if (nc.closure_date) {
    fieldLabel(labels.closureDate, ML, y);
    doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(C.text);
    doc.text(dateStr(nc.closure_date), ML, y + lineH - 0.5);
    y += lineH + 5;
  }

  // Divider
  doc.setDrawColor(C.border).setLineWidth(0.3);
  doc.line(ML, y, ML + TW, y);
  y += 6;

  return y;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/** PDF individual */
export async function exportNCPdf(
  nc: NonConformity,
  labels: NCExportLabels,
  projectName: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawPageFrame(doc, 1, 1, projectName, labels);

  let y = 24;
  doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(C.text);
  doc.text(labels.reportTitle, ML, y);
  y += 8;

  renderNCContent(doc, nc, labels, y);

  const code    = sanitize(nc.code ?? nc.reference ?? nc.id.slice(0, 8));
  const project = sanitize(projectName);
  doc.save(`NC_${project}_${code}_${fileDate()}.pdf`);
}

/** PDF bulk */
export async function exportNCBulkPdf(
  ncs: NonConformity[],
  labels: NCExportLabels,
  projectName: string,
): Promise<void> {
  if (ncs.length === 0) return;

  const total = ncs.length;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  ncs.forEach((nc, idx) => {
    if (idx > 0) doc.addPage();
    drawPageFrame(doc, idx + 1, total, projectName, labels);
    let y = 24;
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(C.text);
    doc.text(`${labels.bulkTitle} (${idx + 1}/${total})`, ML, y);
    y += 8;
    renderNCContent(doc, nc, labels, y);
  });

  const project = sanitize(projectName);
  doc.save(`NC_BULK_${project}_${fileDateTime()}.pdf`);
}

/** Resumo por Work Item */
export async function exportNCWorkItemSummaryPdf(
  ncs: NonConformity[],
  labels: NCExportLabels,
  projectName: string,
  workItemSector: string,
): Promise<void> {
  if (ncs.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let totalPages = 1;
  drawPageFrame(doc, 1, totalPages, projectName, labels);

  let y = 24;

  doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(C.text);
  doc.text(labels.wiSummaryTitle, ML, y);
  y += 5;
  doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(C.textLight);
  doc.text(`${labels.wiSector}: ${workItemSector}  ·  ${labels.generatedOn}: ${todayStr()}`, ML, y);
  y += 10;

  // ── By severity ──────────────────────────────────────────────────────────
  doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(C.primary);
  doc.text(labels.wiBySeverity.toUpperCase(), ML, y);
  y += 5;

  const severities = [
    { key: "critical", label: labels.severity_critical },
    { key: "major",    label: labels.severity_major },
    { key: "minor",    label: labels.severity_minor },
  ];
  severities.forEach(({ key, label }) => {
    const cnt = ncs.filter(n => n.severity === key).length;
    const col = sevColor(key);
    doc.setDrawColor(col).setFillColor(col).setLineWidth(0.3);
    doc.setGState(doc.GState({ opacity: 0.12 }));
    doc.roundedRect(ML, y - 3.5, 55, 6.5, 1.5, 1.5, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
    doc.roundedRect(ML, y - 3.5, 55, 6.5, 1.5, 1.5, "S");
    doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(col);
    doc.text(`${label}: ${cnt}`, ML + 2, y + 0.8);
    y += 8.5;
  });

  y += 4;

  // ── By status ─────────────────────────────────────────────────────────────
  doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(C.primary);
  doc.text(labels.wiByStatus.toUpperCase(), ML, y);
  y += 5;

  const statuses: Array<{ key: string; label: string }> = [
    { key: "draft",                label: labels.status_draft },
    { key: "open",                 label: labels.status_open },
    { key: "in_progress",          label: labels.status_in_progress },
    { key: "pending_verification", label: labels.status_pending_verification },
    { key: "closed",               label: labels.status_closed },
    { key: "archived",             label: labels.status_archived },
  ];
  statuses.forEach(({ key, label }) => {
    const cnt = ncs.filter(n => n.status === key).length;
    if (cnt === 0) return;
    const col = stColor(key);
    doc.setDrawColor(col).setFillColor(col).setLineWidth(0.3);
    doc.setGState(doc.GState({ opacity: 0.12 }));
    doc.roundedRect(ML, y - 3.5, 65, 6.5, 1.5, 1.5, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
    doc.roundedRect(ML, y - 3.5, 65, 6.5, 1.5, 1.5, "S");
    doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(col);
    doc.text(`${label}: ${cnt}`, ML + 2, y + 0.8);
    y += 8.5;
  });

  y += 6;

  // ── Open NCs list ─────────────────────────────────────────────────────────
  const openNcs = ncs.filter(n => !["closed", "archived"].includes(n.status));
  if (openNcs.length > 0) {
    doc.setFontSize(8.5).setFont("helvetica", "bold").setTextColor(C.primary);
    doc.text(labels.wiOpenNcs.toUpperCase(), ML, y);
    y += 6;

    openNcs.forEach(nc => {
      if (y > 278) {
        doc.addPage();
        totalPages++;
        drawPageFrame(doc, totalPages, totalPages, projectName, labels);
        y = 26;
      }
      const overdue = nc.due_date && new Date(nc.due_date) < new Date() && nc.status !== "closed";
      const rowColor = overdue ? C.critical : C.text;

      doc.setFontSize(8).setFont("helvetica", "bold").setTextColor(rowColor);
      doc.text(nc.code ?? nc.reference ?? nc.id.slice(0, 8), ML, y);

      doc.setFont("helvetica", "normal").setTextColor(C.textLight);
      const titleText = (nc.title ?? nc.description).slice(0, 70);
      doc.text(titleText, ML + 24, y);

      if (nc.due_date) {
        doc.setFont("helvetica", overdue ? "bold" : "normal").setTextColor(rowColor);
        doc.text(dateStr(nc.due_date), W - MR, y, { align: "right" });
      }

      y += 5.5;
      doc.setDrawColor(C.border).setLineWidth(0.2);
      doc.line(ML, y - 1, W - MR, y - 1);
    });
  }

  const project = sanitize(projectName);
  const sector  = sanitize(workItemSector);
  doc.save(`NC_WORKITEM_${project}_${sector}_${fileDate()}.pdf`);
}
