import { fullPdfHeader } from "./pdfProjectHeader";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import type { Laboratory } from "./laboratoryService";

const sharedCss = `
  body { font-family: ${ATLAS_PDF.fonts.base}, sans-serif; font-size: 10px; color: ${ATLAS_PDF.colors.ink}; margin: 0; padding: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid ${ATLAS_PDF.colors.rule}; padding: 5px 8px; text-align: left; font-size: 9px; }
  th { background: ${ATLAS_PDF.colors.navy}; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; }
  tr:nth-child(even) td { background: ${ATLAS_PDF.colors.tint}; }
  .section-title { font-size: 11px; font-weight: 700; color: ${ATLAS_PDF.colors.navy}; margin: 16px 0 6px 0; border-bottom: 2px solid ${ATLAS_PDF.colors.navy}; padding-bottom: 3px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .info-row label { font-size: 8px; font-weight: 600; color: ${ATLAS_PDF.colors.muted}; text-transform: uppercase; }
  .info-row .val { font-size: 10px; margin-top: 1px; }
`;

function printHtml(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
}

export interface LabTestRow {
  code: string | null;
  material: string | null;
  result_status: string | null;
  date: string | null;
}

export function exportLaboratoryPdf(
  lab: Laboratory,
  stats: { total: number; pass: number; fail: number; pending: number },
  recentTests: LabTestRow[],
  logoBase64: string | null,
  projectName: string,
) {
  const date = new Date().toLocaleDateString("pt-PT");
  const labName = lab.suppliers?.name ?? "Laboratório";
  const docCode = `LAB-${lab.accreditation_code ?? lab.id.slice(0, 8).toUpperCase()}`;
  const header = fullPdfHeader(logoBase64, projectName, docCode, "0", date);

  const row = (label: string, value: string | null | undefined) =>
    `<div class="info-row"><label>${label}</label><div class="val">${value ?? "—"}</div></div>`;

  const testRows = recentTests.map(t => `<tr>
    <td>${t.code ?? "—"}</td>
    <td>${t.material ?? "—"}</td>
    <td>${t.result_status ?? "—"}</td>
    <td>${t.date ?? "—"}</td>
  </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docCode}</title>
    <style>${sharedCss}</style></head><body>
    ${header}
    <div class="section-title">Ficha de Laboratório</div>
    <div class="info-grid">
      ${row("Nome / Fornecedor", labName)}
      ${row("Código Fornecedor", lab.suppliers?.code)}
      ${row("Entidade Acreditação", lab.accreditation_body)}
      ${row("Código Acreditação", lab.accreditation_code)}
      ${row("Validade Acreditação", (lab as any).accreditation_valid_until ?? null)}
      ${row("Âmbito", lab.scope)}
      ${row("Contacto", lab.contact_name)}
      ${row("Email", lab.contact_email)}
      ${row("Telefone", lab.contact_phone)}
    </div>
    ${lab.notes ? `<div class="section-title">Observações</div><p style="font-size:10px;white-space:pre-wrap;">${lab.notes}</p>` : ""}
    <div class="section-title">KPIs de Ensaios</div>
    <div class="info-grid">
      ${row("Total Ensaios", String(stats.total))}
      ${row("Conformes", String(stats.pass))}
      ${row("Não Conformes", String(stats.fail))}
      ${row("Pendentes", String(stats.pending))}
    </div>
    ${recentTests.length > 0 ? `
    <div class="section-title">Ensaios Recentes</div>
    <table><thead><tr><th>Código</th><th>Tipo</th><th>Resultado</th><th>Data</th></tr></thead>
    <tbody>${testRows}</tbody></table>` : ""}
    <div style="margin-top:30px;text-align:center;font-size:8px;color:${ATLAS_PDF.colors.muted};">
      ${ATLAS_PDF.footer.left} · Gerado em ${date}
    </div>
  </body></html>`;

  printHtml(html);
}
