/**
 * Test Export Service — FASE 3
 * Generates professional PDF reports for individual, bulk, and Work Item exports.
 * RULE: Labels are always pre-resolved strings. Never pass i18n keys here.
 */

import type { TestResult, TestCatalogEntry } from "./testService";

// ─── Atlas brand colours ──────────────────────────────────────────────────────

const BRAND = {
  primary:   "#2F4F75",
  muted:     "#6B7280",
  border:    "#E5E7EB",
  bg:        "#F8FAFC",
  white:     "#FFFFFF",
  text:      "#111827",
  textLight: "#6B7280",
  ok:        "#059669",
  nok:       "#DC2626",
  warn:      "#D97706",
  pending:   "#9CA3AF",
};

// ─── Label interface — all resolved strings, NEVER i18n keys ─────────────────

export interface TestExportLabels {
  appName:            string;
  reportTitle:        string;
  bulkReportTitle:    string;
  wiSummaryTitle:     string;
  generatedOn:        string;
  project:            string;
  workItem:           string;
  date:               string;
  laboratory:         string;
  reportNumber:       string;
  technician:         string;
  testCode:           string;
  testName:           string;
  discipline:         string;
  standards:          string;
  method:             string;
  acceptanceCriteria: string;
  sampleRef:          string;
  location:           string;
  pkRange:            string;
  status:             string;
  passFail:           string;
  notes:              string;
  attachments:        string;
  results:            string;
  page:               string;
  of:                 string;
  approvalRate:       string;
  total:              string;
  approved:           string;
  failed:             string;
  pending:            string;
  statuses:           Record<string, string>;
  passFailLabels:     Record<string, string>;
}

// ─── Filename helpers ─────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return (s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
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

export function buildBulkFilename(projectName: string): string {
  return `TEST_BULK_${sanitize(projectName)}_${fmtNow()}.pdf`;
}

export function buildWorkItemSummaryFilename(
  projectName: string,
  workItemSector: string,
): string {
  return `TEST_WI_${sanitize(projectName)}_${sanitize(workItemSector)}_${fmtDateCompact(new Date().toISOString())}.pdf`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(
      locale === "pt" ? "pt-PT" : "es-ES",
      { year: "numeric", month: "2-digit", day: "2-digit" },
    );
  } catch { return iso.slice(0, 10); }
}

// ─── Verdict colour helpers ───────────────────────────────────────────────────

