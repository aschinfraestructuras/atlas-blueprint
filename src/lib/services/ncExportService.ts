/**
 * ncExportService — Exportação PDF de Não Conformidades (HTML template)
 *
 * Migrated from jsPDF to HTML print — consistent with all other Atlas modules.
 * Follows PG-PF17A-03 RNC structure.
 */

import {
  printHtml, buildReportFilename, infoGridHtml, sharedCss, footerHtml,
  type ReportMeta, type ReportLabels,
} from "./reportService";
import { fullPdfHeader } from "./pdfProjectHeader";
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

function esc(s?: string | null): string {
  if (!s) return "—";
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export interface NCExportLabels extends Record<string, string> {
  appName: string;
  reportTitle: string;
  bulkTitle: string;
  wiSummaryTitle: string;
  generatedOn: string;
  page: string;
  of: string;
  code: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  origin: string;
  status: string;
  responsible: string;
  assignedTo: string;
  detectedAt: string;
  dueDate: string;
  closureDate: string;
  reference: string;
  workItem: string;
  capaTitle: string;
  correction: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  verificationMethod: string;
  verificationResult: string;
  verifiedBy: string;
  verifiedAt: string;
  wiSector: string;
  wiBySeverity: string;
  wiByStatus: string;
  wiOpenNcs: string;
  severity_minor: string;
  severity_major: string;
  severity_critical: string;
  status_draft: string;
  status_open: string;
  status_in_progress: string;
  status_pending_verification: string;
  status_closed: string;
  status_archived: string;
  origin_manual: string;
  origin_ppi: string;
  origin_test: string;
  origin_document: string;
  origin_audit: string;
}

// ─── Severity / Status badge helpers ──────────────────────────────────────────

const SEV_COLORS: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "#FEE2E2", fg: "#DC2626" },
  high:     { bg: "#FEE2E2", fg: "#DC2626" },
  major:    { bg: "#FEF3C7", fg: "#D97706" },
  medium:   { bg: "#FEF3C7", fg: "#D97706" },
  minor:    { bg: "#F3F4F6", fg: "#6B7280" },
  low:      { bg: "#F3F4F6", fg: "#6B7280" },
};

const ST_COLORS: Record<string, { bg: string; fg: string }> = {
  open:                 { bg: "#FEE2E2", fg: "#DC2626" },
  in_progress:          { bg: "#DBEAFE", fg: "#2563EB" },
  pending_verification: { bg: "#FEF3C7", fg: "#B45309" },
  closed:               { bg: "#D1FAE5", fg: "#16A34A" },
  archived:             { bg: "#F3F4F6", fg: "#9CA3AF" },
  draft:                { bg: "#F3F4F6", fg: "#9CA3AF" },
};

function badge(text: string, colors: { bg: string; fg: string }): string {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;background:${colors.bg};color:${colors.fg};">${text}</span>`;
}

// ─── NC-specific CSS ──────────────────────────────────────────────────────────

function ncCss(): string {
  return `
.nc-section { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.15em; color:#6B7280; margin:18px 0 8px; border-bottom:2px solid #E5E7EB; padding-bottom:4px; }
.nc-field-lbl { font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#6B7280; margin-bottom:2px; }
.nc-field-val { font-size:11px; color:#111827; line-height:1.5; white-space:pre-wrap; margin-bottom:10px; }
.nc-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; }
.nc-badges { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.nc-sig-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:24px; border-top:1px solid #E5E7EB; padding-top:16px; }
.nc-sig-box { border:1px solid #E5E7EB; border-radius:6px; padding:12px; min-height:70px; }
.nc-sig-lbl { font-size:8px; font-weight:700; text-transform:uppercase; color:#6B7280; letter-spacing:.1em; margin-bottom:4px; }
.nc-sig-line { border-bottom:1px solid #CBD5E1; margin-top:36px; }
`;
}

// ─── Render single NC HTML ────────────────────────────────────────────────────

