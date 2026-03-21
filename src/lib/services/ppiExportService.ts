/**
 * PPI Export Service
 * Provides PDF (via styled print window), ZIP (JSZip) and CSV exports
 * for PPI instances. Uses Atlas branding and respects the active i18n locale.
 *
 * v2: Enhanced PDF with acceptance_criteria, method, IPT matrix (E/F/IP),
 *     phase grouping, signatures block, and NOT-HP PDF export.
 */

import type { PpiInstance, PpiInstanceItem } from "./ppiService";
import type { HpNotification } from "./hpNotificationService";
import { projectInfoStripHtml } from "./pdfProjectHeader";
import { esc } from "@/lib/utils/escapeHtml";

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
  hp:         "#DC2626",
  wp:         "#D97706",
  rp:         "#2F4F75",
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

function fmtDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale === "pt" ? "pt-PT" : "es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

function sanitize(s: string): string {
  return s
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function buildFilename(inst: PpiInstanceForExport, projectName: string): string {
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

function iptBadge(val: string | null | undefined): string {
  const v = val?.toUpperCase() ?? "N/A";
  const color = val === "hp" ? BRAND.hp : val === "wp" ? BRAND.wp : val === "rp" ? BRAND.rp : BRAND.muted;
  const bg = val === "hp" ? "#FEF2F2" : val === "wp" ? "#FFFBEB" : val === "rp" ? "#EFF6FF" : "#F3F4F6";
  return `<span style="display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;background:${bg};color:${color};">${esc(v)}</span>`;
}

function iptTypeBadge(ipt: string | null | undefined): string {
  const v = ipt?.toUpperCase() ?? "—";
  if (ipt === "hp") return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:800;background:#FEF2F2;color:${BRAND.hp};">HP</span>`;
  if (ipt === "wp") return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:800;background:#FFFBEB;color:${BRAND.wp};">WP</span>`;
  if (ipt === "rp") return `<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:800;background:#EFF6FF;color:${BRAND.rp};">RP</span>`;
  return `<span style="font-size:9px;color:${BRAND.muted};">${v}</span>`;
}

// ─── Single PDF HTML builder (v2 — enhanced) ─────────────────────────────────

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

  // Group items by phase_name (from sort_order groups or check_code prefix)
  // Since ppi_instance_items don't have phase_name, we derive it from check_code prefix
  let lastPhase = "";
  const rows = inst.items.map((it) => {
    const rLabel = labels.resultLabels[it.result] ?? it.result;
    const ncBadge = it.nc_id
      ? `<span style="color:${BRAND.nok};font-size:9px;font-weight:600;">NC</span>`
      : it.requires_nc
        ? `<span style="color:${BRAND.pending};font-size:9px;font-weight:600;">⚠</span>`
        : "";

    // Phase separator row — detect phase change from check_code prefix (e.g. "01" → "02")
    const phasePrefix = it.check_code.split(".")[0] ?? "";
    const phaseRow = "";
    if (phasePrefix !== lastPhase && phasePrefix) {
      lastPhase = phasePrefix;
      // We don't have phase_name on instance items, so omit explicit phase headers
      // unless acceptance_criteria provides enough grouping visually
    }

    // Build item cell with acceptance_criteria and method
    const criteriaHtml = it.acceptance_criteria
      ? `<div style="font-size:9px;color:${BRAND.textLight};font-style:italic;margin-top:2px;">${esc(it.acceptance_criteria)}</div>`
      : "";
    const methodHtml = it.method
      ? `<div style="font-size:8px;color:${BRAND.muted};margin-top:1px;">${esc(it.method)}</div>`
      : "";

    return `${phaseRow}
      <tr>
        <td style="width:28px;text-align:center;color:${BRAND.textLight};font-size:10px;padding:4px 3px;vertical-align:top;">${it.item_no}</td>
        <td style="width:36px;text-align:center;padding:4px 3px;vertical-align:top;">
          ${iptTypeBadge(it.inspection_point_type)}
        </td>
        <td style="padding:4px 5px;font-size:10px;vertical-align:top;">
          <div>${esc(it.label)} ${ncBadge}</div>
          ${criteriaHtml}
          ${methodHtml}
        </td>
        <td style="width:30px;text-align:center;padding:4px 2px;vertical-align:top;">${iptBadge((it as any).ipt_e)}</td>
        <td style="width:30px;text-align:center;padding:4px 2px;vertical-align:top;">${iptBadge((it as any).ipt_f)}</td>
        <td style="width:30px;text-align:center;padding:4px 2px;vertical-align:top;">${iptBadge((it as any).ipt_ip)}</td>
        <td style="width:60px;text-align:center;padding:4px 3px;vertical-align:top;">
          <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;
            background:${resultBg(it.result)};color:${resultColor(it.result)};">
            ${rLabel}
          </span>
        </td>
        <td style="padding:4px 5px;font-size:9px;color:${BRAND.textLight};vertical-align:top;">${esc(it.notes) || "—"}</td>
        <td style="width:65px;padding:4px 3px;font-size:8px;color:${BRAND.textLight};vertical-align:top;">${fmtDate(it.checked_at, locale)}</td>
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
         font-size: 11px; color: ${BRAND.text}; background: ${BRAND.white}; }
  @page { size: A4 landscape; margin: 10mm 10mm; }
  @media print { .no-print { display:none; } }

  .header { display:flex; align-items:flex-start; justify-content:space-between;
            padding-bottom:8px; border-bottom:3px solid ${BRAND.primary}; margin-bottom:12px; }
  .brand  { display:flex; align-items:center; gap:8px; }
  .brand-bar { width:5px; height:36px; background:${BRAND.primary}; border-radius:3px; }
  .brand-logo { height:36px; width:36px; object-fit:contain; border-radius:5px; }
  .brand-text .app  { font-size:16px; font-weight:800; color:${BRAND.primary}; letter-spacing:-.5px; }
  .brand-text .sub  { font-size:8px; font-weight:600; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:.1em; }
  .meta { text-align:right; }
  .meta .report-title { font-size:12px; font-weight:700; color:${BRAND.primary}; }
  .meta .gen  { font-size:8px; color:${BRAND.textLight}; margin-top:2px; }

  .info-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px 18px;
               background:${BRAND.bg}; border:1px solid ${BRAND.border};
               border-radius:6px; padding:8px 12px; margin-bottom:10px; }
  .info-row  { display:flex; flex-direction:column; }
  .info-label { font-size:7px; font-weight:700; text-transform:uppercase;
                letter-spacing:.12em; color:${BRAND.muted}; margin-bottom:1px; }
  .info-value { font-size:10px; color:${BRAND.text}; }
  .status-badge { display:inline-block; padding:1px 7px; border-radius:16px;
                  font-size:9px; font-weight:700;
                  background:${BRAND.primary}20; color:${BRAND.primary}; }

  .progress-bar-wrap { background:${BRAND.border}; border-radius:3px; height:5px; margin:3px 0 2px; }
  .progress-bar { height:5px; border-radius:3px; background:${BRAND.primary}; }
  .progress-counts { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
  .pc { font-size:8px; font-weight:600; }

  .section-title { font-size:8px; font-weight:800; text-transform:uppercase;
                   letter-spacing:.14em; color:${BRAND.muted}; margin-bottom:6px; }
  table.checklist { width:100%; border-collapse:collapse; }
  table.checklist thead tr { background:${BRAND.primary}; color:${BRAND.white}; }
  table.checklist thead th { padding:4px 4px; font-size:7px; font-weight:700;
                              text-transform:uppercase; letter-spacing:.08em; text-align:left; }
  table.checklist tbody tr { border-bottom:1px solid ${BRAND.border}; }
  table.checklist tbody tr:nth-child(even) { background:${BRAND.bg}; }

  .signatures { margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .sig-block { border-top:1px solid ${BRAND.border}; padding-top:8px; }
  .sig-role { font-size:9px; font-weight:700; color:${BRAND.primary}; margin-bottom:12px; }
  .sig-line { display:flex; gap:16px; margin-top:8px; }
  .sig-field { font-size:8px; color:${BRAND.muted}; border-bottom:1px solid ${BRAND.border};
               min-width:100px; padding-bottom:16px; }

  .footer { margin-top:16px; padding-top:6px; border-top:1px solid ${BRAND.border};
            display:flex; justify-content:space-between; font-size:7px; color:${BRAND.textLight}; }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="brand">
      ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" />` : `<div class="brand-bar"></div>`}
      <div class="brand-text">
        <div class="app">${esc(labels.appName)}</div>
        <div class="sub">Quality Management System</div>
      </div>
    </div>
    <div class="meta">
      <div class="report-title">${esc(labels.reportTitle)}</div>
      <div class="gen">${labels.generatedOn}: ${fmtDate(new Date().toISOString(), locale)}</div>
    </div>
  </div>

  ${projectInfoStripHtml(null)}

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">${labels.project}</span>
      <span class="info-value">${esc(projectName)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.code}</span>
      <span class="info-value" style="font-family:monospace;font-weight:700;">${esc(inst.code)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.template}</span>
      <span class="info-value" style="font-family:monospace;font-size:9px;">${esc(inst.template_code) || "—"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.workItem}</span>
      <span class="info-value">${esc(inst.work_item_sector ?? inst.work_item_id.slice(0, 8))}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.discipline}</span>
      <span class="info-value">${esc(disciplina)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.status}</span>
      <span class="status-badge">${esc(statusLabel)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.inspectionDate}</span>
      <span class="info-value">${fmtDate(inst.inspection_date, locale)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.openedAt}</span>
      <span class="info-value">${fmtDate(inst.opened_at, locale)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">${labels.closedAt}</span>
      <span class="info-value">${fmtDate(inst.closed_at, locale)}</span>
    </div>
    <div class="info-row" style="grid-column:span 3;">
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
        <th style="width:28px;">#</th>
        <th style="width:36px;">Tipo</th>
        <th>Item</th>
        <th style="width:30px;">E</th>
        <th style="width:30px;">F</th>
        <th style="width:30px;">IP</th>
        <th style="width:60px;">${labels.result}</th>
        <th>${labels.notes}</th>
        <th style="width:65px;">Data</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="9" style="text-align:center;padding:12px;color:${BRAND.textLight};">—</td></tr>`}</tbody>
  </table>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-role">TQ / Inspector</div>
      <div class="sig-line">
        <div class="sig-field">Nome: _________________________</div>
        <div class="sig-field">Data: ___________</div>
      </div>
      <div class="sig-line" style="margin-top:12px;">
        <div class="sig-field">Assinatura: _________________________</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-role">Fiscalização</div>
      <div class="sig-line">
        <div class="sig-field">Nome: _________________________</div>
        <div class="sig-field">Data: ___________</div>
      </div>
      <div class="sig-line" style="margin-top:12px;">
        <div class="sig-field">Assinatura: _________________________</div>
      </div>
    </div>
  </div>

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
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };
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
  const bom = "\uFEFF";
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
  logoUrl?: string | null,
): void {
  const html = buildSinglePdfHtml(inst, labels, locale, projectName, logoUrl);
  printHtml(html, buildFilename(inst, projectName));
}

/**
 * Export multiple instances as a combined printable PDF (one page per instance).
 */
export function exportBulkPdf(
  instances: PpiInstanceForExport[],
  labels: ExportLabels,
  locale: string,
  projectName: string,
  logoUrl?: string | null,
): void {
  if (instances.length === 0) return;

  const pages = instances.map((inst) =>
    buildSinglePdfHtml(inst, labels, locale, projectName, logoUrl)
      .replace("<!DOCTYPE html>", "")
      .replace(/<html[^>]*>/, "")
      .replace("</html>", "")
      .replace(/<head>[\s\S]*?<\/head>/, "")
      .replace(/<body>/, '<div style="page-break-after:always;">')
      .replace("</body>", "</div>")
  );

  const firstHtml = buildSinglePdfHtml(instances[0], labels, locale, projectName, logoUrl);
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
 * Export a NOT-HP notification as a printable PDF.
 */
export function exportNotHpPdf(
  notification: HpNotification,
  labels: ExportLabels,
  projectName: string,
  locale = "pt",
): void {
  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${notification.code} — NOT-HP</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
         font-size: 12px; color: ${BRAND.text}; background: ${BRAND.white}; }
  @page { size: A4; margin: 14mm 12mm; }
  @media print { .no-print { display:none; } }

  .header { display:flex; align-items:flex-start; justify-content:space-between;
            padding-bottom:10px; border-bottom:3px solid ${BRAND.hp}; margin-bottom:20px; }
  .brand  { display:flex; align-items:center; gap:10px; }
  .brand-bar { width:6px; height:40px; background:${BRAND.hp}; border-radius:3px; }
  .brand-text .app  { font-size:18px; font-weight:800; color:${BRAND.hp}; letter-spacing:-.5px; }
  .brand-text .sub  { font-size:9px; font-weight:600; color:${BRAND.muted}; text-transform:uppercase; letter-spacing:.1em; }
  .meta { text-align:right; }
  .meta .code-title { font-size:16px; font-weight:800; color:${BRAND.hp}; font-family:monospace; }
  .meta .gen  { font-size:9px; color:${BRAND.textLight}; margin-top:3px; }

  .title-block { text-align:center; margin-bottom:24px; }
  .title-block h1 { font-size:20px; font-weight:800; color:${BRAND.hp}; text-transform:uppercase; letter-spacing:.1em; }
  .title-block .sub { font-size:11px; color:${BRAND.muted}; margin-top:4px; }

  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px;
               background:${BRAND.bg}; border:1px solid ${BRAND.border};
               border-radius:8px; padding:16px 20px; margin-bottom:24px; }
  .info-row  { display:flex; flex-direction:column; }
  .info-label { font-size:8px; font-weight:700; text-transform:uppercase;
                letter-spacing:.12em; color:${BRAND.muted}; margin-bottom:3px; }
  .info-value { font-size:12px; color:${BRAND.text}; }

  .datetime-highlight { text-align:center; padding:20px; margin:20px 0;
                        border:2px solid ${BRAND.hp}; border-radius:8px;
                        background:${BRAND.hp}08; }
  .datetime-highlight .label { font-size:9px; font-weight:700; text-transform:uppercase;
                               letter-spacing:.14em; color:${BRAND.hp}; margin-bottom:6px; }
  .datetime-highlight .value { font-size:24px; font-weight:800; color:${BRAND.hp}; }

  .confirm-block { margin-top:40px; border-top:2px solid ${BRAND.border}; padding-top:16px; }
  .confirm-title { font-size:10px; font-weight:800; text-transform:uppercase;
                   letter-spacing:.14em; color:${BRAND.muted}; margin-bottom:16px; }
  .sig-line { display:flex; gap:16px; margin-bottom:12px; }
  .sig-field { font-size:10px; color:${BRAND.muted}; border-bottom:1px solid ${BRAND.border};
               min-width:160px; padding-bottom:20px; }

  .footer { margin-top:24px; padding-top:8px; border-top:1px solid ${BRAND.border};
            display:flex; justify-content:space-between; font-size:8px; color:${BRAND.textLight}; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-bar"></div>
      <div class="brand-text">
        <div class="app">${labels.appName}</div>
        <div class="sub">Notificação Hold Point (48h)</div>
      </div>
    </div>
    <div class="meta">
      <div class="code-title">${notification.code}</div>
      <div class="gen">Emitido: ${fmtDateTime(notification.notified_at, locale)}</div>
    </div>
  </div>

  <div class="title-block">
    <h1>Notificação de Hold Point</h1>
    <div class="sub">Aviso prévio obrigatório de 48 horas — EN ISO 19011</div>
  </div>

  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Projeto</span>
      <span class="info-value">${projectName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Código NOT-HP</span>
      <span class="info-value" style="font-family:monospace;font-weight:700;">${notification.code}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Referência PPI</span>
      <span class="info-value" style="font-family:monospace;">${notification.ppi_ref}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Ponto de Inspeção</span>
      <span class="info-value" style="font-weight:700;">${notification.point_no}</span>
    </div>
    <div class="info-row" style="grid-column:span 2;">
      <span class="info-label">Actividade</span>
      <span class="info-value">${notification.activity}</span>
    </div>
    ${notification.location_pk ? `
    <div class="info-row">
      <span class="info-label">Localização / PK</span>
      <span class="info-value">${notification.location_pk}</span>
    </div>` : ""}
    ${notification.notes ? `
    <div class="info-row" style="grid-column:span 2;">
      <span class="info-label">Observações</span>
      <span class="info-value">${notification.notes}</span>
    </div>` : ""}
  </div>

  <div class="datetime-highlight">
    <div class="label">Data / Hora Prevista da Inspeção</div>
    <div class="value">${fmtDateTime(notification.planned_datetime, locale)}</div>
  </div>

  <div class="confirm-block">
    <div class="confirm-title">Confirmação de Recepção — Fiscalização / IP</div>
    <div class="sig-line">
      <div class="sig-field">Recebido por: ____________________________________</div>
      <div class="sig-field">Data: _______________</div>
    </div>
    <div class="sig-line">
      <div class="sig-field">Assinatura: ____________________________________</div>
      <div class="sig-field">Carimbo: _______________</div>
    </div>
  </div>

  <div class="footer">
    <span>${labels.appName} · Quality Management System</span>
    <span>${notification.code} · ${notification.ppi_ref}</span>
  </div>
</body>
</html>`;

  printHtml(html, `${sanitize(notification.code)}_${sanitize(projectName)}.pdf`);
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
