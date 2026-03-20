import { fullPdfHeader } from "./pdfProjectHeader";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import { escapeHtml, esc } from "@/lib/utils/escapeHtml";
import type { RecycledMaterial } from "./recycledMaterialService";

const sharedCss = `
  body { font-family: ${ATLAS_PDF.fonts.base}, sans-serif; font-size: 10px; color: ${ATLAS_PDF.colors.ink}; margin: 0; padding: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid ${ATLAS_PDF.colors.rule}; padding: 6px 8px; text-align: left; font-size: 9px; }
  th { background: ${ATLAS_PDF.colors.navy}; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; }
  .section-title { font-size: 11px; font-weight: 700; color: ${ATLAS_PDF.colors.navy}; margin: 16px 0 6px 0; border-bottom: 2px solid ${ATLAS_PDF.colors.navy}; padding-bottom: 3px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .info-row label { font-size: 8px; font-weight: 600; color: ${ATLAS_PDF.colors.muted}; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-row .val { font-size: 10px; margin-top: 1px; }
`;

function printHtml(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
}

export function exportRecycledMaterialPdf(
  item: RecycledMaterial,
  logoBase64: string | null,
  projectName: string,
) {
  const date = new Date().toLocaleDateString("pt-PT");
  const header = fullPdfHeader(logoBase64, projectName, item.reference_number, "0", date);

  const row = (label: string, value: string | number | null | undefined) =>
    `<div class="info-row"><label>${label}</label><div class="val">${value ?? "—"}</div></div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${item.reference_number}</title>
    <style>${sharedCss}</style></head><body>
    ${header}
    <div class="section-title">Ficha de Material Reciclado / Reutilizado</div>
    <div class="info-grid">
      ${row("Referência", item.reference_number)}
      ${row("Tipo", item.reference_type)}
      ${row("Material", item.material_name)}
      ${row("Fornecedor", item.supplier_name)}
      ${row("Composição", item.composition)}
      ${row("% Reciclado", item.recycled_content_pct != null ? `${item.recycled_content_pct}%` : null)}
      ${row("N.º Série", item.serial_number)}
      ${row("Qtd. Prevista", item.quantity_planned != null ? `${item.quantity_planned} ${item.unit ?? ""}` : null)}
      ${row("Qtd. Aplicada", item.quantity_used != null ? `${item.quantity_used} ${item.unit ?? ""}` : null)}
      ${row("Local Aplicação", item.application_location)}
      ${row("Data Aplicação", item.application_date)}
      ${row("N.º Certificado", item.certificate_number)}
      ${row("Ref. Documental", item.document_ref)}
      ${row("Estado", item.status)}
    </div>
    ${item.observations ? `<div class="section-title">Observações</div><p style="font-size:10px;white-space:pre-wrap;">${item.observations}</p>` : ""}
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;font-size:9px;text-align:center;">
      <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Elaborado por</div>
      <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Verificado por</div>
      <div style="border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:6px;">Aprovado por</div>
    </div>
    <div style="margin-top:20px;text-align:center;font-size:8px;color:${ATLAS_PDF.colors.muted};">
      ${ATLAS_PDF.footer.left} · Gerado em ${date}
    </div>
  </body></html>`;

  printHtml(html);
}
