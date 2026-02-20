/**
 * Work Item Export Service
 * Generates printable PDF reports and CSV exports for Work Items.
 * Uses the same Atlas brand tokens as ppiExportService.
 */

import type { WorkItem } from "./workItemService";
import { formatPk } from "./workItemService";

// ─── Atlas brand colours (matches design tokens) ──────────────────────────────

const BRAND = {
  primary:   "#2F4F75",
  muted:     "#6B7280",
  border:    "#E5E7EB",
  bg:        "#F9FAFB",
  white:     "#FFFFFF",
  text:      "#111827",
  textLight: "#6B7280",
  ok:        "#059669",
  nok:       "#DC2626",
  pending:   "#D97706",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkItemForExport extends WorkItem {
  /** Translated discipline label */
  disciplina_label?: string;
  /** Translated status label */
  status_label?: string;
  /** Related NC count */
  nc_count?: number;
  /** Related Test Results count */
  test_count?: number;
  /** Related PPI count */
  ppi_count?: number;
}

export interface WorkItemExportLabels {
  appName: string;
  reportTitle: string;
  generatedOn: string;
  project: string;
  sector: string;
  discipline: string;
  obra: string;
  lote: string;
  elemento: string;
  parte: string;
  pk: string;
  status: string;
  createdAt: string;
  ncs: string;
  tests: string;
  ppis: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return s
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    const parts = iso.slice(0, 10).split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(locale === "pt" ? "pt-PT" : "es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function buildFilename(item: WorkItemForExport, projectName: string): string {
  const proj   = sanitize(projectName);
  const sector = sanitize(item.sector);
  const date   = item.created_at.slice(0, 10).replace(/-/g, "");
  const status = sanitize(item.status);
  return `WI_${proj}_${sector}_${date}_${status}.pdf`;
}

// ─── PDF HTML builder ─────────────────────────────────────────────────────────

function buildWorkItemPdfHtml(
  item: WorkItemForExport,
  labels: WorkItemExportLabels,
  locale: string,
  projectName: string,
): string {
  const discLabel = item.disciplina_label ?? item.disciplina;
  const stLabel   = item.status_label ?? item.status;
  const pkStr     = formatPk(item.pk_inicio, item.pk_fim);

  const infoRows = [
    [labels.sector,     item.sector],
    [labels.discipline, discLabel],
    [labels.obra,       item.obra ?? "—"],
    [labels.lote,       item.lote ?? "—"],
    [labels.elemento,   item.elemento ?? "—"],
    [labels.parte,      item.parte ?? "—"],
    [labels.pk,         pkStr],
    [labels.status,     stLabel],
    [labels.createdAt,  fmtDate(item.created_at, locale)],
  ].map(([lbl, val]) => `
    <div class="info-row">
      <span class="info-label">${lbl}</span>
      <span class="info-value">${val}</span>
    </div>`).join("");

  const statsRows = [
    [labels.ppis,  String(item.ppi_count  ?? "—")],
    [labels.ncs,   String(item.nc_count   ?? "—")],
    [labels.tests, String(item.test_count ?? "—")],
  ].map(([lbl, val]) => `
    <div class="stat-row">
      <span class="stat-label">${lbl}</span>
      <span class="stat-value">${val}</span>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${item.sector} — Atlas Work Item</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
         font-size:12px; color:${BRAND.text}; background:${BRAND.white}; }
  @page { size:A4; margin:14mm 12mm; }

  .header { display:flex; align-items:flex-start; justify-content:space-between;
            padding-bottom:10px; border-bottom:3px solid ${BRAND.primary}; margin-bottom:16px; }
  .brand  { display:flex; align-items:center; gap:10px; }
  .brand-bar { width:6px; height:40px; background:${BRAND.primary}; border-radius:3px; }
  .brand-text .app { font-size:18px; font-weight:800; color:${BRAND.primary}; letter-spacing:-.5px; }
  .brand-text .sub { font-size:9px; font-weight:600; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:.1em; }
  .meta { text-align:right; }
  .meta .report-title { font-size:13px; font-weight:700; color:${BRAND.primary}; }
  .meta .gen { font-size:9px; color:${BRAND.textLight}; margin-top:3px; }

  .sector-title { font-size:20px; font-weight:800; color:${BRAND.primary}; margin-bottom:4px; }
  .project-sub  { font-size:11px; color:${BRAND.muted}; margin-bottom:16px; }

  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px;
               background:${BRAND.bg}; border:1px solid ${BRAND.border};
               border-radius:8px; padding:12px 16px; margin-bottom:16px; }
  .info-row { display:flex; flex-direction:column; }
  .info-label { font-size:8px; font-weight:700; text-transform:uppercase;
                letter-spacing:.12em; color:${BRAND.muted}; margin-bottom:2px; }
  .info-value { font-size:11px; color:${BRAND.text}; }

  .stats-grid { display:flex; gap:16px; margin-bottom:16px; }
  .stat-box { flex:1; background:${BRAND.bg}; border:1px solid ${BRAND.border};
              border-radius:8px; padding:10px 14px; }
  .stat-row { display:flex; flex-direction:column; }
  .stat-label { font-size:8px; font-weight:700; text-transform:uppercase;
                letter-spacing:.12em; color:${BRAND.muted}; margin-bottom:2px; }
  .stat-value { font-size:18px; font-weight:800; color:${BRAND.primary}; }

  .footer { margin-top:20px; padding-top:8px; border-top:1px solid ${BRAND.border};
            display:flex; justify-content:space-between; font-size:8px; color:${BRAND.textLight}; }
</style>
</head>
<body>
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

  <div class="sector-title">${item.sector}</div>
  <div class="project-sub">${labels.project}: ${projectName}</div>

  <div class="info-grid">${infoRows}</div>

  <div class="stats-grid">${statsRows}</div>

  <div class="footer">
    <span>${labels.appName} · Quality Management System</span>
    <span>${item.sector} · ${stLabel}</span>
  </div>
</body>
</html>`;
}

// ─── Open print window ────────────────────────────────────────────────────────

function printHtml(html: string, filename: string): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
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
  win.onload = () => { setTimeout(() => { win.focus(); win.print(); }, 400); };
  setTimeout(() => {
    if (!win.document.readyState || win.document.readyState === "complete") {
      win.focus(); win.print();
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

function downloadCsv(csv: string, filename: string): void {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportWorkItemPdf(
  item: WorkItemForExport,
  labels: WorkItemExportLabels,
  locale: string,
  projectName: string,
): void {
  const html = buildWorkItemPdfHtml(item, labels, locale, projectName);
  printHtml(html, buildFilename(item, projectName));
}

export function exportWorkItemsCsv(
  items: WorkItemForExport[],
  labels: WorkItemExportLabels,
  locale: string,
  projectName: string,
  filename = "work-items.csv",
): void {
  const headers = [
    labels.project, labels.sector, labels.discipline, labels.obra,
    labels.lote, labels.elemento, labels.parte, labels.pk,
    labels.status, labels.createdAt, labels.ppis, labels.ncs, labels.tests,
  ];
  const rows = items.map((it) => [
    projectName,
    it.sector,
    it.disciplina_label ?? it.disciplina,
    it.obra ?? "",
    it.lote ?? "",
    it.elemento ?? "",
    it.parte ?? "",
    formatPk(it.pk_inicio, it.pk_fim),
    it.status_label ?? it.status,
    fmtDate(it.created_at, locale),
    it.ppi_count ?? "",
    it.nc_count ?? "",
    it.test_count ?? "",
  ]);

  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  downloadCsv(lines.join("\r\n"), filename);
}