function verdictColor(pf: string | null | undefined, status: string): string {
  const eff = pf ?? status;
  if (["pass", "approved"].includes(eff)) return BRAND.ok;
  if (eff === "fail")                     return BRAND.nok;
  if (eff === "inconclusive")             return BRAND.warn;
  return BRAND.pending;
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────

function sharedCss(): string {
  return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  font-size: 12px;
  color: ${BRAND.text};
  background: ${BRAND.white};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
@page {
  size: A4 portrait;
  margin: 14mm 12mm 12mm 12mm;
}
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; break-before: page; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
}

/* ── Header ── */
.hdr {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 10px; border-bottom: 3px solid ${BRAND.primary}; margin-bottom: 16px;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand-bar { width: 6px; height: 40px; background: ${BRAND.primary}; border-radius: 3px; }
.brand-logo { height: 40px; width: 40px; object-fit: contain; border-radius: 6px; }
.brand-app  { font-size: 19px; font-weight: 800; color: ${BRAND.primary}; letter-spacing: -.5px; line-height: 1; }
.brand-sub  { font-size: 8.5px; font-weight: 600; color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: .12em; margin-top: 2px; }
.hdr-meta { text-align: right; }
.hdr-title { font-size: 13px; font-weight: 700; color: ${BRAND.primary}; }
.hdr-gen   { font-size: 8.5px; color: ${BRAND.textLight}; margin-top: 3px; }

/* ── Info grid ── */
.info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px 28px;
  background: ${BRAND.bg}; border: 1px solid ${BRAND.border};
  border-radius: 8px; padding: 12px 16px; margin-bottom: 14px;
}
.info-row { display: flex; flex-direction: column; padding: 3px 0; }
.info-lbl {
  font-size: 7.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .13em; color: ${BRAND.muted}; margin-bottom: 2px;
}
.info-val { font-size: 11px; color: ${BRAND.text}; font-weight: 500; }

/* ── Section title ── */
.sec {
  font-size: 8px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .15em; color: ${BRAND.muted};
  margin: 14px 0 6px; border-bottom: 1px solid ${BRAND.border}; padding-bottom: 3px;
}

/* ── Chips (standards) ── */
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.chip {
  font-size: 8.5px; font-family: monospace; font-weight: 700;
  border: 1px solid ${BRAND.border}; border-radius: 4px;
  padding: 2px 7px; color: ${BRAND.primary}; background: ${BRAND.bg};
}

/* ── Verdict box (individual) ── */
.verdict {
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; padding: 10px 20px; margin-bottom: 14px; border: 2px solid;
  gap: 8px;
}
.verdict-label { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }

/* ── Tables ── */
table { width: 100%; border-collapse: collapse; font-size: 11px; }
thead tr { background: ${BRAND.primary}; }
thead th {
  color: #fff; padding: 6px 8px; text-align: left;
  font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: .07em;
}
tbody tr { border-bottom: 1px solid ${BRAND.border}; }
tbody tr:nth-child(even) { background: ${BRAND.bg}; }
tbody td { padding: 6px 8px; vertical-align: top; line-height: 1.4; }
.mono { font-family: monospace; }
.badge {
  display: inline-block; border-radius: 4px; padding: 2px 8px;
  font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
}

/* ── Stats row (WI summary) ── */
.stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;
}
.stat-box {
  background: ${BRAND.bg}; border: 1px solid ${BRAND.border};
  border-radius: 8px; padding: 10px 14px; text-align: center;
}
.stat-val { font-size: 22px; font-weight: 800; line-height: 1; }
.stat-lbl { font-size: 8.5px; color: ${BRAND.muted}; margin-top: 3px; }

/* ── Footer ── */
.footer {
  margin-top: 20px; padding-top: 8px; border-top: 1px solid ${BRAND.border};
  display: flex; justify-content: space-between;
  font-size: 8px; color: ${BRAND.textLight};
}
`;
}

// ─── Shared header HTML ───────────────────────────────────────────────────────

function headerHtml(title: string, labels: TestExportLabels, locale: string, logoUrl?: string | null): string {
  return `
<div class="hdr">
  <div class="brand">
    ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" />` : `<div class="brand-bar"></div>`}
    <div>
      <div class="brand-app">${labels.appName}</div>
      <div class="brand-sub">Quality Management System</div>
    </div>
  </div>
  <div class="hdr-meta">
    <div class="hdr-title">${title}</div>
    <div class="hdr-gen">${labels.generatedOn}: ${fmtDate(new Date().toISOString(), locale)}</div>
  </div>
</div>`;
}

// ─── Footer HTML ──────────────────────────────────────────────────────────────

function footerHtml(ref: string, labels: TestExportLabels): string {
  return `
<div class="footer">
  <span>${labels.appName} · Quality Management System</span>
  <span>${ref}</span>
</div>`;
}

// ─── Info grid builder ────────────────────────────────────────────────────────

function infoGridHtml(rows: [string, string][]): string {
  return `<div class="info-grid">${rows.map(([lbl, val]) =>
    `<div class="info-row">
       <span class="info-lbl">${lbl}</span>
       <span class="info-val">${val || "—"}</span>
     </div>`
  ).join("")}</div>`;
}

// ─── Standards chips ──────────────────────────────────────────────────────────

function standardsHtml(
  tc: Partial<TestCatalogEntry> | null,
  labels: TestExportLabels,
): string {
  const stds = (tc?.standards ?? []).filter(Boolean);
  const chips = stds.length
    ? stds.map((s) => `<span class="chip">${s}</span>`).join("")
    : `<span style="color:${BRAND.muted};font-size:10px">—</span>`;
  return `<div class="sec">${labels.standards}</div><div class="chips">${chips}</div>`;
}

// ─── Result payload table ─────────────────────────────────────────────────────

function payloadTableHtml(
  payload: Record<string, unknown>,
  labels: TestExportLabels,
): string {
  const entries = Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!entries.length) return "";
  return `
