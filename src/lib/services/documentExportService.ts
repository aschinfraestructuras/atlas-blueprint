/**
 * Document Export Service
 * PDF export for individual documents and filtered lists.
 * Supports FORM docs (with form_data) and FILE docs.
 * Uses styled print window with Atlas branding.
 */

import type { Document, DocumentVersion } from "./documentService";
import { auditService } from "./auditService";
import { projectInfoStripHtml } from "./pdfProjectHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocExportLabels {
  appName: string;
  reportTitle: string;
  listReportTitle: string;
  generatedOn: string;
  page: string;
  of: string;
  // fields
  code: string;
  title: string;
  type: string;
  disciplina: string;
  revision: string;
  status: string;
  createdAt: string;
  approvedAt: string;
  approvedBy: string;
  version: string;
  fileName: string;
  fileSize: string;
  // statuses
  statuses: Record<string, string>;
  // types
  docTypes: Record<string, string>;
  // disciplines
  disciplinas: Record<string, string>;
  // versions
  versionsTitle: string;
  versionNo: string;
  changeDescription: string;
  uploadedAt: string;
  // form
  formDataTitle?: string;
  projectName?: string;
  projectCode?: string;
  issuedAt?: string;
  createdBy?: string;
}

// ─── Brand colours ────────────────────────────────────────────────────────────

const B = {
  primary: "#2F4F75",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  white: "#FFFFFF",
  text: "#111827",
  textLight: "#6B7280",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale === "pt" ? "pt-PT" : "es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch { return iso.slice(0, 10); }
}

function sanitize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function formatBytes(b: number | null | undefined): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/** Build human-friendly filename: {projectCode}_{docCode}_{slugTitle}_Rev{revision}_{date}.pdf */
export function buildDocFilename(doc: Document, projectName: string, projectCode?: string): string {
  const proj = sanitize(projectCode || projectName);
  const code = sanitize(doc.code || `DOC-${doc.id.slice(0, 8)}`);
  const titleSlug = sanitize(doc.title).slice(0, 30);
  const rev = doc.revision ? `Rev${sanitize(doc.revision)}` : "Rev0";
  const date = new Date().toISOString().slice(0, 10);
  return `${proj}_${code}_${titleSlug}_${rev}_${date}.pdf`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
       font-size: 12px; color: ${B.text}; background: ${B.white}; }
@page { size: A4; margin: 14mm 12mm; }
@media print { .no-print { display:none; } }

.header { display:flex; align-items:flex-start; justify-content:space-between;
          padding-bottom:10px; border-bottom:3px solid ${B.primary}; margin-bottom:16px; }
.brand  { display:flex; align-items:center; gap:10px; }
.brand-bar { width:6px; height:40px; background:${B.primary}; border-radius:3px; }
.brand-logo { height:40px; width:40px; object-fit:contain; border-radius:6px; }
.brand-text .app { font-size:18px; font-weight:800; color:${B.primary}; letter-spacing:-.5px; }
.brand-text .sub { font-size:9px; font-weight:600; color:${B.muted}; text-transform:uppercase; letter-spacing:.1em; }
.meta { text-align:right; }
.meta .report-title { font-size:13px; font-weight:700; color:${B.primary}; }
.meta .gen { font-size:9px; color:${B.textLight}; margin-top:3px; }
.meta .project { font-size:10px; color:${B.text}; font-weight:600; margin-top:2px; }

.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px;
             background:${B.bg}; border:1px solid ${B.border};
             border-radius:8px; padding:12px 16px; margin-bottom:16px; }
.info-row { display:flex; flex-direction:column; }
.info-label { font-size:8px; font-weight:700; text-transform:uppercase;
              letter-spacing:.12em; color:${B.muted}; margin-bottom:2px; }
.info-value { font-size:11px; color:${B.text}; }
.status-badge { display:inline-block; padding:2px 8px; border-radius:20px;
                font-size:10px; font-weight:700;
                background:${B.primary}20; color:${B.primary}; }

.section-title { font-size:9px; font-weight:800; text-transform:uppercase;
                 letter-spacing:.14em; color:${B.muted}; margin:16px 0 8px;
                 padding-bottom:4px; border-bottom:1px solid ${B.border}; }
table.list { width:100%; border-collapse:collapse; }
table.list thead tr { background:${B.primary}; color:${B.white}; }
table.list thead th { padding:6px 6px; font-size:9px; font-weight:700;
                      text-transform:uppercase; letter-spacing:.1em; text-align:left; }
table.list tbody tr { border-bottom:1px solid ${B.border}; }
table.list tbody tr:nth-child(even) { background:${B.bg}; }
table.list td { padding:5px 6px; font-size:11px; }

.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 20px;
             margin-top:8px; }
.form-field { margin-bottom:6px; }
.form-field-label { font-size:9px; font-weight:700; text-transform:uppercase;
                    letter-spacing:.1em; color:${B.muted}; margin-bottom:2px; }
