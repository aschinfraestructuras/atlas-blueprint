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
