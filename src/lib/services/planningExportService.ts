import { exportToCSV, generateListPdf, generatePdfDocument, printHtml, infoGridHtml, buildReportFilename, type ReportMeta, type ReportLabels } from "./reportService";
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

interface RequirementStatus {
  key: string;
  label: string;
  met: boolean;
  details: string;
}

export function exportActivityDetailPdf(
  activity: Activity,
  requirements: RequirementStatus[],
  meta: ReportMeta
) {
  const l = labels(meta.locale);
  l.reportTitle = meta.locale === "pt" ? "Detalhe da Atividade" : "Detalle de Actividad";

  const info = infoGridHtml([
    [meta.locale === "pt" ? "Descrição" : "Descripción", activity.description],
    ["WBS", activity.wbs_code ?? "—"],
    [meta.locale === "pt" ? "Zona" : "Zona", activity.zone ?? "—"],
    [meta.locale === "pt" ? "Estado" : "Estado", activity.status],
    [meta.locale === "pt" ? "Progresso" : "Progreso", `${activity.progress_pct}%`],
    [meta.locale === "pt" ? "Início Planeado" : "Inicio Planificado", activity.planned_start ?? "—"],
    [meta.locale === "pt" ? "Fim Planeado" : "Fin Planificado", activity.planned_end ?? "—"],
    [meta.locale === "pt" ? "Início Real" : "Inicio Real", activity.actual_start ?? "—"],
    [meta.locale === "pt" ? "Fim Real" : "Fin Real", activity.actual_end ?? "—"],
    [meta.locale === "pt" ? "Subempreiteiro" : "Subcontratista", activity.subcontractor_name ?? "—"],
  ]);

  let reqHtml = "";
  if (requirements.length > 0) {
    const reqRows = requirements.map(r =>
      `<tr><td style="padding:4px 8px">${r.label}</td><td style="padding:4px 8px">${r.met ? "✅ Cumprido" : "❌ Pendente"}</td><td style="padding:4px 8px">${r.details}</td></tr>`
    ).join("");
    reqHtml = `<h3 style="margin-top:16px">${meta.locale === "pt" ? "Requisitos" : "Requisitos"}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10px">
        <tr style="background:#f0f0f0"><th style="padding:4px 8px;text-align:left">Requisito</th><th style="padding:4px 8px;text-align:left">Estado</th><th style="padding:4px 8px;text-align:left">Detalhe</th></tr>
        ${reqRows}
      </table>`;
  }

  const constraintHtml = activity.constraints_text
    ? `<h3 style="margin-top:16px">${meta.locale === "pt" ? "Restrições" : "Restricciones"}</h3><p style="font-size:10px">${activity.constraints_text}</p>`
    : "";

  const filename = buildReportFilename("ATIVIDADE", meta.projectCode, activity.description.slice(0, 20).replace(/\s+/g, "_"));
  const html = generatePdfDocument({
    title: l.reportTitle,
    labels: l,
    meta,
    bodyHtml: info + reqHtml + constraintHtml,
    footerRef: `ACT-${meta.projectCode}`,
  });
  printHtml(html, filename);
}
