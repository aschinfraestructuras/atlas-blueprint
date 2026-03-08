/**
 * PPI Export Service
 * Provides PDF (via styled print window), ZIP (JSZip) and CSV exports
 * for PPI instances. Uses Atlas branding and respects the active i18n locale.
 */

import type { PpiInstance, PpiInstanceItem } from "./ppiService";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface PpiInstanceForExport extends PpiInstance {
  template_disciplina?: string | null;
  template_code?: string | null;
  work_item_sector?: string | null;
  work_item_disciplina?: string | null;
  items: PpiInstanceItem[];
  attachmentCount?: number;
}

export interface ExportLabels {
  // header
  appName: string;
  reportTitle: string;
  generatedOn: string;
  // instance fields
  project: string;
  code: string;
  workItem: string;
  template: string;
  status: string;
  openedAt: string;
  closedAt: string;
  inspector: string;
  discipline: string;
  inspectionDate: string;
  // checklist
  checklistTitle: string;
  itemNo: string;
  checkCode: string;
  label: string;
  result: string;
  notes: string;
  checkedBy: string;
  checkedAt: string;
  requiresNc: string;
  linkedNc: string;
  attachmentCount: string;
  // results
  resultLabels: Record<string, string>;
  statusLabels: Record<string, string>;
  // progress
  progress: string;
  reviewed: string;
  ok: string;
  nok: string;
  na: string;
  pending: string;
  // bulk
  bulkReportTitle: string;
  page: string;
  of: string;
  // csv
  projectName: string;
}

// ─── Atlas brand colours (matches design tokens) ──────────────────────────────

