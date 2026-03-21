import {
  exportToCSV, printHtml, buildReportFilename,
  infoGridHtml, sharedCss,
  type ReportMeta, type ReportLabels,
} from "./reportService";
import { fullPdfHeader } from "./pdfProjectHeader";
import type { WbsNode, Activity } from "./planningService";
import { esc } from "@/lib/utils/escapeHtml";

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

export function exportWbsPdf(data: WbsNode[], meta: ReportMeta, logoBase64?: string | null) {
  const today = new Date().toLocaleDateString("pt-PT");
  const header = fullPdfHeader(logoBase64 ?? null, meta.projectName ?? meta.projectCode, "WBS-LISTA", "0", today);
  const columns = ["Código", "Descrição", "Zona", "Início", "Fim", "Responsável"];
  const rows = data.map(w => [w.wbs_code, w.description, w.zone ?? "—", w.planned_start ?? "—", w.planned_end ?? "—", w.responsible ?? "—"]);
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");

  const html = `<!DOCTYPE html><html lang="${meta.locale}"><head><meta charset="UTF-8"/><title>WBS — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>
${header}
<table class="atlas-table"><thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>
<div style="margin-top:8px;font-size:9px;color:#6B7280;">${rows.length} registo(s)</div>
<div class="atlas-footer"><span>Atlas QMS</span><span>WBS-${meta.projectCode}</span></div>
</body></html>`;
  printHtml(html, buildReportFilename("WBS", meta.projectCode, "lista"));
}

export function exportActivitiesCsv(data: Activity[], meta: ReportMeta) {
  const headers = ["Descrição", "WBS", "Zona", "Estado", "Progresso %", "Início Plan.", "Fim Plan.", "Topo", "Ensaios", "PPI"];
  const rows = data.map(a => [a.description, a.wbs_code ?? "", a.zone ?? "", a.status, String(a.progress_pct), a.planned_start ?? "", a.planned_end ?? "", a.requires_topography ? "Sim" : "", a.requires_tests ? "Sim" : "", a.requires_ppi ? "Sim" : ""]);
  exportToCSV(headers, rows, buildReportFilename("ATIVIDADES", meta.projectCode, "lista", "csv"));
}

export function exportActivitiesPdf(data: Activity[], meta: ReportMeta, logoBase64?: string | null) {
  const today = new Date().toLocaleDateString("pt-PT");
  const title = meta.locale === "pt" ? "Atividades" : "Actividades";
  const header = fullPdfHeader(logoBase64 ?? null, meta.projectName ?? meta.projectCode, "ACT-LISTA", "0", today);
  const columns = ["Descrição", "WBS", "Zona", "Estado", "Progresso", "Datas"];
  const rows = data.map(a => [a.description, a.wbs_code ?? "—", a.zone ?? "—", a.status, `${a.progress_pct}%`, `${a.planned_start ?? "?"} → ${a.planned_end ?? "?"}`]);
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");

  const html = `<!DOCTYPE html><html lang="${meta.locale}"><head><meta charset="UTF-8"/><title>${title} — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>
${header}
<table class="atlas-table"><thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>
<div style="margin-top:8px;font-size:9px;color:#6B7280;">${rows.length} registo(s)</div>
<div class="atlas-footer"><span>Atlas QMS</span><span>ACT-${meta.projectCode}</span></div>
</body></html>`;
  printHtml(html, buildReportFilename("ATIVIDADES", meta.projectCode, "lista"));
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
  meta: ReportMeta,
  logoBase64?: string | null,
) {
  const today = new Date().toLocaleDateString("pt-PT");
  const title = meta.locale === "pt" ? "Detalhe da Atividade" : "Detalle de Actividad";
  const header = fullPdfHeader(logoBase64 ?? null, meta.projectName ?? meta.projectCode, `ACT-${meta.projectCode}`, "0", today);

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
    reqHtml = `<div class="atlas-section">${meta.locale === "pt" ? "Requisitos" : "Requisitos"}</div>
      <table class="atlas-table">
        <thead><tr><th>Requisito</th><th>Estado</th><th>Detalhe</th></tr></thead>
        <tbody>${reqRows}</tbody>
      </table>`;
  }

  const constraintHtml = activity.constraints_text
    ? `<div class="atlas-section">${meta.locale === "pt" ? "Restrições" : "Restricciones"}</div><p style="font-size:10px">${activity.constraints_text}</p>`
    : "";

  const html = `<!DOCTYPE html><html lang="${meta.locale}"><head><meta charset="UTF-8"/><title>${title} — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>
${header}
${info}${reqHtml}${constraintHtml}
<div class="atlas-footer"><span>Atlas QMS</span><span>ACT-${meta.projectCode}</span></div>
</body></html>`;

  printHtml(html, buildReportFilename("ATIVIDADE", meta.projectCode, activity.description.slice(0, 20).replace(/\s+/g, "_")));
}
