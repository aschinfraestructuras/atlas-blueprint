/**
 * Work Item Export Service
 * Generates printable PDF reports and CSV exports for Work Items.
 * Consolidated PDF includes all related entities (PPI, Tests, NCs, Planning, Topography).
 */

import type { WorkItem } from "./workItemService";
import { formatPk } from "./workItemService";
import { projectInfoStripHtml } from "./pdfProjectHeader";
import { esc } from "@/lib/utils/escapeHtml";

// ─── Atlas brand colours ──────────────────────────────────────────────────────

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
  disciplina_label?: string;
  status_label?: string;
  nc_count?: number;
  test_count?: number;
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

export interface ConsolidatedExportData {
  ppis: { code: string; status: string; disciplina: string }[];
  tests: { name: string; code: string; status: string; passFail: string; date: string }[];
  ncs: { code: string; description: string; severity: string; status: string }[];
  activities: { description: string; status: string; progress: number; zone: string }[];
  topoRequests: { type: string; description: string; status: string }[];
  topoControls: { element: string; zone: string; result: string; deviation: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return s.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_\-.]/g, "").replace(/_+/g, "_").slice(0, 40);
}

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    const parts = iso.slice(0, 10).split("-");
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(locale === "pt" ? "pt-PT" : "es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch { return iso.slice(0, 10); }
}

function buildFilename(item: WorkItemForExport, projectName: string): string {
  const proj = sanitize(projectName);
  const sector = sanitize(item.sector);
  const date = item.created_at.slice(0, 10).replace(/-/g, "");
  return `WI_${proj}_${sector}_${date}.pdf`;
}

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