function renderNCHtml(nc: NonConformity, labels: NCExportLabels): string {
  const sevLabel = (labels as Record<string, string>)[`severity_${nc.severity}`] ?? nc.severity;
  const stLabel = (labels as Record<string, string>)[`status_${nc.status}`] ?? nc.status;
  const originLabel = (labels as Record<string, string>)[`origin_${nc.origin}`] ?? nc.origin;
  const sevCol = SEV_COLORS[nc.severity] ?? SEV_COLORS.minor;
  const stCol = ST_COLORS[nc.status] ?? ST_COLORS.draft;

  const classificationLabel = nc.classification === "C" ? "Correção (C)" :
    nc.classification === "AC" ? "Ação Corretiva (AC)" :
    nc.classification ?? "—";

  const correctionTypeLabel = nc.correction_type ?? "—";

  const rootCauseMethodLabel = nc.root_cause_method ?? "—";

  // 1. Identificação
  let html = `
  <div class="nc-section">1. Identificação</div>
  <div class="nc-badges">
    ${badge(sevLabel, sevCol)}
    ${badge(stLabel, stCol)}
    ${badge(originLabel, { bg: "#EFF6FF", fg: "#2563EB" })}
    ${nc.classification ? badge(classificationLabel, { bg: nc.classification === "AC" ? "#FEF3C7" : "#DBEAFE", fg: nc.classification === "AC" ? "#B45309" : "#2563EB" }) : ""}
  </div>`;

  html += infoGridHtml([
    [labels.code, nc.code ?? "—"],
    [labels.title, nc.title ?? "—"],
    [labels.severity, sevLabel],
    [labels.category, nc.category_outro ?? nc.category],
    [labels.origin, originLabel],
    ["Classificação CE", classificationLabel],
    [labels.detectedAt, dateStr(nc.detected_at)],
    [labels.dueDate, dateStr(nc.due_date)],
    [labels.responsible, nc.responsible ?? "—"],
    [labels.assignedTo, nc.assigned_to ?? "—"],
  ]);

  // 2. Localização
  html += `<div class="nc-section">2. Localização</div>`;
  html += infoGridHtml([
    ["PK / Zona", nc.location_pk ?? "—"],
    ["Disciplina", nc.discipline ?? nc.discipline_outro ?? "—"],
    ["PPI Associado", nc.ppi_instance_id ? `PPI ${nc.ppi_instance_id.slice(0, 8)}` : "—"],
    [labels.workItem, nc.work_item_id ? nc.work_item_id.slice(0, 8) : "—"],
  ]);

  // 3. Descrição detalhada
  html += `<div class="nc-section">3. Descrição da Não Conformidade</div>`;
  html += `<div class="nc-field-val">${esc(nc.description)}</div>`;

  // 4. Requisito violado
  html += `<div class="nc-section">4. Requisito Violado</div>`;
  html += `<div class="nc-field-val">${esc(nc.violated_requirement) || "—"}</div>`;
  if (nc.reference) {
    html += `<div class="nc-field-lbl">Referência</div><div class="nc-field-val">${esc(nc.reference)}</div>`;
  }

  // 5. CAPA — Correcção imediata
  html += `<div class="nc-section">5. Correcção Imediata (CAPA)</div>`;
  html += `<div class="nc-grid">
    <div><div class="nc-field-lbl">Tipo de disposição</div><div class="nc-field-val">${esc(correctionTypeLabel)}</div></div>
    <div><div class="nc-field-lbl">Prazo conclusão</div><div class="nc-field-val">${dateStr(nc.actual_completion_date)}</div></div>
  </div>`;
  html += `<div class="nc-field-lbl">${labels.correction}</div><div class="nc-field-val">${esc(nc.correction)}</div>`;

  // 6. CAPA — Análise de causa raiz
  html += `<div class="nc-section">6. Análise de Causa Raiz</div>`;
  html += `<div class="nc-field-lbl">Método</div><div class="nc-field-val">${esc(rootCauseMethodLabel)}</div>`;
  html += `<div class="nc-field-lbl">${labels.rootCause}</div><div class="nc-field-val">${esc(nc.root_cause)}</div>`;

  // 7. CAPA — Acção correctiva
  html += `<div class="nc-section">7. Acção Correctiva</div>`;
  html += `<div class="nc-field-val">${esc(nc.corrective_action)}</div>`;
  if (nc.ac_efficacy_indicator) {
    html += `<div class="nc-field-lbl">Indicador de eficácia</div><div class="nc-field-val">${esc(nc.ac_efficacy_indicator)}</div>`;
  }

  // 8. CAPA — Acção preventiva
  html += `<div class="nc-section">8. Acção Preventiva</div>`;
  html += `<div class="nc-field-val">${esc(nc.preventive_action)}</div>`;
  if (nc.efficacy_analysis) {
    html += `<div class="nc-field-lbl">Análise de eficácia</div><div class="nc-field-val">${esc(nc.efficacy_analysis)}</div>`;
  }
  if (nc.deviation_justification) {
    html += `<div class="nc-field-lbl">Justificação de desvio</div><div class="nc-field-val">${esc(nc.deviation_justification)}</div>`;
  }

  // 9. Verificação e fecho
  html += `<div class="nc-section">9. Verificação e Fecho</div>`;
  html += infoGridHtml([
    [labels.verificationMethod, nc.verification_method ?? "—"],
    [labels.verificationResult, nc.verification_result ?? "—"],
    [labels.verifiedBy, nc.verified_by ?? "—"],
    [labels.verifiedAt, dateTimeStr(nc.verified_at)],
    ["Fecho", dateStr(nc.closure_date)],
    ["Validado F/IP", nc.fip_validated_by ? `${nc.fip_validated_by} — ${dateStr(nc.fip_validated_at)}` : "—"],
  ]);

  // 10. Assinaturas
  html += `<div class="nc-sig-grid">
    <div class="nc-sig-box">
      <div class="nc-sig-lbl">Emitido por (Empreiteiro)</div>
      <div class="nc-sig-line"></div>
    </div>
    <div class="nc-sig-box">
      <div class="nc-sig-lbl">Aprovado (Dono de Obra)</div>
      <div class="nc-sig-line"></div>
    </div>
    <div class="nc-sig-box">
      <div class="nc-sig-lbl">Validado (Fiscalização / IP)</div>
      <div class="nc-sig-line"></div>
    </div>
  </div>`;

  return html;
}

