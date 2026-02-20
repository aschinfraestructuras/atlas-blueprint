/**
 * Test Export Service
 * Generates professional PDF reports for individual and bulk test results.
 * Same Atlas brand tokens as workItemExportService and ppiExportService.
 */

import type { TestResult, TestCatalogEntry } from "./testService";

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
  warn:      "#D97706",
  pending:   "#9CA3AF",
};

// ─── Label interfaces (never contain i18n keys) ───────────────────────────────

export interface TestExportLabels {
  appName:           string;
  reportTitle:       string;
  bulkReportTitle:   string;
  generatedOn:       string;
  project:           string;
  workItem:          string;
  date:              string;
  laboratory:        string;
  reportNumber:      string;
  technician:        string;
  testCode:          string;
  testName:          string;
  discipline:        string;
  standards:         string;
  method:            string;
  acceptanceCriteria:string;
  sampleRef:         string;
  location:          string;
  pkRange:           string;
  status:            string;
  passFail:          string;
  notes:             string;
  attachments:       string;
  results:           string;
  page:              string;
  of:                string;
  // status labels
  statuses: Record<string, string>;
  passFailLabels: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return (s ?? "")
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

function fmtDateCompact(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10).replace(/-/g, "");
}

function fmtNow(): string {
  const d = new Date();
  return `${fmtDateCompact(d.toISOString())}_${
    String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
}

function passFailColor(pf: string | null | undefined, status: string): string {
  const eff = pf ?? status;
  if (eff === "pass" || eff === "approved") return BRAND.ok;
  if (eff === "fail")                        return BRAND.nok;
  if (eff === "inconclusive")                return BRAND.warn;
  return BRAND.pending;
}

function passFailBg(pf: string | null | undefined, status: string): string {
  const color = passFailColor(pf, status);
  return `${color}18`;
}

// ─── Individual filename ───────────────────────────────────────────────────────
// "TEST_<project>_<workitem>_<code>_<YYYYMMDD>.pdf"

export function buildTestFilename(
  r: TestResult,
  projectName: string,
  workItemSector?: string,
): string {
  const proj = sanitize(projectName);
  const wi   = sanitize(workItemSector ?? "noWI");
  const code = sanitize(r.code ?? r.id.slice(0, 8));
  const date = fmtDateCompact(r.date);
  return `TEST_${proj}_${wi}_${code}_${date}.pdf`;
}

// ─── Bulk filename ─────────────────────────────────────────────────────────────
// "TEST_BULK_<project>_<YYYYMMDD_HHMM>.pdf"

export function buildBulkFilename(projectName: string): string {
  return `TEST_BULK_${sanitize(projectName)}_${fmtNow()}.pdf`;
}

// ─── Work Item summary filename ────────────────────────────────────────────────
// "TEST_WI_<project>_<workitem>_<YYYYMMDD>.pdf"

export function buildWorkItemSummaryFilename(
  projectName: string,
  workItemSector: string,
): string {
  return `TEST_WI_${sanitize(projectName)}_${sanitize(workItemSector)}_${fmtDateCompact(new Date().toISOString())}.pdf`;
}

// ─── Shared CSS ────────────────────────────────────────────────────────────────

function sharedCss(): string {
  return `
  * { box-sizing:border-box; margin:0; padding:0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 12px;
    color: ${BRAND.text};
    background: ${BRAND.white};
  }
  @page { size: A4; margin: 14mm 12mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; break-before: always; }
  }
  /* Header */
  .header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding-bottom: 10px; border-bottom: 3px solid ${BRAND.primary}; margin-bottom: 16px;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-bar { width: 6px; height: 40px; background: ${BRAND.primary}; border-radius: 3px; }
  .brand-text .app { font-size: 18px; font-weight: 800; color: ${BRAND.primary}; letter-spacing: -.5px; }
  .brand-text .sub { font-size: 9px; font-weight: 600; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: .1em; }
  .meta { text-align: right; }
  .meta .report-title { font-size: 13px; font-weight: 700; color: ${BRAND.primary}; }
  .meta .gen { font-size: 9px; color: ${BRAND.textLight}; margin-top: 3px; }

  /* Info grid */
  .info-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 5px 24px;
    background: ${BRAND.bg}; border: 1px solid ${BRAND.border};
    border-radius: 8px; padding: 12px 16px; margin-bottom: 14px;
  }
  .info-row { display: flex; flex-direction: column; }
  .info-label {
    font-size: 8px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .12em; color: ${BRAND.muted}; margin-bottom: 2px;
  }
  .info-value { font-size: 11px; color: ${BRAND.text}; font-weight: 500; }

  /* Section title */
  .section-title {
    font-size: 9px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .14em; color: ${BRAND.muted};
    margin: 14px 0 6px;
  }

  /* Standards chips */
  .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
  .chip {
    font-size: 9px; font-family: monospace; font-weight: 700;
    border: 1px solid ${BRAND.border}; border-radius: 4px;
    padding: 2px 6px; color: ${BRAND.primary}; background: ${BRAND.bg};
  }

  /* Results table */
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead tr { background: ${BRAND.primary}; }
  thead th { color: #fff; padding: 6px 8px; text-align: left; font-weight: 700; font-size: 10px; }
  tbody tr { border-bottom: 1px solid ${BRAND.border}; }
  tbody tr:nth-child(even) { background: ${BRAND.bg}; }
  tbody td { padding: 6px 8px; vertical-align: top; }
  .mono { font-family: monospace; }
  .badge {
    display: inline-block; border-radius: 4px; padding: 2px 7px;
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
  }

  /* Result verdict box */
  .verdict-box {
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px; padding: 10px 20px; margin-bottom: 14px;
    border: 2px solid;
  }
  .verdict-label { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }

  /* Footer */
  .footer {
    margin-top: 20px; padding-top: 8px; border-top: 1px solid ${BRAND.border};
    display: flex; justify-content: space-between; font-size: 8px; color: ${BRAND.textLight};
  }

  /* Test result card (bulk) */
  .result-card {
    border: 1px solid ${BRAND.border}; border-radius: 8px; padding: 12px 14px;
    margin-bottom: 12px; background: ${BRAND.white};
  }
  .result-card-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 8px;
  }
  .result-title { font-size: 13px; font-weight: 700; color: ${BRAND.primary}; }
  .result-code { font-size: 10px; font-family: monospace; color: ${BRAND.muted}; margin-top: 1px; }