<div class="sec">${labels.results}</div>
<table style="margin-bottom:12px">
  <thead><tr>
    <th style="width:40%">${labels.testCode}</th>
    <th>${labels.results}</th>
  </tr></thead>
  <tbody>
    ${entries.map(([k, v]) =>
      `<tr>
         <td class="mono" style="color:${BRAND.muted};font-size:10px">${k}</td>
         <td style="font-weight:500">${String(v)}</td>
       </tr>`
    ).join("")}
  </tbody>
</table>`;
}

// ─── Individual report HTML ───────────────────────────────────────────────────

function buildSingleHtml(
  r: TestResult,
  labels: TestExportLabels,
  locale: string,
  projectName: string,
  workItemSector?: string,
  logoUrl?: string | null,
): string {
  const tc = r.tests_catalog as Partial<TestCatalogEntry> | null;
  const pf = r.pass_fail ?? r.status;
  const pfColor = verdictColor(r.pass_fail, r.status);
  const pfLabel = labels.passFailLabels[pf] ?? labels.statuses[pf] ?? pf;
  const statusLabel = labels.statuses[r.status] ?? r.status;

  const infoRows: [string, string][] = [
    [labels.project,      projectName],
    [labels.workItem,     workItemSector ?? "—"],
    [labels.date,         fmtDate(r.date, locale)],
    [labels.reportNumber, r.report_number ?? "—"],
    [labels.laboratory,   (r.suppliers as { name?: string } | null)?.name ?? "—"],
    [labels.sampleRef,    r.sample_ref ?? "—"],
    [labels.location,     r.location ?? "—"],
    [labels.pkRange,      r.pk_inicio != null
      ? `${r.pk_inicio}${r.pk_fim != null ? ` – ${r.pk_fim}` : ""}` : "—"],
    [labels.status,       statusLabel],
    [labels.testCode,     tc?.code ?? "—"],
    [labels.testName,     tc?.name ?? "—"],
    [labels.discipline,   tc?.disciplina ?? "—"],
  ];

  const payload = r.result_payload ?? {};

  const criteriaHtml = tc?.acceptance_criteria
    ? `<div class="sec">${labels.acceptanceCriteria}</div>
       <p style="font-size:11px;margin-bottom:12px;line-height:1.5;color:${BRAND.text}">${tc.acceptance_criteria}</p>`
    : "";

  const methodHtml = tc?.description
    ? `<div class="sec">${labels.method}</div>
       <p style="font-size:11px;margin-bottom:12px;line-height:1.5;color:${BRAND.text}">${tc.description}</p>`
    : "";

  const notesHtml = r.notes
    ? `<div class="sec">${labels.notes}</div>
       <p style="font-size:11px;margin-bottom:12px;line-height:1.5;color:${BRAND.text}">${r.notes}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<title>${tc?.name ?? r.code ?? r.id} — ${labels.reportTitle}</title>
<style>${sharedCss()}</style>
</head>
<body>

${headerHtml(labels.reportTitle, labels, locale, logoUrl)}

<!-- Verdict -->
<div class="verdict" style="border-color:${pfColor};background:${pfColor}14">
  <span class="verdict-label" style="color:${pfColor}">${pfLabel}</span>
</div>

<!-- Info grid -->
${infoGridHtml(infoRows)}

<!-- Standards -->
${standardsHtml(tc, labels)}

<!-- Acceptance criteria -->
${criteriaHtml}

<!-- Method -->
${methodHtml}

<!-- Result payload -->
${payloadTableHtml(payload, labels)}

<!-- Notes -->
${notesHtml}

${footerHtml(r.code ?? r.id.slice(0, 8), labels)}
</body>
</html>`;
}

// ─── Bulk report HTML ─────────────────────────────────────────────────────────

function buildBulkHtml(
  results: TestResult[],
  labels: TestExportLabels,
  locale: string,
  projectName: string,
  logoUrl?: string | null,
): string {
  const tableRows = results.map((r) => {
    const tc      = r.tests_catalog as Partial<TestCatalogEntry> | null;
    const pf      = r.pass_fail ?? r.status;
    const pfColor = verdictColor(r.pass_fail, r.status);
    const pfLabel = labels.passFailLabels[pf] ?? labels.statuses[pf] ?? pf;
    const wi      = (r.work_items as { sector?: string } | null)?.sector ?? "—";
    return `
