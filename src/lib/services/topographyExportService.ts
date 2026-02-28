import { exportToCSV, generateListPdf, buildReportFilename, type ReportMeta, type ReportLabels } from "./reportService";
import type { TopographyEquipment, TopographyRequest, TopographyControl } from "./topographyService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: locale === "pt" ? "Topografia" : "Topografía",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function exportTopographyEquipmentCsv(data: TopographyEquipment[], meta: ReportMeta) {
  const headers = ["Código", "Tipo", "Marca", "Modelo", "Nº Série", "Responsável", "Calibração", "Validade"];
  const rows = data.map(e => [e.code, e.equipment_type, e.brand ?? "", e.model ?? "", e.serial_number ?? "", e.responsible ?? "", e.calibration_status, e.calibration_valid_until ?? ""]);
  exportToCSV(headers, rows, buildReportFilename("TOPO-EQ", meta.projectCode, "lista", "csv"));
}

export function exportTopographyEquipmentPdf(data: TopographyEquipment[], meta: ReportMeta) {
  const l = labels(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Equipamentos Topográficos" : "Equipos Topográficos";
  const columns = ["Código", "Tipo", "Marca/Modelo", "Nº Série", "Calibração", "Validade"];
  const rows = data.map(e => [e.code, e.equipment_type, [e.brand, e.model].filter(Boolean).join(" "), e.serial_number ?? "—", e.calibration_status, e.calibration_valid_until ?? "—"]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `TOPO-EQ-${meta.projectCode}`, filename: buildReportFilename("TOPO-EQ", meta.projectCode, "lista") });
}

export function exportTopographyRequestsCsv(data: TopographyRequest[], meta: ReportMeta) {
  const headers = ["Tipo", "Descrição", "Zona", "Data", "Prioridade", "Estado"];
  const rows = data.map(r => [r.request_type, r.description, r.zone ?? "", r.request_date, r.priority, r.status]);
  exportToCSV(headers, rows, buildReportFilename("TOPO-REQ", meta.projectCode, "lista", "csv"));
}

export function exportTopographyControlsCsv(data: TopographyControl[], meta: ReportMeta) {
  const headers = ["Elemento", "Zona", "Tolerância", "Valor Medido", "Desvio", "Resultado", "Data", "Técnico"];
  const rows = data.map(c => [c.element, c.zone ?? "", c.tolerance ?? "", c.measured_value ?? "", c.deviation ?? "", c.result, c.execution_date, c.technician ?? ""]);
  exportToCSV(headers, rows, buildReportFilename("TOPO-CTRL", meta.projectCode, "lista", "csv"));
}

export function exportTopographyControlsPdf(data: TopographyControl[], equipment: TopographyEquipment[], meta: ReportMeta) {
  const l = labels(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Controlo Geométrico" : "Control Geométrico";
  const eqMap = Object.fromEntries(equipment.map(e => [e.id, e.code]));
  const columns = ["Elemento", "Zona", "Equipamento", "Tolerância", "Valor", "Desvio", "Resultado", "Data"];
  const rows = data.map(c => [c.element, c.zone ?? "—", eqMap[c.equipment_id] ?? "—", c.tolerance ?? "—", c.measured_value ?? "—", c.deviation ?? "—", c.result === "conforme" ? "Conforme" : "Não conforme", c.execution_date]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `TOPO-CTRL-${meta.projectCode}`, filename: buildReportFilename("TOPO-CTRL", meta.projectCode, "lista") });
}