`;
}

// ─── Header HTML ──────────────────────────────────────────────────────────────

function headerHtml(
  labels: TestExportLabels,
  title: string,
  locale: string,
): string {
  return `
  <div class="header">
    <div class="brand">
      <div class="brand-bar"></div>
      <div class="brand-text">
        <div class="app">${labels.appName}</div>
        <div class="sub">Quality Management System</div>
      </div>
    </div>
    <div class="meta">
      <div class="report-title">${title}</div>
      <div class="gen">${labels.generatedOn}: ${fmtDate(new Date().toISOString(), locale)}</div>
    </div>
  </div>`;
}

// ─── Individual test result HTML ──────────────────────────────────────────────

function buildSingleTestHtml(
  r: TestResult,
  labels: TestExportLabels,
  locale: string,
  projectName: string,
  workItemSector?: string,
): string {
  const tc   = r.tests_catalog as Partial<TestCatalogEntry> | null;
  const pf   = r.pass_fail ?? r.status;
  const pfColor = passFailColor(r.pass_fail, r.status);
  const pfBg    = passFailBg(r.pass_fail, r.status);
  const pfLabel = labels.passFailLabels[pf] ?? pf;
  const statusLabel = labels.statuses[r.status] ?? r.status;

  const standards = (tc?.standards ?? []).filter(Boolean);
  const stdChips  = standards.length
    ? standards.map((s) => `<span class="chip">${s}</span>`).join("")
    : `<span style="color:${BRAND.muted};font-size:10px">—</span>`;

  const infoRows = [
    [labels.project,      projectName],
    [labels.workItem,     workItemSector ?? "—"],
    [labels.date,         fmtDate(r.date, locale)],
    [labels.reportNumber, r.report_number ?? "—"],
    [labels.laboratory,   (r.suppliers as any)?.name ?? "—"],
    [labels.sampleRef,    r.sample_ref ?? "—"],
    [labels.location,     r.location ?? "—"],
    [labels.pkRange,      r.pk_inicio != null ? `${r.pk_inicio}${r.pk_fim != null ? ` – ${r.pk_fim}` : ""}` : "—"],
    [labels.status,       statusLabel],
    [labels.testCode,     tc?.code ?? "—"],
    [labels.testName,     tc?.name ?? "—"],
    [labels.discipline,   tc?.disciplina ?? "—"],
  ].map(([lbl, val]) => `
    <div class="info-row">
      <span class="info-label">${lbl}</span>
      <span class="info-value">${val}</span>
    </div>`).join("");

  // Result payload table (key-value pairs from JSONB)
  const payload = r.result_payload ?? {};
  const payloadRows = Object.entries(payload).map(([k, v]) =>
    `<tr><td class="mono" style="color:${BRAND.muted};font-size:10px">${k}</td><td>${String(v ?? "—")}</td></tr>`
  ).join("");

  const payloadTable = Object.keys(payload).length > 0
    ? `<table style="margin-bottom:10px">
        <thead><tr><th>${labels.testCode}</th><th>${labels.results}</th></tr></thead>
        <tbody>${payloadRows}</tbody>
       </table>`
    : `<p style="color:${BRAND.muted};font-size:10px;margin-bottom:10px">—</p>`;

  const notesSection = r.notes
    ? `<div class="section-title">${labels.notes}</div>
       <p style="font-size:11px;color:${BRAND.text};margin-bottom:12px">${r.notes}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${tc?.name ?? r.id} — Atlas Ensaio</title>
