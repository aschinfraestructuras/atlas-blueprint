import {
  exportToCSV, printHtml, buildReportFilename,
  infoGridHtml, sharedCss,
  type ReportMeta, type ReportLabels,
} from "./reportService";
import { fullPdfHeader } from "./pdfProjectHeader";
import type { Plan } from "./planService";
import type { DocumentVersion } from "./documentService";

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

export function exportPlansPdf(data: Plan[], meta: ReportMeta, logoBase64?: string | null) {
  const l = labels(meta.locale);
  const today = new Date().toLocaleDateString("pt-PT");
  const header = fullPdfHeader(logoBase64 ?? null, `LINHA DO SUL — ${meta.projectCode}`, "PLANS-LISTA", "0", today);

  const columns = ["Tipo", "Título", "Revisão", "Estado", "Data"];
  const rows = data.map(p => [p.plan_type, p.title, p.revision ?? "—", p.status, p.created_at.slice(0, 10)]);
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");

  const bodyHtml = `
    <table class="atlas-table">
      <thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div style="margin-top:8px;font-size:9px;color:#6B7280;">${rows.length} registo(s)</div>`;

  const html = `<!DOCTYPE html>
<html lang="${meta.locale}">
<head><meta charset="UTF-8"/><title>${l.reportTitle} — Atlas QMS</title>
<style>${sharedCss()}</style></head>
<body>
${header}
${bodyHtml}
<div class="atlas-footer"><span>Atlas QMS · Sistema de Gestão da Qualidade</span><span>PLANS-${meta.projectCode}</span></div>
</body></html>`;

  printHtml(html, buildReportFilename("PLANS", meta.projectCode, "lista"));
}

export function exportPlanDetailPdf(
  plan: Plan,
  versions: DocumentVersion[],
  meta: ReportMeta,
  statusLabels: Record<string, string>,
  typeLabels: Record<string, string>,
  logoBase64?: string | null,
) {
  const isPt = meta.locale === "pt";
  const today = new Date().toLocaleDateString("pt-PT");
  const docCode = (plan as any).code ?? `PLAN-${plan.plan_type}`;
  const header = fullPdfHeader(logoBase64 ?? null, `LINHA DO SUL — ${meta.projectCode}`, docCode, plan.revision ?? "0", today);

  const info = infoGridHtml([
    [isPt ? "Tipo" : "Tipo", typeLabels[plan.plan_type] ?? plan.plan_type],
    [isPt ? "Título" : "Título", plan.title],
    [isPt ? "Revisão" : "Revisión", plan.revision ?? "—"],
    [isPt ? "Estado" : "Estado", statusLabels[plan.status] ?? plan.status],
    [isPt ? "Criado em" : "Creado el", plan.created_at.slice(0, 10)],
    [isPt ? "Atualizado em" : "Actualizado el", plan.updated_at.slice(0, 10)],
  ]);

  let versionsHtml = "";
  if (versions.length > 0) {
    const vRows = versions.map(v =>
      `<tr><td>v${v.version_number}</td><td>${v.file_name ?? "—"}</td><td>${v.change_description ?? "—"}</td><td>${new Date(v.uploaded_at).toLocaleDateString()}</td></tr>`
    ).join("");
    versionsHtml = `
      <div class="atlas-section">${isPt ? "HISTÓRICO DE VERSÕES" : "HISTORIAL DE VERSIONES"}</div>
      <table class="atlas-table">
        <thead><tr><th>#</th><th>${isPt ? "Ficheiro" : "Archivo"}</th><th>${isPt ? "Alteração" : "Cambio"}</th><th>${isPt ? "Data" : "Fecha"}</th></tr></thead>
        <tbody>${vRows}</tbody>
      </table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="${meta.locale}">
<head><meta charset="UTF-8"/><title>${isPt ? "Ficha do Plano" : "Ficha del Plan"} — Atlas QMS</title>
<style>${sharedCss()}</style></head>
<body>
${header}
${info}
${versionsHtml}
<div class="atlas-footer"><span>Atlas QMS · Sistema de Gestão da Qualidade</span><span>${docCode}-${meta.projectCode}</span></div>
</body></html>`;

  printHtml(html, buildReportFilename("PLAN", meta.projectCode, plan.plan_type));
}