<tr>
  <td class="mono" style="font-size:10px;white-space:nowrap">${r.code ?? "—"}</td>
  <td>
    <div style="font-weight:600;font-size:11px">${tc?.name ?? "—"}</div>
    <div style="font-size:8.5px;color:${BRAND.muted};font-family:monospace">${tc?.code ?? ""}</div>
  </td>
  <td style="font-size:10px">${wi}</td>
  <td style="font-size:10px">${r.sample_ref ?? "—"}</td>
  <td style="font-size:10px">${r.location ?? (r.pk_inicio != null ? `PK ${r.pk_inicio}` : "—")}</td>
  <td style="font-size:10px;white-space:nowrap">${fmtDate(r.date, locale)}</td>
  <td>
    <span class="badge" style="color:${pfColor};background:${pfColor}1A;border:1px solid ${pfColor}40">
      ${pfLabel}
    </span>
  </td>
  <td style="font-size:10px;font-family:monospace">${r.report_number ?? "—"}</td>
</tr>`;
  }).join("");

  const approved    = results.filter((r) => r.status === "approved" || r.pass_fail === "pass").length;
  const failed      = results.filter((r) => r.pass_fail === "fail").length;
  const pct         = results.length > 0 ? Math.round((approved / results.length) * 100) : 0;
  const pctColor    = pct >= 80 ? BRAND.ok : pct >= 50 ? BRAND.warn : BRAND.nok;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<title>${labels.bulkReportTitle} — ${labels.appName}</title>
<style>${sharedCss()}
thead th { font-size: 8.5px; }
</style>
</head>
<body>

${headerHtml(labels.bulkReportTitle, labels, locale)}

<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:6px">
  <div>
    <span style="font-size:11px;color:${BRAND.muted}">${labels.project}: </span>
    <strong style="font-size:12px;color:${BRAND.text}">${projectName}</strong>
  </div>
  <div style="display:flex;gap:16px;font-size:10px;color:${BRAND.muted}">
    <span>${labels.total}: <strong style="color:${BRAND.text}">${results.length}</strong></span>
    <span>${labels.approved}: <strong style="color:${BRAND.ok}">${approved}</strong></span>
    <span>${labels.failed}: <strong style="color:${BRAND.nok}">${failed}</strong></span>
    <span>${labels.approvalRate}: <strong style="color:${pctColor}">${pct}%</strong></span>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>${labels.testCode}</th>
      <th>${labels.testName}</th>
      <th>${labels.workItem}</th>
      <th>${labels.sampleRef}</th>
      <th>${labels.location}</th>
      <th>${labels.date}</th>
      <th>${labels.passFail}</th>
      <th>${labels.reportNumber}</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

${footerHtml(fmtDate(new Date().toISOString(), locale), labels)}
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
  const total    = results.length;
  const approved = results.filter((r) => r.status === "approved" || r.pass_fail === "pass").length;
  const failed   = results.filter((r) => r.pass_fail === "fail").length;
  const pending  = results.filter((r) => ["draft", "in_progress", "pending"].includes(r.status)).length;
  const pct      = total > 0 ? Math.round((approved / total) * 100) : 0;
  const pctColor = pct >= 80 ? BRAND.ok : pct >= 50 ? BRAND.warn : BRAND.nok;

  const statsHtml = `
<div class="stats-grid">
  <div class="stat-box">
    <div class="stat-val" style="color:${BRAND.primary}">${total}</div>
    <div class="stat-lbl">${labels.total}</div>
  </div>
  <div class="stat-box">
    <div class="stat-val" style="color:${BRAND.ok}">${approved}</div>
    <div class="stat-lbl">${labels.approved}</div>
  </div>
  <div class="stat-box">
    <div class="stat-val" style="color:${BRAND.nok}">${failed}</div>
    <div class="stat-lbl">${labels.failed}</div>
  </div>
  <div class="stat-box">
    <div class="stat-val" style="color:${BRAND.warn}">${pending}</div>
    <div class="stat-lbl">${labels.pending}</div>
  </div>
