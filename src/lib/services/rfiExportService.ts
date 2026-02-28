import { exportToCSV, generateListPdf, buildReportFilename, type ReportMeta, type ReportLabels } from "./reportService";
import type { Rfi } from "./rfiService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: "RFIs",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function exportRfisCsv(data: Rfi[], meta: ReportMeta) {
  const headers = ["Código", "Assunto", "Prioridade", "Estado", "Prazo", "Zona", "Data Criação"];
  const rows = data.map(r => [r.code ?? "", r.subject, r.priority, r.status, r.deadline ?? "", r.zone ?? "", r.created_at?.slice(0, 10) ?? ""]);
  exportToCSV(headers, rows, buildReportFilename("RFI", meta.projectCode, "lista", "csv"));
}

export function exportRfisPdf(data: Rfi[], meta: ReportMeta) {
  const l = labels(meta.locale);
  const columns = ["Código", "Assunto", "Prioridade", "Estado", "Prazo", "Data"];
  const rows = data.map(r => [r.code ?? "—", r.subject, r.priority, r.status, r.deadline ?? "—", r.created_at?.slice(0, 10) ?? "—"]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `RFI-${meta.projectCode}`, filename: buildReportFilename("RFI", meta.projectCode, "lista") });
}