<style>${sharedCss()}</style>
</head>
<body>
  ${headerHtml(labels, labels.reportTitle, locale)}

  <!-- Verdict -->
  <div class="verdict-box" style="border-color:${pfColor};background:${pfBg}">
    <span class="verdict-label" style="color:${pfColor}">${pfLabel}</span>
  </div>

  <!-- Info grid -->
  <div class="info-grid">${infoRows}</div>

  <!-- Standards -->
  <div class="section-title">${labels.standards}</div>
  <div class="chips">${stdChips}</div>

  ${tc?.acceptance_criteria ? `
  <div class="section-title">${labels.acceptanceCriteria}</div>
  <p style="font-size:11px;margin-bottom:10px;color:${BRAND.text}">${tc.acceptance_criteria}</p>
  ` : ""}

  <!-- Result payload -->
  <div class="section-title">${labels.results}</div>
  ${payloadTable}

  ${notesSection}

  <div class="footer">
    <span>${labels.appName} · Quality Management System</span>
    <span>${r.code ?? r.id.slice(0, 8)}</span>
  </div>
</body>
</html>`;
}

// ─── Bulk test results HTML ───────────────────────────────────────────────────

function buildBulkTestHtml(
  results: TestResult[],
  labels: TestExportLabels,
  locale: string,
  projectName: string,
): string {
  const tableRows = results.map((r) => {
    const tc       = r.tests_catalog as Partial<TestCatalogEntry> | null;
    const pfColor  = passFailColor(r.pass_fail, r.status);
    const pfLabel  = labels.passFailLabels[r.pass_fail ?? ""] ?? (labels.statuses[r.status] ?? r.status);
    return `
    <tr>
      <td class="mono" style="font-size:10px">${r.code ?? "—"}</td>
      <td>
        <div style="font-weight:600">${tc?.name ?? "—"}</div>
        <div style="font-size:9px;color:${BRAND.muted};font-family:monospace">${tc?.code ?? ""}</div>
      </td>
      <td style="font-size:10px">${r.sample_ref ?? "—"}</td>
      <td style="font-size:10px">${r.location ?? (r.pk_inicio != null ? `PK ${r.pk_inicio}` : "—")}</td>
      <td style="font-size:10px">${fmtDate(r.date, locale)}</td>
      <td>
        <span class="badge" style="color:${pfColor};background:${pfColor}18;border:1px solid ${pfColor}40">
          ${pfLabel}
        </span>
      </td>
      <td style="font-size:10px">${r.report_number ?? "—"}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${labels.bulkReportTitle} — Atlas</title>
<style>
${sharedCss()}
thead th { font-size: 9px; }
</style>
</head>
<body>
  ${headerHtml(labels, labels.bulkReportTitle, locale)}

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <span style="font-size:12px;color:${BRAND.muted}">${labels.project}: <strong style="color:${BRAND.text}">${projectName}</strong></span>
    <span style="font-size:10px;color:${BRAND.muted}">${results.length} ${results.length === 1 ? "ensaio" : "ensaios"}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>${labels.testCode}</th>
        <th>${labels.testName}</th>
        <th>${labels.sampleRef}</th>
        <th>${labels.location}</th>
        <th>${labels.date}</th>
        <th>${labels.passFail}</th>
        <th>${labels.reportNumber}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">
    <span>${labels.appName} · Quality Management System</span>
    <span>${fmtDate(new Date().toISOString(), locale)}</span>
  </div>
