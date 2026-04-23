/**
 * Supplier Export Service — Atlas QMS
 * Migrated to HTML template with fullPdfHeader for consistent institutional branding.
 */

import { fullPdfHeader } from "./pdfProjectHeader";
import { printHtml, sharedCss, buildReportFilename } from "./reportService";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import type { Supplier, SupplierDocument, SupplierMaterial, SupplierDetailMetrics } from "./supplierService";

interface ExportData {
  supplier: Supplier;
  metrics: SupplierDetailMetrics | null;
  docs: SupplierDocument[];
  materials: SupplierMaterial[];
  ncs: { code: string; title: string; severity: string; status: string }[];
  projectName: string;
  projectCode: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
  logoBase64?: string | null;
}

function esc(s?: string | null): string {
  if (!s) return "—";
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-PT");
}

const localCss = `
  .sup-section { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.15em; color:${ATLAS_PDF.colors.muted}; margin:16px 0 6px; border-bottom:2px solid ${ATLAS_PDF.colors.navy}; padding-bottom:3px; }
  .sup-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 20px; background:#f8fafc; border:1px solid ${ATLAS_PDF.colors.rule}; border-radius:6px; padding:10px 14px; margin-bottom:12px; }
  .sup-row label { font-size:7.5px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:${ATLAS_PDF.colors.muted}; }
  .sup-row .val { font-size:10px; color:${ATLAS_PDF.colors.ink}; font-weight:500; margin-top:1px; }
  table.sup-table { width:100%; border-collapse:collapse; font-size:10px; margin-top:6px; }
  table.sup-table th { background:${ATLAS_PDF.colors.navy}; color:#fff; padding:5px 8px; font-size:8px; font-weight:700; text-transform:uppercase; text-align:left; }
  table.sup-table td { padding:5px 8px; border-bottom:1px solid ${ATLAS_PDF.colors.rule}; }
  table.sup-table tr:nth-child(even) { background:${ATLAS_PDF.colors.tint}; }
`;

function infoRow(label: string, value: string): string {
  return `<div class="sup-row"><label>${label}</label><div class="val">${value}</div></div>`;
}

