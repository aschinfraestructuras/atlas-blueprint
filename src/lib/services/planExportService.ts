import { exportToCSV, generateListPdf, buildReportFilename, type ReportMeta, type ReportLabels } from "./reportService";
import type { Plan } from "./planService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: locale === "pt" ? "Planos da Qualidade" : "Planes de Calidad",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function exportPlansCsv(data: Plan[], meta: ReportMeta) {
  const headers = ["Tipo", "Título", "Revisão", "Estado", "Data Criação"];
  const rows = data.map(p => [p.plan_type, p.title, p.revision ?? "", p.status, p.created_at.slice(0, 10)]);
  exportToCSV(headers, rows, buildReportFilename("PLANS", meta.projectCode, "lista", "csv"));
}

export function exportPlansPdf(data: Plan[], meta: ReportMeta) {
  const l = labels(meta.locale);
  const columns = ["Tipo", "Título", "Revisão", "Estado", "Data"];
  const rows = data.map(p => [p.plan_type, p.title, p.revision ?? "—", p.status, p.created_at.slice(0, 10)]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `PLANS-${meta.projectCode}`, filename: buildReportFilename("PLANS", meta.projectCode, "lista") });
}