// ─── Full NC PDF document ─────────────────────────────────────────────────────

function buildNCDocument(
  bodyHtml: string,
  nc: NonConformity | null,
  meta: ReportMeta,
  logoBase64?: string | null,
): string {
  const docCode = nc?.code ?? "RNC";
  const today = new Date().toLocaleDateString("pt-PT");

  const header = fullPdfHeader(
    logoBase64 ?? null,
    meta.projectName ?? meta.projectCode,
    docCode,
    "0",
    today,
  );

  return `<!DOCTYPE html>
<html lang="${meta.locale}">
<head>
<meta charset="UTF-8"/>
<title>RNC — ${docCode} — Atlas QMS</title>
<style>${sharedCss()}${ncCss()}</style>
</head>
<body>
${header}
${bodyHtml}
<div class="atlas-footer">
  <span>Atlas QMS · Sistema de Gestão da Qualidade</span>
  <span>RNC-${meta.projectCode}-${docCode}</span>
</div>
</body>
</html>`;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/** PDF individual */
export async function exportNCPdf(
  nc: NonConformity,
  labels: NCExportLabels,
  projectName: string,
  logoBase64?: string | null,
  projectCode?: string,
): Promise<void> {
  const meta: ReportMeta = {
    projectName,
    projectCode: projectCode ?? "—",
    locale: "pt",
  };
  const bodyHtml = renderNCHtml(nc, labels);
  const html = buildNCDocument(bodyHtml, nc, meta, logoBase64);
  const code = (nc.code ?? nc.reference ?? nc.id.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "_");
  printHtml(html, buildReportFilename("RNC", meta.projectCode, code));
}

/** PDF bulk */
export async function exportNCBulkPdf(
  ncs: NonConformity[],
  labels: NCExportLabels,
  projectName: string,
  logoBase64?: string | null,
  projectCode?: string,
): Promise<void> {
  if (ncs.length === 0) return;

  const meta: ReportMeta = {
    projectName,
    projectCode: projectCode ?? "—",
    locale: "pt",
  };

  const today = new Date().toLocaleDateString("pt-PT");
  const header = fullPdfHeader(logoBase64 ?? null, meta.projectName ?? meta.projectCode, "RNC-CONSOLIDADO", "0", today);

  const bodies = ncs.map((nc, idx) => {
    const ncHtml = renderNCHtml(nc, labels);
    return `${idx > 0 ? '<div class="page-break"></div>' : ""}
    <div style="font-size:10px;font-weight:700;color:#6B7280;margin-bottom:8px;">NC ${idx + 1} / ${ncs.length}</div>
    ${ncHtml}`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>RNC Consolidado — Atlas QMS</title>
<style>${sharedCss()}${ncCss()}</style>
</head>
<body>
${header}
${bodies}
<div class="atlas-footer">
  <span>Atlas QMS · Sistema de Gestão da Qualidade</span>
  <span>RNC-BULK-${meta.projectCode}</span>
</div>
</body>
</html>`;

  printHtml(html, buildReportFilename("RNC", meta.projectCode, "consolidado"));
}

/** Resumo por Work Item */
export async function exportNCWorkItemSummaryPdf(
  ncs: NonConformity[],
  labels: NCExportLabels,
  projectName: string,
  workItemSector: string,
  logoBase64?: string | null,
  projectCode?: string,
): Promise<void> {
  if (ncs.length === 0) return;

  const meta: ReportMeta = {
    projectName,
    projectCode: projectCode ?? "—",
    locale: "pt",
  };
  const today = new Date().toLocaleDateString("pt-PT");
  const header = fullPdfHeader(logoBase64 ?? null, `LINHA DO SUL — ${meta.projectCode}`, "RNC-WI-RESUMO", "0", today);

  const severities = [
    { key: "critical", label: labels.severity_critical, color: "#DC2626" },
    { key: "major", label: labels.severity_major, color: "#D97706" },
    { key: "minor", label: labels.severity_minor, color: "#6B7280" },
  ];

  let summaryHtml = `<h2 style="font-size:14px;font-weight:700;margin-bottom:4px;">${labels.wiSummaryTitle}</h2>
    <p style="font-size:10px;color:#6B7280;margin-bottom:16px;">${labels.wiSector}: ${esc(workItemSector)} · ${labels.generatedOn}: ${today}</p>`;

  summaryHtml += `<div class="nc-section">${labels.wiBySeverity}</div>`;
  severities.forEach(({ key, label, color }) => {
    const cnt = ncs.filter(n => n.severity === key).length;
    summaryHtml += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${color};"></span>
      <span style="font-size:11px;font-weight:600;">${label}: ${cnt}</span>
    </div>`;
  });

  const openNcs = ncs.filter(n => !["closed", "archived"].includes(n.status));
  if (openNcs.length > 0) {
    summaryHtml += `<div class="nc-section">${labels.wiOpenNcs} (${openNcs.length})</div>
    <table class="atlas-table">
      <thead><tr><th>Código</th><th>Título</th><th>Gravidade</th><th>Prazo</th></tr></thead>
      <tbody>${openNcs.map(nc => {
        const overdue = nc.due_date && new Date(nc.due_date) < new Date() && nc.status !== "closed";
        return `<tr>
          <td style="font-weight:600;${overdue ? "color:#DC2626;" : ""}">${nc.code ?? "—"}</td>
          <td>${esc((nc.title ?? nc.description).slice(0, 80))}</td>
          <td>${badge((labels as any)[`severity_${nc.severity}`] ?? nc.severity, SEV_COLORS[nc.severity] ?? SEV_COLORS.minor)}</td>
          <td style="${overdue ? "color:#DC2626;font-weight:600;" : ""}">${dateStr(nc.due_date)}</td>
        </tr>`;
      }).join("")}</tbody>
    </table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Resumo NC WI — Atlas QMS</title>
<style>${sharedCss()}${ncCss()}</style>
</head>
<body>
${header}
${summaryHtml}
<div class="atlas-footer">
  <span>Atlas QMS · Sistema de Gestão da Qualidade</span>
  <span>RNC-WI-${meta.projectCode}</span>
</div>
</body>
</html>`;

  const sector = workItemSector.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20);
  printHtml(html, buildReportFilename("RNC", meta.projectCode, `WI_${sector}`));
}