const BRAND = {
  primary:    "#2F4F75",
  primaryLight: "#4672A4",
  accent:     "#3A5E87",
  ok:         "#059669",
  nok:        "#DC2626",
  na:         "#6B7280",
  pending:    "#D97706",
  muted:      "#6B7280",
  border:     "#E5E7EB",
  bg:         "#F9FAFB",
  white:      "#FFFFFF",
  text:       "#111827",
  textLight:  "#6B7280",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale === "pt" ? "pt-PT" : "es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Sanitize a string for use in filenames: replace spaces/special chars with underscores,
 * remove anything that isn't alphanumeric, underscore, hyphen, or dot.
 */
function sanitize(s: string): string {
  return s
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

/**
 * Build the canonical filename: PPI_{project}_{workItem}_{code}_{inspectionDate}_{status}.pdf
 */
function buildFilename(
  inst: PpiInstanceForExport,
  projectName: string,
): string {
  const proj   = sanitize(projectName);
  const wi     = sanitize(inst.work_item_sector ?? inst.work_item_id.slice(0, 8));
  const code   = sanitize(inst.code);
  const date   = (inst.inspection_date ?? inst.opened_at ?? "").slice(0, 10).replace(/-/g, "");
  const status = sanitize(inst.status);
  return `PPI_${proj}_${wi}_${code}_${date}_${status}.pdf`;
}

function resultColor(result: string): string {
  switch (result) {
    case "ok":   case "pass": return BRAND.ok;
    case "nok":  case "fail": return BRAND.nok;
    case "na":               return BRAND.na;
    default:                 return BRAND.pending;
  }
}

function resultBg(result: string): string {
  switch (result) {
    case "ok":   case "pass": return "#ECFDF5";
    case "nok":  case "fail": return "#FEF2F2";
    case "na":               return "#F3F4F6";
    default:                 return "#FFFBEB";
  }
}

// ─── Single PDF HTML builder ──────────────────────────────────────────────────

function buildSinglePdfHtml(
  inst: PpiInstanceForExport,
  labels: ExportLabels,
  locale: string,
  projectName: string,
  logoUrl?: string | null,
): string {
  const okCount      = inst.items.filter((i) => i.result === "pass").length;
  const nokCount     = inst.items.filter((i) => i.result === "fail").length;
  const naCount      = inst.items.filter((i) => i.result === "na").length;
  const pendingCount = inst.items.filter((i) => i.result === "pending").length;
  const reviewed     = okCount + nokCount + naCount;
  const pct          = inst.items.length > 0 ? Math.round((reviewed / inst.items.length) * 100) : 0;

  const statusLabel  = labels.statusLabels[inst.status] ?? inst.status;
  const disciplina   = inst.work_item_disciplina ?? inst.template_disciplina ?? "—";

  const rows = inst.items.map((it) => {
    const rLabel = labels.resultLabels[it.result] ?? it.result;
    const ncBadge = it.nc_id
      ? `<span style="color:${BRAND.nok};font-size:9px;font-weight:600;">NC</span>`
      : it.requires_nc
        ? `<span style="color:${BRAND.pending};font-size:9px;font-weight:600;">⚠</span>`
        : "";
    return `
      <tr>
        <td style="width:32px;text-align:center;color:${BRAND.textLight};font-size:10px;padding:5px 4px;">${it.item_no}</td>
        <td style="padding:5px 6px;font-size:11px;">${it.label} ${ncBadge}</td>
        <td style="width:70px;text-align:center;padding:5px 4px;">
          <span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;
            background:${resultBg(it.result)};color:${resultColor(it.result)};">
            ${rLabel}
          </span>
        </td>
        <td style="padding:5px 6px;font-size:10px;color:${BRAND.textLight};">${it.notes ?? "—"}</td>
        <td style="width:80px;padding:5px 4px;font-size:9px;color:${BRAND.textLight};">${fmtDate(it.checked_at, locale)}</td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${inst.code} — Atlas PPI</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
         font-size: 12px; color: ${BRAND.text}; background: ${BRAND.white}; }
  @page { size: A4; margin: 14mm 12mm; }
  @media print { .no-print { display:none; } }

  .header { display:flex; align-items:flex-start; justify-content:space-between;
            padding-bottom:10px; border-bottom:3px solid ${BRAND.primary}; margin-bottom:16px; }
  .brand  { display:flex; align-items:center; gap:10px; }
  .brand-bar { width:6px; height:40px; background:${BRAND.primary}; border-radius:3px; }
  .brand-text .app  { font-size:18px; font-weight:800; color:${BRAND.primary}; letter-spacing:-.5px; }
  .brand-text .sub  { font-size:9px; font-weight:600; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:.1em; }
  .meta { text-align:right; }
  .meta .report-title { font-size:13px; font-weight:700; color:${BRAND.primary}; }
  .meta .gen  { font-size:9px; color:${BRAND.textLight}; margin-top:3px; }

  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px;
               background:${BRAND.bg}; border:1px solid ${BRAND.border};
               border-radius:8px; padding:12px 16px; margin-bottom:16px; }
  .info-row  { display:flex; flex-direction:column; }
  .info-label { font-size:8px; font-weight:700; text-transform:uppercase;
                letter-spacing:.12em; color:${BRAND.muted}; margin-bottom:2px; }
  .info-value { font-size:11px; color:${BRAND.text}; }
  .status-badge { display:inline-block; padding:2px 8px; border-radius:20px;
                  font-size:10px; font-weight:700;
                  background:${BRAND.primary}20; color:${BRAND.primary}; }

  .progress-bar-wrap { background:${BRAND.border}; border-radius:4px; height:6px; margin:4px 0 2px; }
  .progress-bar { height:6px; border-radius:4px; background:${BRAND.primary}; }
  .progress-counts { display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
  .pc { font-size:9px; font-weight:600; }

  .section-title { font-size:9px; font-weight:800; text-transform:uppercase;
                   letter-spacing:.14em; color:${BRAND.muted}; margin-bottom:8px; }
  table.checklist { width:100%; border-collapse:collapse; }
  table.checklist thead tr { background:${BRAND.primary}; color:${BRAND.white}; }
  table.checklist thead th { padding:6px 6px; font-size:9px; font-weight:700;
                              text-transform:uppercase; letter-spacing:.1em; text-align:left; }
  table.checklist tbody tr { border-bottom:1px solid ${BRAND.border}; }
  table.checklist tbody tr:nth-child(even) { background:${BRAND.bg}; }

  .footer { margin-top:20px; padding-top:8px; border-top:1px solid ${BRAND.border};
            display:flex; justify-content:space-between; font-size:8px; color:${BRAND.textLight}; }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="brand">
      <div class="brand-bar"></div>
      <div class="brand-text">
        <div class="app">${labels.appName}</div>
        <div class="sub">Quality Management System</div>
      </div>
    </div>
    <div class="meta">
      <div class="report-title">${labels.reportTitle}</div>
      <div class="gen">${labels.generatedOn}: ${fmtDate(new Date().toISOString(), locale)}</div>
    </div>
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">${labels.project}</span>
      <span class="info-value">${projectName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.code}</span>
      <span class="info-value" style="font-family:monospace;font-weight:700;">${inst.code}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.workItem}</span>
      <span class="info-value">${inst.work_item_sector ?? inst.work_item_id.slice(0, 8)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.discipline}</span>
      <span class="info-value">${disciplina}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.template}</span>
      <span class="info-value" style="font-family:monospace;font-size:10px;">${inst.template_code ?? "—"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.status}</span>
      <span class="status-badge">${statusLabel}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.openedAt}</span>
      <span class="info-value">${fmtDate(inst.opened_at, locale)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.inspectionDate}</span>
      <span class="info-value">${fmtDate(inst.inspection_date, locale)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.closedAt}</span>
      <span class="info-value">${fmtDate(inst.closed_at, locale)}</span>
    </div>
    <div class="info-row" style="grid-column:span 2;">
      <span class="info-label">${labels.progress} — ${reviewed}/${inst.items.length} ${labels.reviewed} (${pct}%)</span>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      <div class="progress-counts">
        <span class="pc" style="color:${BRAND.ok};">✓ ${okCount} ${labels.ok}</span>
        <span class="pc" style="color:${BRAND.nok};">✗ ${nokCount} ${labels.nok}</span>
        <span class="pc" style="color:${BRAND.na};">— ${naCount} ${labels.na}</span>
        ${pendingCount > 0 ? `<span class="pc" style="color:${BRAND.pending};">⧖ ${pendingCount} ${labels.pending}</span>` : ""}
      </div>
    </div>
  </div>

  <!-- Checklist -->
  <div class="section-title">${labels.checklistTitle}</div>
  <table class="checklist">
    <thead>
      <tr>
        <th style="width:32px;">${labels.itemNo}</th>
        <th>${labels.label}</th>
        <th style="width:70px;">${labels.result}</th>
        <th>${labels.notes}</th>
        <th style="width:80px;">${labels.checkedAt}</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="5" style="text-align:center;padding:12px;color:${BRAND.textLight};">—</td></tr>`}</tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <span>${labels.appName} · Quality Management System</span>
    <span>${inst.code} · ${statusLabel}</span>
  </div>
</body>
</html>`;
}

// ─── Open print window ────────────────────────────────────────────────────────

function printHtml(html: string, filename: string): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // Fallback: download as HTML blob
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename.replace(".pdf", ".html");
    a.click();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Give browser time to render, then print
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };
  // Fallback if onload already fired
  setTimeout(() => {
    if (!win.document.readyState || win.document.readyState === "complete") {
      win.focus();
      win.print();
    }
  }, 800);
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  return lines.join("\r\n");
}

function downloadCsv(csv: string, filename: string): void {
  const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export a single PPI instance as a printable PDF via the browser print dialog.
 */
export function exportSinglePdf(
  inst: PpiInstanceForExport,
  labels: ExportLabels,
  locale: string,
  projectName: string,
): void {
  const html = buildSinglePdfHtml(inst, labels, locale, projectName);
  printHtml(html, buildFilename(inst, projectName));
}

/**
 * Export multiple instances as a combined printable PDF (one page per instance).
 * Each instance is separated by a page-break in the print dialog.
 */
export function exportBulkPdf(
  instances: PpiInstanceForExport[],
  labels: ExportLabels,
  locale: string,
  projectName: string,
): void {
  if (instances.length === 0) return;

  // Build pages concatenated — CSS page-break between them
  const pages = instances.map((inst) =>
    buildSinglePdfHtml(inst, labels, locale, projectName)
      .replace("<!DOCTYPE html>", "")
      .replace(/<html[^>]*>/, "")
      .replace("</html>", "")
      .replace(/<head>[\s\S]*?<\/head>/, "")
      .replace(/<body>/, '<div style="page-break-after:always;">')
      .replace("</body>", "</div>")
  );

  // Shared CSS wrapper
  const firstHtml = buildSinglePdfHtml(instances[0], labels, locale, projectName);
  const styleMatch = firstHtml.match(/<style>([\s\S]*?)<\/style>/);
  const css = styleMatch ? styleMatch[1] : "";

  const combined = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${labels.bulkReportTitle} — Atlas PPI</title>
<style>${css}
  .page-instance { page-break-after: always; padding-bottom: 0; }
  .page-instance:last-child { page-break-after: auto; }
</style>
</head>
<body>
${pages.join("\n")}
</body>
</html>`;

  const bulkFilename = instances.length === 1
    ? buildFilename(instances[0], projectName)
    : `PPI_${sanitize(projectName)}_bulk_${instances.length}_${Date.now()}.pdf`;
  printHtml(combined, bulkFilename);
}

/**
 * Export a list of instances (summary) as CSV.
 */
export function exportInstancesCsv(
  instances: PpiInstanceForExport[],
  labels: ExportLabels,
  locale: string,
  projectName: string,
  filename = "ppi-instances.csv",
): void {
  const headers = [
    labels.project,
    labels.code,
    labels.workItem,
    labels.discipline,
    labels.template,
    labels.status,
    labels.openedAt,
    labels.closedAt,
    labels.progress,
    labels.ok,
    labels.nok,
    labels.na,
    labels.pending,
  ];

  const rows = instances.map((inst) => {
    const ok      = inst.items.filter((i) => i.result === "pass").length;
    const nok     = inst.items.filter((i) => i.result === "fail").length;
    const na      = inst.items.filter((i) => i.result === "na").length;
    const pending = inst.items.filter((i) => i.result === "pending").length;
    const total   = inst.items.length;
    const pct     = total > 0 ? `${Math.round(((ok + nok + na) / total) * 100)}%` : "0%";
    return [
      projectName,
      inst.code,
      inst.work_item_sector ?? inst.work_item_id,
      inst.work_item_disciplina ?? inst.template_disciplina ?? "",
      inst.template_code ?? "",
      labels.statusLabels[inst.status] ?? inst.status,
      fmtDate(inst.opened_at, locale),
      fmtDate(inst.closed_at, locale),
      pct,
      ok,
      nok,
      na,
      pending,
    ];
  });

  const csv = buildCsv(headers, rows);
  downloadCsv(csv, filename);
}

/**
 * Export all checklist items from the given instances as CSV.
 */
export function exportItemsCsv(
  instances: PpiInstanceForExport[],
  labels: ExportLabels,
  locale: string,
  projectName: string,
  filename = "ppi-items.csv",
): void {
  const headers = [
    labels.project,
    labels.code,
    labels.itemNo,
    labels.checkCode,
    labels.label,
    labels.result,
    labels.notes,
    labels.checkedAt,
    labels.requiresNc,
    labels.linkedNc,
  ];

  const rows: unknown[][] = [];
  for (const inst of instances) {
    for (const it of inst.items) {
      rows.push([
        projectName,
        inst.code,
        it.item_no,
        it.check_code,
        it.label,
        labels.resultLabels[it.result] ?? it.result,
        it.notes ?? "",
        fmtDate(it.checked_at, locale),
        it.requires_nc ? "✓" : "",
        it.nc_id ? it.nc_id.slice(0, 8) : "",
      ]);
    }
  }

  const csv = buildCsv(headers, rows);
  downloadCsv(csv, filename);
}
