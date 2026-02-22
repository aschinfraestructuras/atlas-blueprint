/**
 * Document Export Service
 * PDF export for individual documents and filtered lists.
 * Uses styled print window with Atlas branding.
 */

import type { Document, DocumentVersion } from "./documentService";

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
  return s.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_\-.]/g, "").replace(/_+/g, "_").slice(0, 40);
}

function formatBytes(b: number | null | undefined): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildDocFilename(doc: Document, projectName: string): string {
  const proj = sanitize(projectName);
  const code = sanitize(doc.code ?? doc.id.slice(0, 8));
  const ver = sanitize(doc.revision ?? "1");
  return `DOC_${proj}_${code}_v${ver}.pdf`;
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
.brand-text .app { font-size:18px; font-weight:800; color:${B.primary}; letter-spacing:-.5px; }
.brand-text .sub { font-size:9px; font-weight:600; color:${B.muted}; text-transform:uppercase; letter-spacing:.1em; }
.meta { text-align:right; }
.meta .report-title { font-size:13px; font-weight:700; color:${B.primary}; }
.meta .gen { font-size:9px; color:${B.textLight}; margin-top:3px; }

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
                 letter-spacing:.14em; color:${B.muted}; margin:16px 0 8px; }
table.list { width:100%; border-collapse:collapse; }
table.list thead tr { background:${B.primary}; color:${B.white}; }
table.list thead th { padding:6px 6px; font-size:9px; font-weight:700;
                      text-transform:uppercase; letter-spacing:.1em; text-align:left; }
table.list tbody tr { border-bottom:1px solid ${B.border}; }
table.list tbody tr:nth-child(even) { background:${B.bg}; }
table.list td { padding:5px 6px; font-size:11px; }

.footer { margin-top:20px; padding-top:8px; border-top:1px solid ${B.border};
          display:flex; justify-content:space-between; font-size:8px; color:${B.textLight}; }
`;

// ─── Single PDF ───────────────────────────────────────────────────────────────

function buildSingleHtml(
  doc: Document,
  versions: DocumentVersion[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
): string {
  const statusLabel = labels.statuses[doc.status] ?? doc.status;
  const typeLabel = labels.docTypes[doc.doc_type] ?? doc.doc_type;
  const discLabel = labels.disciplinas[doc.disciplina] ?? doc.disciplina;

  const versionRows = versions.map((v) => `
    <tr>
      <td style="text-align:center;font-weight:600;">v${v.version_number}</td>
      <td>${v.file_name ?? "—"}</td>
      <td>${v.change_description ?? "—"}</td>
      <td>${fmtDate(v.uploaded_at, locale)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"/><title>${doc.code} — Atlas DOC</title>
<style>${CSS}</style></head>
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

  <div class="info-grid">
    <div class="info-row"><span class="info-label">${labels.code}</span><span class="info-value" style="font-family:monospace;font-weight:700;">${doc.code ?? "—"}</span></div>
    <div class="info-row"><span class="info-label">${labels.status}</span><span class="status-badge">${statusLabel}</span></div>
    <div class="info-row"><span class="info-label">${labels.title}</span><span class="info-value">${doc.title}</span></div>
    <div class="info-row"><span class="info-label">${labels.type}</span><span class="info-value">${typeLabel}</span></div>
    <div class="info-row"><span class="info-label">${labels.disciplina}</span><span class="info-value">${discLabel}</span></div>
    <div class="info-row"><span class="info-label">${labels.revision}</span><span class="info-value">${doc.revision ?? "—"}</span></div>
    <div class="info-row"><span class="info-label">${labels.createdAt}</span><span class="info-value">${fmtDate(doc.created_at, locale)}</span></div>
    ${doc.approved_at ? `<div class="info-row"><span class="info-label">${labels.approvedAt}</span><span class="info-value">${fmtDate(doc.approved_at, locale)}</span></div>` : ""}
    ${doc.file_name ? `<div class="info-row"><span class="info-label">${labels.fileName}</span><span class="info-value">${doc.file_name}</span></div>` : ""}
    ${doc.file_size ? `<div class="info-row"><span class="info-label">${labels.fileSize}</span><span class="info-value">${formatBytes(doc.file_size)}</span></div>` : ""}
  </div>

  ${versions.length > 0 ? `
  <div class="section-title">${labels.versionsTitle}</div>
  <table class="list">
    <thead><tr>
      <th style="width:50px;">${labels.versionNo}</th>
      <th>${labels.fileName}</th>
      <th>${labels.changeDescription}</th>
      <th style="width:90px;">${labels.uploadedAt}</th>
    </tr></thead>
    <tbody>${versionRows}</tbody>
  </table>` : ""}

  <div class="footer">
    <span>${labels.appName} · Quality Management System</span>
    <span>${doc.code ?? ""} · ${statusLabel}</span>
  </div>
</body></html>`;
}

// ─── List PDF ─────────────────────────────────────────────────────────────────

function buildListHtml(
  docs: Document[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
): string {
  const rows = docs.map((d) => `
    <tr>
      <td style="font-family:monospace;font-size:10px;font-weight:600;">${d.code ?? "—"}</td>
      <td>${d.title}</td>
      <td>${labels.docTypes[d.doc_type] ?? d.doc_type}</td>
      <td>${labels.disciplinas[d.disciplina] ?? d.disciplina}</td>
      <td><span class="status-badge">${labels.statuses[d.status] ?? d.status}</span></td>
      <td>${d.revision ?? "—"}</td>
      <td>${fmtDate(d.created_at, locale)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"/><title>${labels.listReportTitle} — Atlas</title>
<style>${CSS}</style></head>
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
      <div class="report-title">${labels.listReportTitle}</div>
      <div class="gen">${labels.generatedOn}: ${fmtDate(new Date().toISOString(), locale)} · ${docs.length} doc(s)</div>
    </div>
  </div>

  <table class="list">
    <thead><tr>
      <th>${labels.code}</th>
      <th>${labels.title}</th>
      <th>${labels.type}</th>
      <th>${labels.disciplina}</th>
      <th>${labels.status}</th>
      <th>${labels.revision}</th>
      <th>${labels.createdAt}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>${labels.appName} · Quality Management System</span>
    <span>${projectName} · ${docs.length} doc(s)</span>
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

export function exportDocumentPdf(
  doc: Document,
  versions: DocumentVersion[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
): void {
  const html = buildSingleHtml(doc, versions, labels, locale, projectName);
  printHtml(html, buildDocFilename(doc, projectName));
}

export function exportDocumentListPdf(
  docs: Document[],
  labels: DocExportLabels,
  locale: string,
  projectName: string,
): void {
  if (docs.length === 0) return;
  const html = buildListHtml(docs, labels, locale, projectName);
  const filename = `DOC_${sanitize(projectName)}_list_${docs.length}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf`;
  printHtml(html, filename);
}
