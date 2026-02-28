import { exportToCSV, generateListPdf, buildReportFilename, type ReportMeta, type ReportLabels } from "./reportService";
import type { SurveyRecord } from "./surveyService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: locale === "pt" ? "Levantamentos Topográficos" : "Levantamientos Topográficos",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function exportSurveysCsv(data: SurveyRecord[], meta: ReportMeta) {
  const headers = ["Área/PK", "Descrição", "Data", "Estado"];
  const rows = data.map(r => [r.area_or_pk, r.description ?? "", r.date, r.status]);
  exportToCSV(headers, rows, buildReportFilename("SURVEY", meta.projectCode, "lista", "csv"));
}

export function exportSurveysPdf(data: SurveyRecord[], meta: ReportMeta) {
  const l = labels(meta.locale);
  const columns = ["Área/PK", "Descrição", "Data", "Estado"];
  const rows = data.map(r => [r.area_or_pk, r.description ?? "—", r.date, r.status]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `SURVEY-${meta.projectCode}`, filename: buildReportFilename("SURVEY", meta.projectCode, "lista") });
}
