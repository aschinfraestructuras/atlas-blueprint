import {
  exportToCSV, generatePdfDocument, printHtml,
  buildReportFilename, infoGridHtml,
  type ReportMeta, type ReportLabels,
} from "./reportService";
import type { TechnicalOfficeItem, TechOfficeMessage } from "./technicalOfficeService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: locale === "pt" ? "Oficina Técnica" : "Oficina Técnica",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

const TYPE_LABELS: Record<string, Record<string, string>> = {
  pt: { RFI: "RFI", SUBMITTAL: "Submittal", TRANSMITTAL: "Transmittal", CLARIFICATION: "Pedido Esclarecimento", APPROVAL_REQUEST: "Pedido Aprovação", CHANGE_NOTICE: "Alteração/VO" },
  es: { RFI: "RFI", SUBMITTAL: "Submittal", TRANSMITTAL: "Transmittal", CLARIFICATION: "Solicitud Aclaración", APPROVAL_REQUEST: "Solicitud Aprobación", CHANGE_NOTICE: "Cambio/VO" },
};

export function exportTechOfficeCsv(data: TechnicalOfficeItem[], meta: ReportMeta) {
  const headers = ["Código", "Tipo", "Título", "Prioridade", "Estado", "Prazo", "Data"];
  const rows = data.map(r => [
    r.code ?? "", r.type, r.title, r.priority, r.status,
    r.deadline ?? r.due_date ?? "", r.created_at?.slice(0, 10) ?? "",
  ]);
  exportToCSV(headers, rows, buildReportFilename("OT", meta.projectCode, "lista", "csv"));
}

export function exportTechOfficePdf(data: TechnicalOfficeItem[], meta: ReportMeta) {
  const l = labels(meta.locale);
  const cols = ["Código", "Tipo", "Título", "Prioridade", "Estado", "Prazo"];
  const rows = data.map(r => [
    r.code ?? "—", (TYPE_LABELS[meta.locale] || TYPE_LABELS.pt)[r.type] || r.type,
    r.title, r.priority, r.status, r.deadline ?? r.due_date ?? "—",
  ]);
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  const bodyHtml = `
    <table class="atlas-table">
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div style="margin-top:8px;font-size:9px;color:#6B7280;">${rows.length} registo(s)</div>`;
  const html = generatePdfDocument({ title: l.reportTitle, labels: l, meta, bodyHtml, footerRef: `OT-${meta.projectCode}` });
  printHtml(html, buildReportFilename("OT", meta.projectCode, "lista"));
}

export function exportTechOfficeDetailPdf(
  item: TechnicalOfficeItem,
  messages: TechOfficeMessage[],
  meta: ReportMeta
) {
  const l: ReportLabels = { ...labels(meta.locale), reportTitle: `${item.type} — ${item.code ?? item.title}` };
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-PT") : "—";

  const info = infoGridHtml([
    ["Código", item.code ?? "—"],
    ["Tipo", (TYPE_LABELS[meta.locale] || TYPE_LABELS.pt)[item.type] || item.type],
    ["Título", item.title],
    ["Prioridade", item.priority],
    ["Estado", item.status],
    ["Prazo", fmtDate(item.deadline ?? item.due_date)],
    ["Criado em", fmtDate(item.created_at)],
    ["Respondido em", fmtDate(item.responded_at)],
  ]);

  const descHtml = item.description
    ? `<div class="atlas-section">Descrição</div><p style="font-size:11px;line-height:1.6;white-space:pre-wrap;">${item.description}</p>`
    : "";

  const msgsHtml = messages.length > 0
    ? `<div class="atlas-section">Mensagens (${messages.length})</div>
       <table class="atlas-table">
         <thead><tr><th>Data</th><th>Utilizador</th><th>Mensagem</th></tr></thead>
         <tbody>${messages.map(m => `<tr>
           <td style="white-space:nowrap;">${new Date(m.created_at).toLocaleString("pt-PT")}</td>
           <td>${m.user_id.slice(0, 8)}</td>
           <td style="white-space:pre-wrap;">${m.message}</td>
         </tr>`).join("")}</tbody>
       </table>`
    : "";

  const bodyHtml = `${info}${descHtml}${msgsHtml}`;
  const html = generatePdfDocument({ title: l.reportTitle, labels: l, meta, bodyHtml, footerRef: `OT-${meta.projectCode}-${item.code ?? ""}` });
  printHtml(html, buildReportFilename("OT", meta.projectCode, item.code ?? "detail"));
}