</body>
</html>`;
}

// ─── Work Item summary HTML ───────────────────────────────────────────────────

function buildWorkItemSummaryHtml(
  results: TestResult[],
  labels: TestExportLabels,
  locale: string,
  projectName: string,
  workItemSector: string,
): string {
  const approved = results.filter((r) => r.status === "approved" || r.pass_fail === "pass").length;
  const failed   = results.filter((r) => r.pass_fail === "fail").length;
  const pending  = results.filter((r) => ["draft","in_progress","pending"].includes(r.status)).length;
  const pct      = results.length > 0 ? Math.round((approved / results.length) * 100) : 0;

  const statsHtml = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
    ${[
      { label: "Total", value: results.length, color: BRAND.primary },
      { label: labels.statuses["approved"] ?? "Aprovados", value: approved, color: BRAND.ok },
      { label: labels.passFailLabels["fail"] ?? "Reprovados", value: failed, color: BRAND.nok },
      { label: labels.statuses["in_progress"] ?? "Pendentes", value: pending, color: BRAND.warn },
    ].map((s) => `
      <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:8px;padding:10px 14px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:${s.color}">${s.value}</div>
        <div style="font-size:9px;color:${BRAND.muted};margin-top:2px">${s.label}</div>
      </div>`).join("")}
  </div>
  <div style="margin-bottom:14px;font-size:10px;color:${BRAND.muted}">
    Taxa de aprovação: <strong style="color:${pct >= 80 ? BRAND.ok : pct >= 50 ? BRAND.warn : BRAND.nok}">${pct}%</strong>
  </div>`;

  // Reuse bulk table
  const bulkHtml = buildBulkTestHtml(results, labels, locale, projectName);
  // inject work item title + stats before the table
  return bulkHtml
    .replace(
      `<title>${labels.bulkReportTitle} — Atlas</title>`,
      `<title>${workItemSector} — Ensaios — Atlas</title>`,
    )
    .replace(
      `${headerHtml(labels, labels.bulkReportTitle, locale)}`,
      `${headerHtml(labels, labels.reportTitle, locale)}
       <div style="font-size:18px;font-weight:800;color:${BRAND.primary};margin-bottom:4px">${workItemSector}</div>
       <div style="font-size:11px;color:${BRAND.muted};margin-bottom:12px">${labels.project}: ${projectName}</div>
       ${statsHtml}`,
    );
}

// ─── Print helper ─────────────────────────────────────────────────────────────

function printHtml(html: string, filename: string): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    // fallback: download as HTML
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename.replace(/\.pdf$/, ".html");
    a.click();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Wait for resources then print
  const tryPrint = () => {
    win.focus();
    win.print();
    // suggest save-as-pdf via OS dialog
  };
  win.onload = () => setTimeout(tryPrint, 400);
  setTimeout(() => {
    if (win.document.readyState === "complete") tryPrint();
  }, 900);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportTestResultPdf(
  result: TestResult,
  labels: TestExportLabels,
  locale: string,
  projectName: string,
  workItemSector?: string,
): void {
  const html = buildSingleTestHtml(result, labels, locale, projectName, workItemSector);
  const filename = buildTestFilename(result, projectName, workItemSector);
  printHtml(html, filename);
}

export function exportTestResultsBulkPdf(
  results: TestResult[],
  labels: TestExportLabels,
  locale: string,
  projectName: string,
): void {
  if (results.length === 0) return;
  const html = buildBulkTestHtml(results, labels, locale, projectName);
  const filename = buildBulkFilename(projectName);
  printHtml(html, filename);
}

export function exportWorkItemTestsPdf(
  results: TestResult[],
  labels: TestExportLabels,
  locale: string,
  projectName: string,
  workItemSector: string,
): void {
  if (results.length === 0) return;
  const html = buildWorkItemSummaryHtml(results, labels, locale, projectName, workItemSector);
  const filename = buildWorkItemSummaryFilename(projectName, workItemSector);
  printHtml(html, filename);
}
