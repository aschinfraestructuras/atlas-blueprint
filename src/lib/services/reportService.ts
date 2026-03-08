/**
 * Unified Report Service — Atlas QMS
 *
 * Single entry point for all PDF and CSV exports across entity types.
 * Delegates to specialised export services with consistent branding.
 *
 * Supported entities: work_items, ppi_instances, test_results, non_conformities, documents
 */

// ─── Atlas brand colours ──────────────────────────────────────────────────────

const BRAND = {
  primary:   "#2F4F75",
  muted:     "#6B7280",
  border:    "#E5E7EB",
  bg:        "#F9FAFB",
  white:     "#FFFFFF",
  text:      "#111827",
  textLight: "#6B7280",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType =
  | "work_items"
  | "ppi_instances"
  | "test_results"
  | "non_conformities"
  | "documents";

export interface ReportMeta {
  projectName: string;
  projectCode: string;
  locale: string;
  generatedBy?: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale === "pt" ? "pt-PT" : "es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch { return iso.slice(0, 10); }
}

function fileDate(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

// ─── CSV engine ───────────────────────────────────────────────────────────────

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(csv: string, filename: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Generic CSV export.
 * @param headers - Column header labels (already translated)
 * @param rows    - Array of row arrays (same order as headers)
 * @param filename - Download filename
 */
export function exportToCSV(
  headers: string[],
  rows: unknown[][],
  filename: string,
): void {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  downloadCsv(lines.join("\r\n"), filename);
}

// ─── PDF engine (styled print window) ─────────────────────────────────────────

function sharedCss(): string {
  return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  font-size: 12px;
  color: ${BRAND.text};
  background: ${BRAND.white};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@page { size: A4 portrait; margin: 14mm 12mm 12mm 12mm; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; break-before: page; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
}

.atlas-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 10px; border-bottom: 3px solid ${BRAND.primary}; margin-bottom: 16px;
}
.atlas-brand { display: flex; align-items: center; gap: 10px; }
.atlas-brand-bar { width: 6px; height: 44px; background: ${BRAND.primary}; border-radius: 3px; }
.atlas-brand-logo {
  width: 44px; height: 44px; border-radius: 8px;
  background: ${BRAND.primary}; color: ${BRAND.white};
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 900; letter-spacing: -0.5px;
}
.atlas-brand-app { font-size: 19px; font-weight: 800; color: ${BRAND.primary}; letter-spacing: -.5px; line-height: 1; }
.atlas-brand-sub { font-size: 8.5px; font-weight: 600; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: .12em; margin-top: 2px; }
.atlas-meta { text-align: right; }
.atlas-meta-title { font-size: 13px; font-weight: 700; color: ${BRAND.primary}; }
.atlas-meta-gen { font-size: 8.5px; color: ${BRAND.textLight}; margin-top: 3px; }
.atlas-meta-user { font-size: 8px; color: ${BRAND.muted}; margin-top: 1px; }

.atlas-info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px 28px;
  background: ${BRAND.bg}; border: 1px solid ${BRAND.border};
  border-radius: 8px; padding: 12px 16px; margin-bottom: 14px;
}
.atlas-info-row { display: flex; flex-direction: column; padding: 3px 0; }
.atlas-info-lbl {
  font-size: 7.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .13em; color: ${BRAND.muted}; margin-bottom: 2px;
}
.atlas-info-val { font-size: 11px; color: ${BRAND.text}; font-weight: 500; }

.atlas-section {
  font-size: 8px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .15em; color: ${BRAND.muted};
  margin: 14px 0 6px; border-bottom: 1px solid ${BRAND.border}; padding-bottom: 3px;
}

table.atlas-table { width: 100%; border-collapse: collapse; font-size: 11px; }
table.atlas-table thead tr { background: ${BRAND.primary}; }
table.atlas-table thead th {
  color: #fff; padding: 6px 8px; text-align: left;
  font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: .07em;
}
table.atlas-table tbody tr { border-bottom: 1px solid ${BRAND.border}; }
table.atlas-table tbody tr:nth-child(even) { background: ${BRAND.bg}; }
table.atlas-table tbody td { padding: 6px 8px; vertical-align: top; line-height: 1.4; }

.atlas-badge {
  display: inline-block; border-radius: 4px; padding: 2px 8px;
  font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
}

.atlas-footer {
  margin-top: 20px; padding-top: 8px; border-top: 1px solid ${BRAND.border};
  display: flex; justify-content: space-between;
  font-size: 8px; color: ${BRAND.textLight};
}

.atlas-page-num {
  position: fixed; bottom: 8mm; right: 12mm;
  font-size: 8px; color: ${BRAND.muted};
}
`;
}

export interface ReportLabels {
  appName: string;
  reportTitle: string;
  generatedOn: string;
  page?: string;
  of?: string;
}

/**
 * Build corporate header HTML with Atlas branding.
 */
export function headerHtml(
  title: string,
  labels: ReportLabels,
  meta: ReportMeta & { logoUrl?: string | null },
): string {
  const logoBlock = meta.logoUrl
    ? `<img src="${meta.logoUrl}" style="height:40px;width:40px;object-fit:contain;border-radius:6px;" crossorigin="anonymous" />`
    : `<div class="atlas-brand-logo">A</div>`;
  return `
<div class="atlas-header">
  <div class="atlas-brand">
    ${logoBlock}
    <div>
      <div class="atlas-brand-app">${labels.appName}</div>
      <div class="atlas-brand-sub">${meta.locale === "es" ? "Sistema de Gestión de Calidad" : "Sistema de Gestão da Qualidade"}</div>
    </div>
  </div>
  <div class="atlas-meta">
    <div class="atlas-meta-title">${title}</div>
    <div class="atlas-meta-gen">${labels.generatedOn}: ${fmtDate(new Date().toISOString(), meta.locale)}</div>
    <div class="atlas-meta-gen">${meta.projectName} · ${meta.projectCode}</div>
    ${meta.generatedBy ? `<div class="atlas-meta-user">${meta.generatedBy}</div>` : ""}
  </div>
</div>`;
}

/**
 * Build footer HTML.
 */
export function footerHtml(ref: string, labels: ReportLabels, locale?: string): string {
  const sysLabel = locale === "es" ? "Sistema de Gestión de Calidad" : "Sistema de Gestão da Qualidade";
  return `
<div class="atlas-footer">
  <span>${labels.appName} · ${sysLabel}</span>
  <span>${ref}</span>
</div>`;
}

/**
 * Build info grid HTML from label-value pairs.
 */
export function infoGridHtml(rows: [string, string][]): string {
  return `<div class="atlas-info-grid">${rows.map(([lbl, val]) =>
    `<div class="atlas-info-row">
       <span class="atlas-info-lbl">${lbl}</span>
       <span class="atlas-info-val">${val || "—"}</span>
     </div>`
  ).join("")}</div>`;
}

/**
 * Open a styled print window. Falls back to downloading HTML if popup blocked.
 */
export function printHtml(html: string, filename: string): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename.replace(".pdf", ".html");
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => { setTimeout(() => { win.focus(); win.print(); }, 400); };
  setTimeout(() => {
    if (!win.document.readyState || win.document.readyState === "complete") {
      win.focus(); win.print();
    }
  }, 800);
}

/**
 * Generate a full PDF HTML document with Atlas corporate branding.
 * Use this to wrap any entity content.
 */
export function generatePdfDocument(opts: {
  title: string;
  labels: ReportLabels;
  meta: ReportMeta;
  bodyHtml: string;
  footerRef: string;
}): string {
  return `<!DOCTYPE html>
<html lang="${opts.meta.locale}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<title>${opts.title} — Atlas QMS</title>
<style>${sharedCss()}</style>
</head>
<body>
${headerHtml(opts.labels.reportTitle, opts.labels, opts.meta)}
${opts.bodyHtml}
${footerHtml(opts.footerRef, opts.labels, opts.meta.locale)}
</body>
</html>`;
}

/**
 * Generate a list/table PDF with Atlas branding.
 */
export function generateListPdf(opts: {
  reportTitle: string;
  labels: ReportLabels;
  meta: ReportMeta;
  columns: string[];
  rows: string[][];
  footerRef: string;
  filename: string;
}): void {
  const tableRows = opts.rows.map((r) =>
    `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`
  ).join("");

  const bodyHtml = `
<table class="atlas-table">
  <thead><tr>${opts.columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<div style="margin-top:8px;font-size:9px;color:${BRAND.muted};">${opts.rows.length} registo(s)</div>`;

  const html = generatePdfDocument({
    title: opts.reportTitle,
    labels: opts.labels,
    meta: opts.meta,
    bodyHtml,
    footerRef: opts.footerRef,
  });

  printHtml(html, opts.filename);
}

/**
 * Build a standardized filename.
 * Format: {PREFIX}_{project}_{ref}_{YYYYMMDD}.{ext}
 */
export function buildReportFilename(
  prefix: string,
  projectCode: string,
  ref: string,
  ext: "pdf" | "csv" = "pdf",
): string {
  return `${prefix}_${sanitize(projectCode)}_${sanitize(ref)}_${fileDate()}.${ext}`;
}

// Re-export helpers for use in components
export { sanitize, fmtDate, fileDate, sharedCss };