.form-field-value { font-size:11px; color:${B.text}; padding:4px 8px;
                    background:${B.bg}; border:1px solid ${B.border};
                    border-radius:4px; min-height:20px; }
.form-field-full { grid-column: 1 / -1; }

.footer { margin-top:20px; padding-top:8px; border-top:1px solid ${B.border};
          display:flex; justify-content:space-between; font-size:8px; color:${B.textLight}; }
`;

// ─── Form data rendering ──────────────────────────────────────────────────────

interface FormField {
  key: string;
  label?: string;
  label_pt?: string;
  label_es?: string;
  type?: string;
  options?: string[];
}

function renderFormData(
  schema: { fields?: FormField[]; title?: string } | null,
  data: Record<string, unknown> | null,
  locale: string,
  sectionTitle: string,
): string {
  if (!schema?.fields || !data) return "";

  const fields = schema.fields.map((f) => {
    const label = locale === "es"
      ? (f.label_es || f.label_pt || f.label || f.key)
      : (f.label_pt || f.label || f.key);
    const val = data[f.key];
    const displayVal = val === null || val === undefined || val === ""
      ? "—"
      : f.type === "checkbox"
        ? (val ? "✓" : "✗")
        : String(val);
    const isLong = f.type === "textarea";
    return `<div class="form-field ${isLong ? 'form-field-full' : ''}">
      <div class="form-field-label">${escHtml(label)}</div>
      <div class="form-field-value">${escHtml(displayVal)}</div>
    </div>`;
  }).join("");

  return `
    <div class="section-title">${escHtml(sectionTitle)}</div>
    <div class="form-grid">${fields}</div>
  `;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Single PDF ───────────────────────────────────────────────────────────────

function buildSingleHtml(
  doc: Document,
  versions: DocumentVersion[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
  logoUrl?: string | null,
): string {
  const statusLabel = labels.statuses[doc.status] ?? doc.status;
  const typeLabel = labels.docTypes[doc.doc_type] ?? doc.doc_type;
  const discLabel = labels.disciplinas[doc.disciplina] ?? doc.disciplina;

  const versionRows = versions.map((v) => `
    <tr>
      <td style="text-align:center;font-weight:600;">v${v.version_number}</td>
      <td>${escHtml(v.file_name ?? "—")}</td>
      <td>${escHtml(v.change_description ?? "—")}</td>
      <td>${fmtDate(v.uploaded_at, locale)}</td>
    </tr>
  `).join("");

  // Form data section
  const formHtml = renderFormData(
    (doc as any).form_schema,
    (doc as any).form_data,
    locale,
    labels.formDataTitle || "Formulário",
  );

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"/><title>${escHtml(doc.code || doc.title)} — Atlas DOC</title>
<style>${CSS}</style></head>
<body>
  <div class="header">
    <div class="brand">
      ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" />` : `<div class="brand-bar"></div>`}
      <div class="brand-text">
        <div class="app">${escHtml(labels.appName)}</div>
        <div class="sub">Quality Management System</div>
      </div>
    </div>
    <div class="meta">
      <div class="report-title">${escHtml(labels.reportTitle)}</div>
      ${labels.projectName ? `<div class="project">${escHtml(labels.projectName)}${labels.projectCode ? ` (${escHtml(labels.projectCode)})` : ''}</div>` : ''}
      <div class="gen">${escHtml(labels.generatedOn)}: ${fmtDate(new Date().toISOString(), locale)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="info-label">${escHtml(labels.code)}</span><span class="info-value" style="font-family:monospace;font-weight:700;">${escHtml(doc.code ?? "—")}</span></div>
    <div class="info-row"><span class="info-label">${escHtml(labels.status)}</span><span class="status-badge">${escHtml(statusLabel)}</span></div>
    <div class="info-row"><span class="info-label">${escHtml(labels.title)}</span><span class="info-value">${escHtml(doc.title)}</span></div>
    <div class="info-row"><span class="info-label">${escHtml(labels.type)}</span><span class="info-value">${escHtml(typeLabel)}</span></div>
    <div class="info-row"><span class="info-label">${escHtml(labels.disciplina)}</span><span class="info-value">${escHtml(discLabel)}</span></div>
    <div class="info-row"><span class="info-label">${escHtml(labels.revision)}</span><span class="info-value">${escHtml(doc.revision ?? "—")}</span></div>
    <div class="info-row"><span class="info-label">${escHtml(labels.createdAt)}</span><span class="info-value">${fmtDate(doc.created_at, locale)}</span></div>
    ${doc.issued_at ? `<div class="info-row"><span class="info-label">${escHtml(labels.issuedAt || 'Emitido em')}</span><span class="info-value">${fmtDate(doc.issued_at, locale)}</span></div>` : ""}
    ${doc.approved_at ? `<div class="info-row"><span class="info-label">${escHtml(labels.approvedAt)}</span><span class="info-value">${fmtDate(doc.approved_at, locale)}</span></div>` : ""}
    ${doc.file_name ? `<div class="info-row"><span class="info-label">${escHtml(labels.fileName)}</span><span class="info-value">${escHtml(doc.file_name)}</span></div>` : ""}
    ${doc.file_size ? `<div class="info-row"><span class="info-label">${escHtml(labels.fileSize)}</span><span class="info-value">${formatBytes(doc.file_size)}</span></div>` : ""}
    ${doc.tags && doc.tags.length > 0 ? `<div class="info-row"><span class="info-label">Tags</span><span class="info-value">${escHtml(doc.tags.join(", "))}</span></div>` : ""}
  </div>

  ${formHtml}

  ${versions.length > 0 ? `
  <div class="section-title">${escHtml(labels.versionsTitle)}</div>
  <table class="list">
    <thead><tr>
      <th style="width:50px;">${escHtml(labels.versionNo)}</th>
      <th>${escHtml(labels.fileName)}</th>
      <th>${escHtml(labels.changeDescription)}</th>
      <th style="width:90px;">${escHtml(labels.uploadedAt)}</th>
    </tr></thead>
    <tbody>${versionRows}</tbody>
  </table>` : ""}

  <div class="footer">
    <span>${escHtml(labels.appName)} · Quality Management System</span>
    <span>${escHtml(doc.code ?? "")} · ${escHtml(statusLabel)}</span>
  </div>
</body></html>`;
}

// ─── List PDF ─────────────────────────────────────────────────────────────────

function buildListHtml(
  docs: Document[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
  logoUrl?: string | null,
): string {
  const rows = docs.map((d) => `
    <tr>
      <td style="font-family:monospace;font-size:10px;font-weight:600;">${escHtml(d.code ?? "—")}</td>
      <td>${escHtml(d.title)}</td>
      <td>${escHtml(labels.docTypes[d.doc_type] ?? d.doc_type)}</td>
      <td>${escHtml(labels.disciplinas[d.disciplina] ?? d.disciplina)}</td>
      <td><span class="status-badge">${escHtml(labels.statuses[d.status] ?? d.status)}</span></td>
      <td>${escHtml(d.revision ?? "—")}</td>
      <td>${fmtDate(d.created_at, locale)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"/><title>${escHtml(labels.listReportTitle)} — Atlas</title>
<style>${CSS}</style></head>
<body>
  <div class="header">
    <div class="brand">
      ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" />` : `<div class="brand-bar"></div>`}
      <div class="brand-text">
        <div class="app">${escHtml(labels.appName)}</div>
        <div class="sub">Quality Management System</div>
      </div>
    </div>
    <div class="meta">
      <div class="report-title">${escHtml(labels.listReportTitle)}</div>
      ${labels.projectName ? `<div class="project">${escHtml(labels.projectName)}</div>` : ''}
      <div class="gen">${escHtml(labels.generatedOn)}: ${fmtDate(new Date().toISOString(), locale)} · ${docs.length} doc(s)</div>
    </div>
  </div>

  <table class="list">
    <thead><tr>
      <th>${escHtml(labels.code)}</th>
      <th>${escHtml(labels.title)}</th>
      <th>${escHtml(labels.type)}</th>
      <th>${escHtml(labels.disciplina)}</th>
      <th>${escHtml(labels.status)}</th>
      <th>${escHtml(labels.revision)}</th>
      <th>${escHtml(labels.createdAt)}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>${escHtml(labels.appName)} · Quality Management System</span>
    <span>${escHtml(projectName)} · ${docs.length} doc(s)</span>
  </div>
</body></html>`;
}

// ─── Print helper ─────────────────────────────────────────────────────────────

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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function exportDocumentPdf(
  doc: Document,
  versions: DocumentVersion[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
  projectCode?: string,
  logoUrl?: string | null,
): Promise<void> {
  const html = buildSingleHtml(doc, versions, labels, locale, projectName, logoUrl);
  printHtml(html, buildDocFilename(doc, projectName, projectCode));

  // Audit log
  if (doc.project_id) {
    auditService.log({
      projectId: doc.project_id,
      entity: "documents",
      entityId: doc.id,
      action: "EXPORT",
      module: "documents",
      description: `Document exported: ${doc.code || doc.title}`,
      diff: { format: "pdf", locale },
    }).catch(() => null);
  }
}

export async function exportDocumentListPdf(
  docs: Document[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
  projectId?: string,
  logoUrl?: string | null,
): Promise<void> {
  if (docs.length === 0) return;
  const html = buildListHtml(docs, labels, locale, projectName, logoUrl);
  const filename = `${sanitize(projectName)}_Documentos_${docs.length}_${new Date().toISOString().slice(0, 10)}.pdf`;
  printHtml(html, filename);

  // Audit log
  if (projectId) {
    auditService.log({
      projectId,
      entity: "documents",
      action: "EXPORT",
      module: "documents",
      description: `Document list exported: ${docs.length} documents`,
      diff: { format: "pdf", count: docs.length, locale },
    }).catch(() => null);
  }
}
