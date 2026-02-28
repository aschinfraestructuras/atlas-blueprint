import {
  exportToCSV, generatePdfDocument, printHtml, buildReportFilename,
  infoGridHtml, type ReportMeta, type ReportLabels, generateListPdf,
} from "./reportService";
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

export function exportPlansPdf(data: Plan[], meta: ReportMeta) {
  const l = labels(meta.locale);
  const columns = ["Tipo", "Título", "Revisão", "Estado", "Data"];
  const rows = data.map(p => [p.plan_type, p.title, p.revision ?? "—", p.status, p.created_at.slice(0, 10)]);
  generateListPdf({ reportTitle: l.reportTitle, labels: l, meta, columns, rows, footerRef: `PLANS-${meta.projectCode}`, filename: buildReportFilename("PLANS", meta.projectCode, "lista") });
}

export function exportPlanDetailPdf(
  plan: Plan,
  versions: DocumentVersion[],
  meta: ReportMeta,
  statusLabels: Record<string, string>,
  typeLabels: Record<string, string>,
) {
  const l = labels(meta.locale);
  const isPt = meta.locale === "pt";

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

  const html = generatePdfDocument({
    title: `${isPt ? "Ficha do Plano" : "Ficha del Plan"} — ${plan.title}`,
    labels: { ...l, reportTitle: isPt ? "Ficha do Plano" : "Ficha del Plan" },
    meta,
    bodyHtml: info + versionsHtml,
    footerRef: `PLAN-${meta.projectCode}-${plan.plan_type}`,
  });

  printHtml(html, buildReportFilename("PLAN", meta.projectCode, plan.plan_type));
}
