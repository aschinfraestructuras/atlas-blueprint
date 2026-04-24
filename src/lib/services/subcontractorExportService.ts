import { exportToCSV, generateListPdf, buildReportFilename, type ReportMeta, type ReportLabels } from "./reportService";
import type { Subcontractor } from "./subcontractorService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: locale === "pt" ? "Subempreiteiros" : "Subcontratistas",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function exportSubcontractorsCsv(data: Subcontractor[], meta: ReportMeta) {
  const headers = ["Nome", "Especialidade", "Email", "Contrato", "Doc. Status", "Score", "Estado"];
  const rows = data.map(s => [s.name, s.trade ?? "", s.contact_email ?? "", s.contract ?? "", s.documentation_status, s.performance_score?.toString() ?? "", s.status]);
  exportToCSV(headers, rows, buildReportFilename("SUB", meta.projectCode, "lista", "csv"));
}

export function exportSubcontractorsPdf(data: Subcontractor[], meta: ReportMeta) {
  const l = labels(meta.locale);
  const columns = ["Nome", "Especialidade", "Contrato", "Doc. Status", "Score", "Estado"];
  const rows = data.map(s => [s.name, s.trade ?? "—", s.contract ?? "—", s.documentation_status, s.performance_score?.toString() ?? "—", s.status]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `SUB-${meta.projectCode}`, filename: buildReportFilename("SUB", meta.projectCode, "lista") });
}

/** Build the rows for a subcontractor detail report. Shared by export + preview. */
function buildSubcontractorRows(
  sub: Subcontractor,
  docs: Array<{ title: string; doc_type: string; valid_from?: string | null; valid_to?: string | null; status: string; computedStatus?: string }>,
  activities: Array<{ description: string; status: string; zone?: string | null; progress_pct?: number }>,
  isPt: boolean,
): { columns: string[]; rows: string[][] } {
  const columns = [isPt ? "Secção" : "Sección", isPt ? "Campo" : "Campo", isPt ? "Valor" : "Valor"];
  const rows: string[][] = [
    [isPt ? "Dados Gerais" : "Datos Generales", isPt ? "Nome" : "Nombre", sub.name],
    ["", isPt ? "Especialidade" : "Especialidad", sub.trade ?? "—"],
    ["", "E-mail", sub.contact_email ?? "—"],
    ["", isPt ? "Contrato" : "Contrato", sub.contract ?? "—"],
    ["", isPt ? "Estado" : "Estado", sub.status],
    ["", "Doc. Status", sub.documentation_status],
    ["", "Score", sub.performance_score?.toString() ?? "—"],
  ];

  docs.forEach((d, i) => {
    rows.push([
      i === 0 ? (isPt ? "Documentação" : "Documentación") : "",
      `${d.doc_type}: ${d.title}`,
      `${d.valid_to ?? "—"} (${d.computedStatus ?? d.status})`,
    ]);
  });
  if (docs.length === 0) {
    rows.push([isPt ? "Documentação" : "Documentación", "—", "—"]);
  }

  activities.forEach((a, i) => {
    rows.push([
      i === 0 ? (isPt ? "Atividades" : "Actividades") : "",
      a.description,
      `${a.zone ?? "—"} | ${a.status} | ${a.progress_pct ?? 0}%`,
    ]);
  });
  if (activities.length === 0) {
    rows.push([isPt ? "Atividades" : "Actividades", "—", "—"]);
  }

  return { columns, rows };
}

/** Build printable HTML for a subcontractor detail (for in-app preview dialog). */
export function buildSubcontractorDetailHtml(
  sub: Subcontractor,
  docs: Array<{ title: string; doc_type: string; valid_from?: string | null; valid_to?: string | null; status: string; computedStatus?: string }>,
  activities: Array<{ description: string; status: string; zone?: string | null; progress_pct?: number }>,
  meta: ReportMeta,
  logoBase64?: string | null,
): string {
  const l = labels(meta.locale);
  const isPt = meta.locale === "pt";
  const { columns, rows } = buildSubcontractorRows(sub, docs, activities, isPt);
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${escapeListHtml(c)}</td>`).join("")}</tr>`).join("");
  const today = new Date().toLocaleDateString(meta.locale === "pt" ? "pt-PT" : "es-ES");
  const docCode = `SUB-${meta.projectCode}-${sub.name.replace(/\s+/g, "_")}`;
  const headerBlock = fullPdfHeader(logoBase64 ?? null, meta.projectName ?? meta.projectCode, docCode, "0", today);
  return `<!DOCTYPE html>
<html lang="${meta.locale}"><head><meta charset="UTF-8"/><title>${docCode} — Atlas QMS</title>
<style>${sharedCss()}</style></head>
<body>
${headerBlock}
<table class="atlas-table"><thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>
<div class="atlas-footer"><span>Atlas QMS · Sistema de Gestão da Qualidade</span><span>${docCode} · Gerado em ${today}</span></div>
</body></html>`;
}

function escapeListHtml(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportSubcontractorDetailPdf(
  sub: Subcontractor,
  docs: Array<{ title: string; doc_type: string; valid_from?: string | null; valid_to?: string | null; status: string; computedStatus?: string }>,
  activities: Array<{ description: string; status: string; zone?: string | null; progress_pct?: number }>,
  meta: ReportMeta,
  logoBase64?: string | null,
) {
  const l = {
    ...labels(meta.locale),
    reportTitle: `${labels(meta.locale).reportTitle} — ${sub.name}`,
  };
  const isPt = meta.locale === "pt";
  const { columns, rows } = buildSubcontractorRows(sub, docs, activities, isPt);

  generateListPdf({
    reportTitle: l.reportTitle,
    labels: l,
    meta,
    columns,
    rows,
    footerRef: `SUB-${meta.projectCode}-${sub.name.replace(/\s+/g, "_")}`,
    filename: buildReportFilename("SUB", meta.projectCode, sub.name.replace(/\s+/g, "_")),
    logoBase64,
  });
}
