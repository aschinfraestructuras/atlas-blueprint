import { exportToCSV, generateListPdf, buildReportFilename, type ReportMeta, type ReportLabels } from "./reportService";
import type { WbsNode, Activity } from "./planningService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: locale === "pt" ? "Planeamento" : "Planificación",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function exportWbsCsv(data: WbsNode[], meta: ReportMeta) {
  const headers = ["Código WBS", "Descrição", "Zona", "Início Plan.", "Fim Plan.", "Responsável"];
  const rows = data.map(w => [w.wbs_code, w.description, w.zone ?? "", w.planned_start ?? "", w.planned_end ?? "", w.responsible ?? ""]);
  exportToCSV(headers, rows, buildReportFilename("WBS", meta.projectCode, "lista", "csv"));
}

export function exportWbsPdf(data: WbsNode[], meta: ReportMeta) {
  const l = labels(meta.locale);
  l.reportTitle = "WBS";
  const columns = ["Código", "Descrição", "Zona", "Início", "Fim", "Responsável"];
  const rows = data.map(w => [w.wbs_code, w.description, w.zone ?? "—", w.planned_start ?? "—", w.planned_end ?? "—", w.responsible ?? "—"]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `WBS-${meta.projectCode}`, filename: buildReportFilename("WBS", meta.projectCode, "lista") });
}

export function exportActivitiesCsv(data: Activity[], meta: ReportMeta) {
  const headers = ["Descrição", "WBS", "Zona", "Estado", "Progresso %", "Início Plan.", "Fim Plan.", "Topo", "Ensaios", "PPI"];
  const rows = data.map(a => [a.description, a.wbs_code ?? "", a.zone ?? "", a.status, String(a.progress_pct), a.planned_start ?? "", a.planned_end ?? "", a.requires_topography ? "Sim" : "", a.requires_tests ? "Sim" : "", a.requires_ppi ? "Sim" : ""]);
  exportToCSV(headers, rows, buildReportFilename("ATIVIDADES", meta.projectCode, "lista", "csv"));
}

export function exportActivitiesPdf(data: Activity[], meta: ReportMeta) {
  const l = labels(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Atividades" : "Actividades";
  const columns = ["Descrição", "WBS", "Zona", "Estado", "Progresso", "Datas"];
  const rows = data.map(a => [a.description, a.wbs_code ?? "—", a.zone ?? "—", a.status, `${a.progress_pct}%`, `${a.planned_start ?? "?"} → ${a.planned_end ?? "?"}`]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `ACT-${meta.projectCode}`, filename: buildReportFilename("ATIVIDADES", meta.projectCode, "lista") });
}
