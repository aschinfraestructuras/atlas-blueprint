/**
 * Material Export Service — Atlas QMS
 * Migrated to HTML template with fullPdfHeader for consistent institutional branding.
 */

import { fullPdfHeader } from "./pdfProjectHeader";
import { printHtml, sharedCss, buildReportFilename, exportToCSV } from "./reportService";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import { escapeHtml, esc } from "@/lib/utils/escapeHtml";
import { auditService } from "./auditService";
import type { Material, MaterialDocument, MaterialDetailMetrics, WorkItemMaterial } from "./materialService";

/** Build the printable HTML for the materials list (used by PdfPreviewDialog). */
export function buildMaterialsListHtml(
  materials: Material[],
  projectCode: string,
  logoBase64?: string | null,
  t: (k: string, opts?: Record<string, unknown>) => string = (k) => k,
): { html: string; filename: string; docCode: string } {
  const today = new Date().toLocaleDateString("pt-PT");
  const docCode = `MAT-${projectCode}-LISTA`;
  const header = fullPdfHeader(logoBase64 ?? null, projectCode || "Atlas QMS", docCode, "0", today);

  const columns = [
    t("materials.table.code"),
    t("common.name"),
    t("materials.form.category"),
    t("materials.form.specification"),
    t("materials.form.unit"),
    t("common.status"),
    t("materials.approval.title", { defaultValue: "Aprovação" }),
  ];

  const rows = materials.map(m => [
    m.code,
    m.name,
    t(`materials.categories.${m.category}`, { defaultValue: m.category }),
    m.specification ?? "—",
    m.unit ?? "—",
    t(`materials.status.${m.status}`),
    t(`materials.approval.statuses.${m.approval_status}`, { defaultValue: m.approval_status }),
  ]);

  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8"/><title>${docCode} — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>
${header}
<table class="atlas-table">
  <thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<div style="margin-top:8px;font-size:9px;color:#6B7280;">${rows.length} registo(s)</div>
<div class="atlas-footer"><span>Atlas QMS</span><span>${docCode}</span></div>
</body></html>`;

  return { html, filename: buildReportFilename("MAT", projectCode, "lista"), docCode };
}

/**
 * @deprecated Use `buildMaterialsListHtml` + `PdfPreviewDialog` for the new
 * institutional preview/download flow. Kept for backwards compatibility.
 */
export function exportMaterialsListPdf(
  materials: Material[],
  projectCode: string,
  logoBase64?: string | null,
  t: (k: string, opts?: Record<string, unknown>) => string = (k) => k,
) {
  const { html, filename } = buildMaterialsListHtml(materials, projectCode, logoBase64, t);
  printHtml(html, filename);
}

interface ExportData {
  material: Material;
  metrics: MaterialDetailMetrics | null;
  docs: MaterialDocument[];
  workItemLinks: WorkItemMaterial[];
  ncs: { code: string; title: string; severity: string; status: string }[];
  tests: { code: string; date: string; pass_fail: string; status: string }[];
  projectName: string;
  projectCode: string;
  logoBase64?: string | null;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

// esc and escapeHtml imported from @/lib/utils/escapeHtml

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-PT");
}

const localCss = `
  .mat-section { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.15em; color:${ATLAS_PDF.colors.muted}; margin:16px 0 6px; border-bottom:2px solid ${ATLAS_PDF.colors.navy}; padding-bottom:3px; }
  .mat-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; background:#f8fafc; border:1px solid ${ATLAS_PDF.colors.rule}; border-radius:6px; padding:10px 14px; margin-bottom:12px; }
  .mat-row label { font-size:7.5px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:${ATLAS_PDF.colors.muted}; }
  .mat-row .val { font-size:10px; color:${ATLAS_PDF.colors.ink}; font-weight:500; margin-top:1px; }
  table.mat-table { width:100%; border-collapse:collapse; font-size:10px; margin-top:6px; }
  table.mat-table th { background:${ATLAS_PDF.colors.navy}; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; text-align:left; }
  table.mat-table td { padding:5px 8px; border-bottom:1px solid ${ATLAS_PDF.colors.rule}; }
  table.mat-table tr:nth-child(even) { background:${ATLAS_PDF.colors.tint}; }
`;

function infoRow(label: string, value: string): string {
  return `<div class="mat-row"><label>${escapeHtml(label)}</label><div class="val">${escapeHtml(value)}</div></div>`;
}

/** Build the printable HTML (without opening a print window) for in-app preview. */
export function buildMaterialDetailHtml(data: ExportData): string {
  const { material, metrics, docs, workItemLinks, ncs, tests, projectName, projectCode, logoBase64, t } = data;
  const today = new Date().toLocaleDateString("pt-PT");
  const docCode = `MAT-${projectCode}-${material.code}`;

  const header = fullPdfHeader(
    logoBase64 ?? null,
    projectName ?? projectCode,
    docCode,
    "0",
    today,
  );

  let body = "";

  // Identification
  body += `<div class="mat-section">${t("materials.detail.tabs.summary", { defaultValue: "Resumo" })}</div>`;
  body += `<div class="mat-grid">
    ${infoRow(t("materials.form.category"), t(`materials.categories.${material.category}`, { defaultValue: material.category }))}
    ${infoRow(t("materials.form.subcategory"), esc(material.subcategory))}
    ${infoRow(t("materials.form.specification"), esc(material.specification))}
    ${infoRow(t("materials.form.unit"), esc(material.unit))}
    ${infoRow(t("materials.form.normativeRefs"), esc(material.normative_refs))}
    ${infoRow(t("materials.form.acceptanceCriteria"), esc(material.acceptance_criteria))}
    ${infoRow(t("common.status"), t(`materials.status.${material.status}`))}
    ${infoRow(t("materials.approval.status"), t(`materials.approval.statuses.${material.approval_status}`, { defaultValue: material.approval_status }))}
    ${material.rejection_reason ? infoRow(t("materials.approval.rejectionReason"), esc(material.rejection_reason)) : ""}
  </div>`;

  if (metrics) {
    body += `<div class="mat-section">KPIs</div>`;
    body += `<div class="mat-grid">
      ${infoRow(t("materials.detail.suppliersCount"), String(metrics.suppliers_count))}
      ${infoRow(t("materials.detail.testsTotal"), String(metrics.tests_total))}
      ${infoRow(t("materials.detail.testsNC"), String(metrics.tests_nonconform))}
      ${infoRow(t("materials.detail.ncOpen"), String(metrics.nc_open_count))}
      ${infoRow(t("materials.detail.docsExpiring"), String(metrics.docs_expiring_30d))}
      ${infoRow(t("materials.detail.docsExpired"), String(metrics.docs_expired))}
      ${infoRow(t("materials.detail.workItems"), String(metrics.work_items_count))}
    </div>`;
  }

  if (docs.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.documents", { defaultValue: "Documentos" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>Tipo</th><th>Validade</th><th>Estado</th></tr></thead><tbody>`;
    docs.forEach(d => {
      body += `<tr><td>${t(`materials.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })}</td><td>${d.valid_to ? fmtDate(d.valid_to) : "—"}</td><td>${d.status}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  if (tests.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.tests", { defaultValue: "Ensaios" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>Código</th><th>Data</th><th>Resultado</th></tr></thead><tbody>`;
    tests.slice(0, 20).forEach(tr => {
      body += `<tr><td>${esc(tr.code)}</td><td>${fmtDate(tr.date)}</td><td>${esc(tr.pass_fail)}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  if (ncs.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.ncs", { defaultValue: "Não Conformidades" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>Código</th><th>Título</th><th>Gravidade</th><th>Estado</th></tr></thead><tbody>`;
    ncs.forEach(nc => {
      body += `<tr><td>${esc(nc.code)}</td><td>${esc(nc.title)}</td><td>${t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}</td><td>${t(`nc.status.${nc.status}`, { defaultValue: nc.status })}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  if (workItemLinks.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.workItems", { defaultValue: "Aplicação em Obra" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>WI</th><th>Lote</th><th>Quantidade</th></tr></thead><tbody>`;
    workItemLinks.slice(0, 20).forEach(wl => {
      body += `<tr><td>${wl.work_item_id.substring(0, 8)}…</td><td>${esc(wl.lot_ref)}</td><td>${wl.quantity ?? "—"} ${wl.unit ?? ""}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  body += `<div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;font-size:9px;text-align:center;">
    <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Elaborado por</div>
    <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Verificado por</div>
    <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Aprovado por</div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"/><title>${docCode} — Atlas QMS</title>
<style>${sharedCss()}${localCss}</style></head>
<body>
${header}
${body}
<div class="atlas-footer">
  <span>Atlas QMS · Sistema de Gestão da Qualidade</span>
  <span>${docCode} · Gerado em ${today}</span>
</div>
</body></html>`;
}

export async function exportMaterialPdf(data: ExportData) {
  const html = buildMaterialDetailHtml(data);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  printHtml(html, `MAT_${data.projectCode}_${data.material.code}_${dateStr}.pdf`);

  await auditService.log({
    projectId: data.material.project_id,
    entity: "materials",
    entityId: data.material.id,
    action: "EXPORT",
    module: "materials",
    description: `PDF exportado: ${data.material.code}`,
  }).catch(() => null);
}

/** @deprecated kept for ABI; use exportMaterialPdf above */
async function _legacyExportMaterialPdf(data: ExportData) {
  const { material, metrics, docs, workItemLinks, ncs, tests, projectName, projectCode, logoBase64, t } = data;
  const today = new Date().toLocaleDateString("pt-PT");
  const docCode = `MAT-${projectCode}-${material.code}`;

  const header = fullPdfHeader(
    logoBase64 ?? null,
    projectName ?? projectCode,
    docCode,
    "0",
    today,
  );

  let body = "";

  // Identification
  body += `<div class="mat-section">${t("materials.detail.tabs.summary", { defaultValue: "Resumo" })}</div>`;
  body += `<div class="mat-grid">
    ${infoRow(t("materials.form.category"), t(`materials.categories.${material.category}`, { defaultValue: material.category }))}
    ${infoRow(t("materials.form.subcategory"), esc(material.subcategory))}
    ${infoRow(t("materials.form.specification"), esc(material.specification))}
    ${infoRow(t("materials.form.unit"), esc(material.unit))}
    ${infoRow(t("materials.form.normativeRefs"), esc(material.normative_refs))}
    ${infoRow(t("materials.form.acceptanceCriteria"), esc(material.acceptance_criteria))}
    ${infoRow(t("common.status"), t(`materials.status.${material.status}`))}
    ${infoRow(t("materials.approval.status"), t(`materials.approval.statuses.${material.approval_status}`, { defaultValue: material.approval_status }))}
    ${material.rejection_reason ? infoRow(t("materials.approval.rejectionReason"), esc(material.rejection_reason)) : ""}
  </div>`;

  // KPIs
  if (metrics) {
    body += `<div class="mat-section">KPIs</div>`;
    body += `<div class="mat-grid">
      ${infoRow(t("materials.detail.suppliersCount"), String(metrics.suppliers_count))}
      ${infoRow(t("materials.detail.testsTotal"), String(metrics.tests_total))}
      ${infoRow(t("materials.detail.testsNC"), String(metrics.tests_nonconform))}
      ${infoRow(t("materials.detail.ncOpen"), String(metrics.nc_open_count))}
      ${infoRow(t("materials.detail.docsExpiring"), String(metrics.docs_expiring_30d))}
      ${infoRow(t("materials.detail.docsExpired"), String(metrics.docs_expired))}
      ${infoRow(t("materials.detail.workItems"), String(metrics.work_items_count))}
    </div>`;
  }

  // Documents
  if (docs.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.documents", { defaultValue: "Documentos" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>Tipo</th><th>Validade</th><th>Estado</th></tr></thead><tbody>`;
    docs.forEach(d => {
      body += `<tr><td>${t(`materials.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })}</td><td>${d.valid_to ? fmtDate(d.valid_to) : "—"}</td><td>${d.status}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  // Tests
  if (tests.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.tests", { defaultValue: "Ensaios" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>Código</th><th>Data</th><th>Resultado</th></tr></thead><tbody>`;
    tests.slice(0, 20).forEach(tr => {
      body += `<tr><td>${esc(tr.code)}</td><td>${fmtDate(tr.date)}</td><td>${esc(tr.pass_fail)}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  // NCs
  if (ncs.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.ncs", { defaultValue: "Não Conformidades" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>Código</th><th>Título</th><th>Gravidade</th><th>Estado</th></tr></thead><tbody>`;
    ncs.forEach(nc => {
      body += `<tr><td>${esc(nc.code)}</td><td>${esc(nc.title)}</td><td>${t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}</td><td>${t(`nc.status.${nc.status}`, { defaultValue: nc.status })}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  // Work Items
  if (workItemLinks.length > 0) {
    body += `<div class="mat-section">${t("materials.detail.tabs.workItems", { defaultValue: "Aplicação em Obra" })}</div>`;
    body += `<table class="mat-table"><thead><tr><th>WI</th><th>Lote</th><th>Quantidade</th></tr></thead><tbody>`;
    workItemLinks.slice(0, 20).forEach(wl => {
      body += `<tr><td>${wl.work_item_id.substring(0, 8)}…</td><td>${esc(wl.lot_ref)}</td><td>${wl.quantity ?? "—"} ${wl.unit ?? ""}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  // Signatures
  body += `<div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;font-size:9px;text-align:center;">
    <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Elaborado por</div>
    <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Verificado por</div>
    <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Aprovado por</div>
  </div>`;

  const html = `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"/><title>${docCode} — Atlas QMS</title>
<style>${sharedCss()}${localCss}</style></head>
<body>
${header}
${body}
<div class="atlas-footer">
  <span>Atlas QMS · Sistema de Gestão da Qualidade</span>
  <span>${docCode} · Gerado em ${today}</span>
</div>
</body></html>`;

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  printHtml(html, `MAT_${projectCode}_${material.code}_${dateStr}.pdf`);

  await auditService.log({
    projectId: material.project_id,
    entity: "materials",
    entityId: material.id,
    action: "EXPORT",
    module: "materials",
    description: `PDF exportado: ${material.code}`,
  }).catch(() => null);
}

// ── FAV PDF Export (Print Window) ────────────────────────────────────────────

export function exportFavPdf(
  material: Material,
  ncs: { code: string; title: string; severity: string; status: string }[],
  projectName: string,
  projectCode: string,
  logoBase64?: string | null,
) {
  const techComparison = (material as any).technical_comparison ?? [];
  const favDocs = (material as any).fav_documents ?? [];

  const defaultDocs = [
    "Ficha técnica do produto",
    "Declaração de Desempenho (DoP) / Marcação CE",
    "Certificado de ensaio de fábrica (FPC)",
    "Certificado de calibração do equipamento (se aplicável)",
    "Amostra física (se aplicável)",
  ];

  const docsToShow = favDocs.length > 0 ? favDocs : defaultDocs.map((d: string) => ({ label: d, checked: false }));

  const techRows = techComparison.map((r: any) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${r.parameter ?? ""}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${r.specified ?? ""}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${r.proposed ?? ""}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${r.compliant ? "✅" : "❌"}</td>
    </tr>
  `).join("");

  const docRows = docsToShow.map((d: any) => {
    const label = typeof d === "string" ? d : d.label;
    const checked = typeof d === "string" ? false : d.checked;
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${checked ? "☑" : "☐"} ${label}</td>
    </tr>`;
  }).join("");

  const today = new Date().toLocaleDateString("pt-PT");
  const header = fullPdfHeader(
    logoBase64 ?? null,
    projectName ?? projectCode,
    material.pame_code ?? material.code,
    "0",
    today,
  );

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>FAV — ${material.pame_code ?? material.code}</title>
<style>
  @media print { body { margin: 0; } }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; padding: 20px; }
  @page { size: A4 portrait; margin: 15mm; }
  table { border-collapse: collapse; width: 100%; }
</style>
</head><body>
  ${header}

  <div style="padding-top:10px;">
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;font-weight:700;width:140px;border:1px solid #d1d5db;background:#f3f4f6;">Material</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.name}</td>
        <td style="padding:6px 8px;font-weight:700;width:100px;border:1px solid #d1d5db;background:#f3f4f6;">Código</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.code}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Categoria</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.category}</td>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Unidade</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.unit ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Especificação</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${material.specification ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Referências Normativas</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${material.normative_refs ?? "—"}</td>
      </tr>
      ${material.submitted_at ? `<tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Data Submissão</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${new Date(material.submitted_at).toLocaleDateString("pt-PT")}</td>
      </tr>` : ""}
    </table>

    ${techComparison.length > 0 ? `
    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">A — Comparação Técnica: Especificado vs. Proposto</div>
    <table style="margin-bottom:20px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Parâmetro</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Especificado</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Proposto</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;width:60px;">Conf.</th>
        </tr>
      </thead>
      <tbody>${techRows}</tbody>
    </table>` : ""}

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">B — Documentos Submetidos</div>
    <table style="margin-bottom:30px;">
      <tbody>${docRows}</tbody>
    </table>

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">C — Decisão</div>
    <div style="display:flex;gap:20px;margin-bottom:30px;font-size:13px;">
      <span>☐ Aprovado</span>
      <span>☐ Aprovado com condições</span>
      <span>☐ Rejeitado</span>
    </div>
    ${material.rejection_reason ? `<div style="margin-bottom:20px;font-size:11px;"><strong>Motivo:</strong> ${material.rejection_reason}</div>` : ""}

    <div style="display:flex;justify-content:space-between;margin-top:40px;">
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">TQ / Inspector</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ________________</div>
        <div style="font-size:10px;margin-top:4px;">Data: _______ &nbsp; Assinatura: ________________</div>
      </div>
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">Fiscalização</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ________________</div>
        <div style="font-size:10px;margin-top:4px;">Data: _______ &nbsp; Assinatura: ________________</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;font-size:8px;color:#999;margin-top:20px;padding:8px;">
    Atlas QMS · ${escapeHtml(projectCode)} · Gerado em ${new Date().toLocaleString("pt-PT")}
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}