function csvEscape(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
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

// ─── Section HTML builder ─────────────────────────────────────────────────────

function sectionHtml(title: string, headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  const ths = headers.map(h => `<th style="text-align:left;padding:6px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${BRAND.muted};border-bottom:2px solid ${BRAND.border};">${h}</th>`).join("");
  const trs = rows.map(r => {
    const tds = r.map(c => `<td style="padding:5px 8px;font-size:11px;color:${BRAND.text};border-bottom:1px solid ${BRAND.border};">${c}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
  return `
    <div style="margin-top:18px;">
      <div style="font-size:11px;font-weight:800;color:${BRAND.primary};margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em;">${title}</div>
      <table style="width:100%;border-collapse:collapse;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    </div>`;
}

function statusDot(status: string): string {
  const color = status === "closed" || status === "completed" || status === "approved" || status === "pass" || status === "conforme"
    ? BRAND.ok
    : status === "fail" || status === "não conforme" ? BRAND.nok : BRAND.pending;
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;"></span>${status}`;
}

// ─── Consolidated PDF ─────────────────────────────────────────────────────────

function buildConsolidatedHtml(
  item: WorkItemForExport,
  labels: WorkItemExportLabels,
  locale: string,
  projectName: string,
  data: ConsolidatedExportData,
): string {
  const discLabel = item.disciplina_label ?? item.disciplina;
  const stLabel = item.status_label ?? item.status;
  const pkStr = formatPk(item.pk_inicio, item.pk_fim);

  const infoRows = [
    [labels.sector, item.sector], [labels.discipline, discLabel],
    [labels.obra, item.obra ?? "—"], [labels.lote, item.lote ?? "—"],
    [labels.elemento, item.elemento ?? "—"], [labels.parte, item.parte ?? "—"],
    [labels.pk, pkStr], [labels.status, stLabel],
    [labels.createdAt, fmtDate(item.created_at, locale)],
  ].map(([l, v]) => `<div style="display:flex;flex-direction:column;"><span style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:${BRAND.muted};margin-bottom:2px;">${l}</span><span style="font-size:11px;color:${BRAND.text};">${v}</span></div>`).join("");

  const statsHtml = [
    [labels.ppis, String(item.ppi_count ?? 0)],
    [labels.ncs, String(item.nc_count ?? 0)],
    [labels.tests, String(item.test_count ?? 0)],
  ].map(([l, v]) => `<div style="flex:1;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:10px 14px;"><div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:${BRAND.muted};margin-bottom:2px;">${l}</div><div style="font-size:18px;font-weight:800;color:${BRAND.primary};">${v}</div></div>`).join("");

  // Build sections
  const ppiSection = sectionHtml("PPI — Planos de Inspeção", ["Código", "Disciplina", "Estado"],
    data.ppis.map(p => [p.code, p.disciplina, statusDot(p.status)]));

  const testSection = sectionHtml("Ensaios / Testes", ["Nome", "Código", "Data", "Resultado", "Estado"],
    data.tests.map(t => [t.name, t.code, fmtDate(t.date, locale), statusDot(t.passFail), t.status]));

  const ncSection = sectionHtml("Não Conformidades", ["Código", "Descrição", "Gravidade", "Estado"],
    data.ncs.map(n => [n.code, n.description, n.severity, statusDot(n.status)]));

  const actSection = sectionHtml("Planeamento — Atividades", ["Descrição", "Zona", "Progresso", "Estado"],
    data.activities.map(a => [a.description, a.zone, `${a.progress}%`, statusDot(a.status)]));

  const topoReqSection = sectionHtml("Topografia — Pedidos", ["Tipo", "Descrição", "Estado"],
    data.topoRequests.map(r => [r.type, r.description, statusDot(r.status)]));

  const topoCtrlSection = sectionHtml("Topografia — Controlos", ["Elemento", "Zona", "Desvio", "Resultado"],
    data.topoControls.map(c => [c.element, c.zone, c.deviation, statusDot(c.result)]));

  const logo = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#2F4F75"/><path d="M16 4L6 9v7c0 5.25 4.25 10.15 10 11.35C21.75 26.15 26 21.25 26 16V9L16 4z" fill="white" fill-opacity="0.9"/><path d="M13 16l2 2 4-4" stroke="#2F4F75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${item.sector} — Atlas Work Item Consolidated</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
         font-size:12px; color:${BRAND.text}; background:${BRAND.white}; }
  @page { size:A4; margin:14mm 12mm; }
  @media print { .page-break { page-break-before:always; } }
</style>
</head>
<body>
  <div style="background:#0f1e37;color:#fff;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logo}
      <div>
        <div style="font-size:18px;font-weight:900;letter-spacing:0.1em;">ATLAS QMS</div>
        <div style="font-size:10px;opacity:0.7;">${labels.reportTitle} — Consolidado</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;">${item.sector}</div>
      <div style="font-size:10px;opacity:0.7;">${projectName}</div>
    </div>
  </div>
  ${projectInfoStripHtml()}

  <div style="font-size:20px;font-weight:800;color:${BRAND.primary};margin-bottom:4px;">${item.sector}</div>
  <div style="font-size:11px;color:${BRAND.muted};margin-bottom:16px;">${labels.project}: ${projectName}</div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:12px 16px;margin-bottom:16px;">
    ${infoRows}
  </div>

  <div style="display:flex;gap:16px;margin-bottom:16px;">${statsHtml}</div>

  ${ppiSection}
  ${testSection}
  ${ncSection}
  ${actSection}
  ${topoReqSection}
  ${topoCtrlSection}

  <div style="margin-top:20px;padding-top:8px;border-top:1px solid ${BRAND.border};display:flex;justify-content:space-between;font-size:8px;color:${BRAND.textLight};">
    <span>${labels.appName} · Quality Management System</span>
    <span>${item.sector} · ${stLabel} · Relatório Consolidado</span>
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportWorkItemConsolidatedPdf(
  item: WorkItemForExport,
  labels: WorkItemExportLabels,
  locale: string,
  projectName: string,
  data: ConsolidatedExportData,
): void {
  const html = buildConsolidatedHtml(item, labels, locale, projectName, data);
  printHtml(html, buildFilename(item, projectName));
}

export function exportWorkItemPdf(
  item: WorkItemForExport,
  labels: WorkItemExportLabels,
  locale: string,
  projectName: string,
): void {
  const emptyData: ConsolidatedExportData = {
    ppis: [], tests: [], ncs: [], activities: [], topoRequests: [], topoControls: [],
  };
  exportWorkItemConsolidatedPdf(item, labels, locale, projectName, emptyData);
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
    projectName, it.sector, it.disciplina_label ?? it.disciplina,
    it.obra ?? "", it.lote ?? "", it.elemento ?? "", it.parte ?? "",
    formatPk(it.pk_inicio, it.pk_fim), it.status_label ?? it.status,
    fmtDate(it.created_at, locale), it.ppi_count ?? "", it.nc_count ?? "", it.test_count ?? "",
  ]);
  const lines = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))];
  downloadCsv(lines.join("\r\n"), filename);
}
