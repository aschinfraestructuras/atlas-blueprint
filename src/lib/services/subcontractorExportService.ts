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

  // Combine all data into one table for the PDF
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

  // Docs
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

  // Activities
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

  generateListPdf({
    reportTitle: l.reportTitle,
    labels: l,
    meta,
    columns,
    rows,
    footerRef: `SUB-${meta.projectCode}-${sub.name.replace(/\s+/g, "_")}`,
    filename: buildReportFilename("SUB", meta.projectCode, sub.name.replace(/\s+/g, "_")),
  });
}