/** Build printable HTML (without opening print window) for in-app preview. */
export function buildSupplierDetailHtml(data: ExportData): string {
  const { supplier, metrics, docs, materials, ncs, projectName, projectCode, t, logoBase64 } = data;
  const today = new Date().toLocaleDateString("pt-PT");
  const docCode = `SUP-${projectCode}-${supplier.code ?? "FORN"}`;

  const header = fullPdfHeader(
    logoBase64 ?? null,
    projectName ?? projectCode,
    docCode,
    "0",
    today,
  );

  let body = "";

  body += `<div class="sup-section">${t("suppliers.detail.tabs.summary", { defaultValue: "Resumo" })}</div>`;
  body += `<div class="sup-grid">
    ${infoRow(t("suppliers.form.category"), supplier.category ? t(`suppliers.categories.${supplier.category}`, { defaultValue: supplier.category }) : "—")}
    ${infoRow(t("suppliers.form.nifCif"), esc(supplier.nif_cif))}
    ${infoRow(t("suppliers.form.country"), esc(supplier.country))}
    ${infoRow(t("suppliers.form.address"), esc(supplier.address))}
    ${infoRow(t("suppliers.form.contactName"), esc(supplier.contact_name))}
    ${infoRow(t("suppliers.form.contactEmail"), esc(supplier.contact_email))}
    ${infoRow(t("suppliers.form.contactPhone"), esc(supplier.contact_phone))}
    ${infoRow(t("common.status"), t(`suppliers.status.${supplier.status}`))}
    ${infoRow(t("suppliers.form.qualificationStatus"), t(`suppliers.qualificationStatus.${supplier.qualification_status ?? supplier.approval_status}`))}
    ${supplier.qualification_score != null ? infoRow(t("suppliers.form.qualificationScore"), `${supplier.qualification_score}/100`) : ""}
    ${supplier.notes ? infoRow(t("suppliers.form.notes"), esc(supplier.notes)) : ""}
  </div>`;

  if (metrics) {
    body += `<div class="sup-section">KPIs</div>`;
    body += `<div class="sup-grid">
      ${infoRow(t("suppliers.detail.openNCs"), String(metrics.open_nc_count))}
      ${infoRow(t("suppliers.detail.testsTotal"), String(metrics.tests_total))}
      ${infoRow(t("suppliers.detail.testsNC"), String(metrics.tests_nonconform))}
      ${infoRow(t("suppliers.detail.docsExpiring"), String(metrics.docs_expiring_30d))}
      ${infoRow(t("suppliers.detail.docsExpired"), String(metrics.docs_expired))}
    </div>`;
  }

  if (docs.length > 0) {
    body += `<div class="sup-section">${t("suppliers.detail.tabs.documents", { defaultValue: "Documentos" })}</div>`;
    body += `<table class="sup-table"><thead><tr><th>Tipo</th><th>Validade</th><th>Estado</th></tr></thead><tbody>`;
    docs.forEach(d => {
      body += `<tr><td>${t(`suppliers.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })}</td><td>${d.valid_to ? fmtDate(d.valid_to) : "—"}</td><td>${d.status}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  if (materials.length > 0) {
    body += `<div class="sup-section">${t("suppliers.detail.tabs.materials", { defaultValue: "Materiais" })}</div>`;
    body += `<table class="sup-table"><thead><tr><th>Material</th><th>Tipo</th><th>Preço</th></tr></thead><tbody>`;
    materials.forEach(m => {
      const price = m.unit_price != null ? `${m.unit_price} ${m.currency}` : "—";
      body += `<tr><td>${esc(m.material_name)}${m.is_primary ? " (Principal)" : ""}</td><td>—</td><td>${price}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  if (ncs.length > 0) {
    body += `<div class="sup-section">${t("suppliers.detail.tabs.ncs", { defaultValue: "Não Conformidades" })}</div>`;
    body += `<table class="sup-table"><thead><tr><th>Código</th><th>Título</th><th>Gravidade</th><th>Estado</th></tr></thead><tbody>`;
    ncs.forEach(nc => {
      body += `<tr><td>${esc(nc.code)}</td><td>${esc(nc.title)}</td><td>${t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}</td><td>${t(`nc.status.${nc.status}`, { defaultValue: nc.status })}</td></tr>`;
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

export function exportSupplierPdf(data: ExportData) {
  const html = buildSupplierDetailHtml(data);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  printHtml(html, `SUP_${data.projectCode}_${data.supplier.code ?? "FORN"}_${dateStr}.pdf`);
}

/** @deprecated */
function _legacyExportSupplierPdf(data: ExportData) {
  const { supplier, metrics, docs, materials, ncs, projectName, projectCode, t, logoBase64 } = data;
  const today = new Date().toLocaleDateString("pt-PT");
  const docCode = `SUP-${projectCode}-${supplier.code ?? "FORN"}`;

  const header = fullPdfHeader(
    logoBase64 ?? null,
    projectName ?? projectCode,
    docCode,
    "0",
    today,
  );

  let body = "";

  // Identification
  body += `<div class="sup-section">${t("suppliers.detail.tabs.summary", { defaultValue: "Resumo" })}</div>`;
  body += `<div class="sup-grid">
    ${infoRow(t("suppliers.form.category"), supplier.category ? t(`suppliers.categories.${supplier.category}`, { defaultValue: supplier.category }) : "—")}
    ${infoRow(t("suppliers.form.nifCif"), esc(supplier.nif_cif))}
    ${infoRow(t("suppliers.form.country"), esc(supplier.country))}
    ${infoRow(t("suppliers.form.address"), esc(supplier.address))}
    ${infoRow(t("suppliers.form.contactName"), esc(supplier.contact_name))}
    ${infoRow(t("suppliers.form.contactEmail"), esc(supplier.contact_email))}
    ${infoRow(t("suppliers.form.contactPhone"), esc(supplier.contact_phone))}
    ${infoRow(t("common.status"), t(`suppliers.status.${supplier.status}`))}
    ${infoRow(t("suppliers.form.qualificationStatus"), t(`suppliers.qualificationStatus.${supplier.qualification_status ?? supplier.approval_status}`))}
    ${supplier.qualification_score != null ? infoRow(t("suppliers.form.qualificationScore"), `${supplier.qualification_score}/100`) : ""}
    ${supplier.notes ? infoRow(t("suppliers.form.notes"), esc(supplier.notes)) : ""}
  </div>`;

  // KPIs
  if (metrics) {
    body += `<div class="sup-section">KPIs</div>`;
    body += `<div class="sup-grid">
      ${infoRow(t("suppliers.detail.openNCs"), String(metrics.open_nc_count))}
      ${infoRow(t("suppliers.detail.testsTotal"), String(metrics.tests_total))}
      ${infoRow(t("suppliers.detail.testsNC"), String(metrics.tests_nonconform))}
      ${infoRow(t("suppliers.detail.docsExpiring"), String(metrics.docs_expiring_30d))}
      ${infoRow(t("suppliers.detail.docsExpired"), String(metrics.docs_expired))}
    </div>`;
  }

  // Documents
  if (docs.length > 0) {
    body += `<div class="sup-section">${t("suppliers.detail.tabs.documents", { defaultValue: "Documentos" })}</div>`;
    body += `<table class="sup-table"><thead><tr><th>Tipo</th><th>Validade</th><th>Estado</th></tr></thead><tbody>`;
    docs.forEach(d => {
      body += `<tr><td>${t(`suppliers.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })}</td><td>${d.valid_to ? fmtDate(d.valid_to) : "—"}</td><td>${d.status}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  // Materials
  if (materials.length > 0) {
    body += `<div class="sup-section">${t("suppliers.detail.tabs.materials", { defaultValue: "Materiais" })}</div>`;
    body += `<table class="sup-table"><thead><tr><th>Material</th><th>Tipo</th><th>Preço</th></tr></thead><tbody>`;
    materials.forEach(m => {
      const price = m.unit_price != null ? `${m.unit_price} ${m.currency}` : "—";
      body += `<tr><td>${esc(m.material_name)}${m.is_primary ? " (Principal)" : ""}</td><td>—</td><td>${price}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  // NCs
  if (ncs.length > 0) {
    body += `<div class="sup-section">${t("suppliers.detail.tabs.ncs", { defaultValue: "Não Conformidades" })}</div>`;
    body += `<table class="sup-table"><thead><tr><th>Código</th><th>Título</th><th>Gravidade</th><th>Estado</th></tr></thead><tbody>`;
    ncs.forEach(nc => {
      body += `<tr><td>${esc(nc.code)}</td><td>${esc(nc.title)}</td><td>${t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })}</td><td>${t(`nc.status.${nc.status}`, { defaultValue: nc.status })}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  // Footer
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
  printHtml(html, `SUP_${projectCode}_${supplier.code ?? "FORN"}_${dateStr}.pdf`);
}