</div>
<div style="margin-bottom:16px;font-size:10.5px;color:${BRAND.muted}">
  ${labels.approvalRate}: <strong style="color:${pctColor};font-size:13px">${pct}%</strong>
</div>`;

  const tableRows = results.map((r) => {
    const tc      = r.tests_catalog as Partial<TestCatalogEntry> | null;
    const pf      = r.pass_fail ?? r.status;
    const pfColor = verdictColor(r.pass_fail, r.status);
    const pfLabel = labels.passFailLabels[pf] ?? labels.statuses[pf] ?? pf;
    return `
<tr>
  <td class="mono" style="font-size:10px;white-space:nowrap">${r.code ?? "—"}</td>
  <td>
    <div style="font-weight:600;font-size:11px">${tc?.name ?? "—"}</div>
    <div style="font-size:8.5px;color:${BRAND.muted};font-family:monospace">${tc?.code ?? ""}</div>
  </td>
  <td style="font-size:10px">${r.sample_ref ?? "—"}</td>
  <td style="font-size:10px">${r.location ?? (r.pk_inicio != null ? `PK ${r.pk_inicio}` : "—")}</td>
  <td style="font-size:10px;white-space:nowrap">${fmtDate(r.date, locale)}</td>
  <td>
    <span class="badge" style="color:${pfColor};background:${pfColor}1A;border:1px solid ${pfColor}40">
      ${pfLabel}
    </span>
  </td>
  <td style="font-size:10px;font-family:monospace">${r.report_number ?? "—"}</td>
</tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<title>${workItemSector} — ${labels.wiSummaryTitle} — ${labels.appName}</title>
<style>${sharedCss()}
thead th { font-size: 8.5px; }
</style>
</head>
<body>

${headerHtml(labels.wiSummaryTitle, labels, locale)}

<div style="margin-bottom:4px">
  <div style="font-size:18px;font-weight:800;color:${BRAND.primary}">${workItemSector}</div>
  <div style="font-size:10.5px;color:${BRAND.muted};margin-top:2px">${labels.project}: ${projectName}</div>
</div>
<div style="margin:12px 0 16px;height:2px;background:${BRAND.border};border-radius:2px"></div>

${statsHtml}

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

${footerHtml(`${workItemSector} · ${labels.appName}`, labels)}
</body>
</html>`;
}

// ─── Print / open-window helper ───────────────────────────────────────────────

function printHtml(html: string, filename: string): void {
  const win = window.open("", "_blank", "width=960,height=720,scrollbars=yes");
  if (!win) {
    // Popup blocked — fallback: download as HTML
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = filename.replace(/\.pdf$/, ".html");
    a.click();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  const doPrint = () => {
    try { win.focus(); win.print(); } catch { /* ignore */ }
  };

  // Try both onload and a timeout fallback
  win.addEventListener("load", () => setTimeout(doPrint, 350));
  setTimeout(() => {
    if (win.document.readyState === "complete") doPrint();
  }, 1000);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportTestResultPdf(
  result: TestResult,
  labels: TestExportLabels,
  locale: string,
  projectName: string,
  workItemSector?: string,
): void {
  const html     = buildSingleHtml(result, labels, locale, projectName, workItemSector);
  const filename = buildTestFilename(result, projectName, workItemSector);
  printHtml(html, filename);
}

export function exportTestResultsBulkPdf(
  results: TestResult[],
  labels: TestExportLabels,
  locale: string,
  projectName: string,
): void {
  if (!results.length) return;
  const html     = buildBulkHtml(results, labels, locale, projectName);
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
  if (!results.length) return;
  const html     = buildWorkItemSummaryHtml(results, labels, locale, projectName, workItemSector);
  const filename = buildWorkItemSummaryFilename(projectName, workItemSector);
  printHtml(html, filename);
}
