import {
  exportToCSV, generatePdfDocument, printHtml,
  buildReportFilename, infoGridHtml,
  type ReportMeta, type ReportLabels,
} from "./reportService";
import type { Rfi, RfiMessage } from "./rfiService";

const labels = (locale: string): ReportLabels => ({
  appName: "Atlas QMS",
  reportTitle: "RFIs",
  generatedOn: locale === "pt" ? "Gerado a" : "Generado el",
});

export function exportRfisCsv(data: Rfi[], meta: ReportMeta) {
  const headers = ["Código", "Assunto", "Prioridade", "Estado", "Prazo", "Zona", "Data Criação"];
  const rows = data.map(r => [r.code ?? "", r.subject, r.priority, r.status, r.deadline ?? "", r.zone ?? "", r.created_at?.slice(0, 10) ?? ""]);
  exportToCSV(headers, rows, buildReportFilename("RFI", meta.projectCode, "lista", "csv"));
}

export function exportRfisPdf(data: Rfi[], meta: ReportMeta) {
  const l = labels(meta.locale);
  const columns = ["Código", "Assunto", "Prioridade", "Estado", "Prazo", "Data"];
  const rows = data.map(r => [r.code ?? "—", r.subject, r.priority, r.status, r.deadline ?? "—", r.created_at?.slice(0, 10) ?? "—"]);
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  const bodyHtml = `
    <table class="atlas-table">
      <thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div style="margin-top:8px;font-size:9px;color:#6B7280;">${rows.length} registo(s)</div>`;
  const html = generatePdfDocument({ title: l.reportTitle, labels: l, meta, bodyHtml, footerRef: `RFI-${meta.projectCode}` });
  printHtml(html, buildReportFilename("RFI", meta.projectCode, "lista"));
}

/** Export a single RFI detail with messages thread and attachments list */
export function exportRfiDetailPdf(rfi: Rfi, messages: RfiMessage[], meta: ReportMeta) {
  const l: ReportLabels = { ...labels(meta.locale), reportTitle: `RFI — ${rfi.code ?? rfi.subject}` };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-PT") : "—";

  const info = infoGridHtml([
    ["Código", rfi.code ?? "—"],
    ["Assunto", rfi.subject],
    ["Prioridade", rfi.priority],
    ["Estado", rfi.status],
    ["Zona", rfi.zone ?? "—"],
    ["Prazo", fmtDate(rfi.deadline)],
    ["Criado em", fmtDate(rfi.created_at)],
    ["Atualizado em", fmtDate(rfi.updated_at)],
  ]);

  const descHtml = rfi.description
    ? `<div class="atlas-section">Descrição</div><p style="font-size:11px;line-height:1.6;white-space:pre-wrap;">${rfi.description}</p>`
    : "";

  const msgsHtml = messages.length > 0
    ? `<div class="atlas-section">Mensagens (${messages.length})</div>
       <table class="atlas-table">
         <thead><tr><th>Data</th><th>Utilizador</th><th>Mensagem</th></tr></thead>
         <tbody>${messages.map(m => `<tr>
           <td style="white-space:nowrap;">${new Date(m.created_at).toLocaleString("pt-PT")}</td>
           <td>${m.user_email ?? m.user_id.slice(0, 8)}</td>
           <td style="white-space:pre-wrap;">${m.message}</td>
         </tr>`).join("")}</tbody>
       </table>`
    : `<div class="atlas-section">Mensagens</div><p style="font-size:10px;color:#6B7280;">Sem mensagens.</p>`;

  const bodyHtml = `${info}${descHtml}${msgsHtml}`;
  const html = generatePdfDocument({ title: l.reportTitle, labels: l, meta, bodyHtml, footerRef: `RFI-${meta.projectCode}-${rfi.code ?? ""}` });
  printHtml(html, buildReportFilename("RFI", meta.projectCode, rfi.code ?? "detail"));
}
