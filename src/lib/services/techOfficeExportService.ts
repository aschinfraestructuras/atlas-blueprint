import {
  exportToCSV, printHtml, buildReportFilename,
  infoGridHtml, sharedCss,
  type ReportMeta, type ReportLabels,
} from "./reportService";
import { fullPdfHeader } from "./pdfProjectHeader";
import type { TechnicalOfficeItem, TechOfficeMessage } from "./technicalOfficeService";
import { parseSubmittalMeta } from "./submittalMeta";

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

export function exportTechOfficePdf(data: TechnicalOfficeItem[], meta: ReportMeta, logoBase64?: string | null) {
  const today = new Date().toLocaleDateString("pt-PT");
  const title = meta.locale === "pt" ? "Oficina Técnica" : "Oficina Técnica";
  const header = fullPdfHeader(logoBase64 ?? null, `LINHA DO SUL — ${meta.projectCode}`, "OT-LISTA", "0", today);

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

  const html = `<!DOCTYPE html><html lang="${meta.locale}"><head><meta charset="UTF-8"/><title>${title} — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>
${header}
${bodyHtml}
<div class="atlas-footer"><span>Atlas QMS</span><span>OT-${meta.projectCode}</span></div>
</body></html>`;
  printHtml(html, buildReportFilename("OT", meta.projectCode, "lista"));
}

export function exportTechOfficeDetailPdf(
  item: TechnicalOfficeItem,
  messages: TechOfficeMessage[],
  meta: ReportMeta,
  logoBase64?: string | null,
) {
  const today = new Date().toLocaleDateString("pt-PT");
  const docCode = item.code ?? item.title.slice(0, 20);
  const header = fullPdfHeader(logoBase64 ?? null, `LINHA DO SUL — ${meta.projectCode}`, docCode, "0", today);

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

  const isSubmittal = item.type === "SUBMITTAL";
  const parsed = isSubmittal ? parseSubmittalMeta(item.description) : null;
  const visibleDesc = parsed ? parsed.visibleDescription : item.description;
  const sMeta = parsed?.meta;

  const descHtml = visibleDesc
    ? `<div class="atlas-section">Descrição</div><p style="font-size:11px;line-height:1.6;white-space:pre-wrap;">${visibleDesc}</p>`
    : "";

  const submittalMetaHtml = isSubmittal && sMeta
    ? `<div class="atlas-section">Dados Técnicos do Submittal</div>
       ${infoGridHtml([
         ["Disciplina", sMeta.discipline || "—"],
         ["Tipo", sMeta.subtype || "—"],
         ["Fornecedor", sMeta.supplier_name || "—"],
         ["Subempreiteiro", sMeta.subcontractor_name || "—"],
         ["Ref. Normativa", sMeta.spec_reference || "—"],
         ["Revisão", sMeta.revision || "0"],
         ["Aprovação", sMeta.approval_result || "pending"],
         ["Submetido em", sMeta.submitted_at || "—"],
       ])}`
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

  const html = `<!DOCTYPE html><html lang="${meta.locale}"><head><meta charset="UTF-8"/><title>${item.type} ${docCode} — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>
${header}
${bodyHtml}
<div class="atlas-footer"><span>Atlas QMS</span><span>OT-${meta.projectCode}-${item.code ?? ""}</span></div>
</body></html>`;
  printHtml(html, buildReportFilename("OT", meta.projectCode, item.code ?? "detail"));
}
