import {
  exportToCSV, generateListPdf, generatePdfDocument, infoGridHtml,
  buildReportFilename,
  type ReportMeta, type ReportLabels,
} from "./reportService";
import type {
  TopographyEquipment, TopographyRequest, TopographyControl, EquipmentCalibration,
} from "./topographyService";
import type { SurveyRecord } from "./surveyService";

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

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE-RECORD HTML BUILDERS  (used by the in-app PDF previewer)
// ─────────────────────────────────────────────────────────────────────────────

const L = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: "",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function buildEquipmentDetailHtml(
  eq: TopographyEquipment,
  calibrations: EquipmentCalibration[],
  meta: ReportMeta,
  logoBase64?: string | null,
): { html: string; filename: string } {
  const l = L(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Ficha de Equipamento Topográfico" : "Ficha de Equipo Topográfico";
  const calRows = calibrations
    .filter(c => c.equipment_id === eq.id)
    .map(c =>
      `<tr><td>${c.certificate_number ?? "—"}</td><td>${c.certifying_entity ?? "—"}</td><td>${c.issue_date ?? "—"}</td><td>${c.valid_until ?? "—"}</td><td>${c.status ?? "—"}</td></tr>`)
    .join("");
  const body = [
    `<div class="atlas-section">${meta.locale === "pt" ? "Identificação" : "Identificación"}</div>`,
    infoGridHtml([
      [meta.locale === "pt" ? "Código" : "Código", eq.code],
      [meta.locale === "pt" ? "Tipo" : "Tipo", eq.equipment_type],
      ["Marca", eq.brand ?? "—"],
      ["Modelo", eq.model ?? "—"],
      [meta.locale === "pt" ? "Nº Série" : "Nº Serie", eq.serial_number ?? "—"],
      [meta.locale === "pt" ? "Responsável" : "Responsable", eq.responsible ?? "—"],
      [meta.locale === "pt" ? "Localização" : "Ubicación", eq.current_location ?? "—"],
      [meta.locale === "pt" ? "Validade calibração" : "Validez calibración", eq.calibration_valid_until ?? "—"],
    ]),
    `<div class="atlas-section">${meta.locale === "pt" ? "Histórico de Calibrações" : "Histórico de Calibraciones"}</div>`,
    calRows
      ? `<table class="atlas-table"><thead><tr>
          <th>${meta.locale === "pt" ? "Certificado" : "Certificado"}</th>
          <th>${meta.locale === "pt" ? "Entidade" : "Entidad"}</th>
          <th>${meta.locale === "pt" ? "Emissão" : "Emisión"}</th>
          <th>${meta.locale === "pt" ? "Validade" : "Validez"}</th>
          <th>${meta.locale === "pt" ? "Estado" : "Estado"}</th>
         </tr></thead><tbody>${calRows}</tbody></table>`
      : `<p style="font-size:11px;color:#6b7280;padding:6px 0;">${meta.locale === "pt" ? "Sem calibrações registadas." : "Sin calibraciones registradas."}</p>`,
  ].join("");
  const html = generatePdfDocument({
    title: `${l.reportTitle} — ${eq.code}`,
    labels: l, meta, bodyHtml: body,
    footerRef: `TOPO-EQ · ${eq.code}`,
    logoBase64,
  });
  return { html, filename: buildReportFilename("TOPO-EQ", meta.projectCode, eq.code) };
}

export function buildRequestDetailHtml(
  req: TopographyRequest,
  meta: ReportMeta,
  logoBase64?: string | null,
): { html: string; filename: string } {
  const l = L(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Pedido Topográfico" : "Solicitud Topográfica";
  const body = [
    `<div class="atlas-section">${meta.locale === "pt" ? "Pedido" : "Solicitud"}</div>`,
    infoGridHtml([
      [meta.locale === "pt" ? "Tipo" : "Tipo", req.request_type],
      [meta.locale === "pt" ? "Data" : "Fecha", req.request_date],
      [meta.locale === "pt" ? "Zona / PK" : "Zona / PK", req.zone ?? "—"],
      [meta.locale === "pt" ? "Prioridade" : "Prioridad", req.priority],
      [meta.locale === "pt" ? "Estado" : "Estado", req.status],
      [meta.locale === "pt" ? "Responsável" : "Responsable", req.responsible ?? "—"],
    ]),
    `<div class="atlas-section">${meta.locale === "pt" ? "Descrição" : "Descripción"}</div>`,
    `<p style="font-size:11px;line-height:1.45;padding:6px 0;white-space:pre-wrap;">${req.description ?? "—"}</p>`,
  ].join("");
  const ref = `${(req as any).code ?? req.id.slice(0, 8)}`;
  const html = generatePdfDocument({
    title: `${l.reportTitle} — ${ref}`,
    labels: l, meta, bodyHtml: body,
    footerRef: `TOPO-REQ · ${ref}`,
    logoBase64,
  });
  return { html, filename: buildReportFilename("TOPO-REQ", meta.projectCode, ref) };
}

export function buildControlDetailHtml(
  ctrl: TopographyControl,
  equipment: TopographyEquipment[],
  meta: ReportMeta,
  logoBase64?: string | null,
): { html: string; filename: string } {
  const l = L(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Controlo Geométrico — Ponto" : "Control Geométrico — Punto";
  const eq = equipment.find(e => e.id === ctrl.equipment_id);
  const body = [
    `<div class="atlas-section">${meta.locale === "pt" ? "Identificação" : "Identificación"}</div>`,
    infoGridHtml([
      [meta.locale === "pt" ? "Elemento" : "Elemento", ctrl.element],
      [meta.locale === "pt" ? "Zona / PK" : "Zona / PK", ctrl.zone ?? "—"],
      [meta.locale === "pt" ? "Equipamento" : "Equipo", eq?.code ?? "—"],
      [meta.locale === "pt" ? "Técnico" : "Técnico", ctrl.technician ?? "—"],
      [meta.locale === "pt" ? "Data execução" : "Fecha ejecución", ctrl.execution_date],
      ["FT", (ctrl as any).ft_code ?? "—"],
    ]),
    `<div class="atlas-section">${meta.locale === "pt" ? "Medição" : "Medición"}</div>`,
    infoGridHtml([
      [meta.locale === "pt" ? "Cota projeto" : "Cota proyecto", String((ctrl as any).cota_projeto ?? "—")],
      [meta.locale === "pt" ? "Cota executado" : "Cota ejecutado", String((ctrl as any).cota_executado ?? "—")],
      [meta.locale === "pt" ? "Tolerância" : "Tolerancia", ctrl.tolerance ?? "—"],
      [meta.locale === "pt" ? "Valor medido" : "Valor medido", ctrl.measured_value ?? "—"],
      [meta.locale === "pt" ? "Desvio" : "Desvío", ctrl.deviation ?? "—"],
      [meta.locale === "pt" ? "Resultado" : "Resultado",
        ctrl.result === "conforme" ? (meta.locale === "pt" ? "Conforme" : "Conforme") : (meta.locale === "pt" ? "Não conforme" : "No conforme")],
    ]),
  ].join("");
  const ref = (ctrl as any).ft_code ?? ctrl.id.slice(0, 8);
  const html = generatePdfDocument({
    title: `${l.reportTitle} — ${ref}`,
    labels: l, meta, bodyHtml: body,
    footerRef: `TOPO-CTRL · ${ref}`,
    logoBase64,
  });
  return { html, filename: buildReportFilename("TOPO-CTRL", meta.projectCode, ref) };
}

export function buildSurveyDetailHtml(
  s: SurveyRecord,
  meta: ReportMeta,
  logoBase64?: string | null,
): { html: string; filename: string } {
  const l = L(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Levantamento Topográfico" : "Levantamiento Topográfico";
  const body = [
    `<div class="atlas-section">${meta.locale === "pt" ? "Identificação" : "Identificación"}</div>`,
    infoGridHtml([
      [meta.locale === "pt" ? "Área / PK" : "Área / PK", s.area_or_pk],
      [meta.locale === "pt" ? "Data" : "Fecha", s.date],
      [meta.locale === "pt" ? "Estado" : "Estado", s.status],
    ]),
    `<div class="atlas-section">${meta.locale === "pt" ? "Descrição" : "Descripción"}</div>`,
    `<p style="font-size:11px;line-height:1.45;padding:6px 0;white-space:pre-wrap;">${s.description ?? "—"}</p>`,
  ].join("");
  const ref = s.id.slice(0, 8);
  const html = generatePdfDocument({
    title: `${l.reportTitle} — ${s.area_or_pk}`,
    labels: l, meta, bodyHtml: body,
    footerRef: `TOPO-LEV · ${ref}`,
    logoBase64,
  });
  return { html, filename: buildReportFilename("TOPO-LEV", meta.projectCode, ref) };
}
