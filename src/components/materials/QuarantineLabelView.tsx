import type { Material } from "@/lib/services/materialService";
import { escapeHtml } from "@/lib/utils/escapeHtml";

interface QuarantineLabelProps {
  material: Material;
  nc?: { code: string | null; description: string; detected_at: string } | null;
}

function buildLabelHtml(material: Material, nc?: QuarantineLabelProps["nc"]): string {
  const labelBlock = (idx: number) => `
    <div style="width:100%;height:50vh;box-sizing:border-box;padding:16mm 20mm;display:flex;flex-direction:column;justify-content:space-between;page-break-after:${idx === 0 ? "auto" : "avoid"};">
      <div>
        <div style="background:#DC2626;color:#fff;padding:14px 20px;border-radius:8px;text-align:center;font-size:20px;font-weight:900;letter-spacing:0.05em;">
          ⛔ NÃO USAR — MATERIAL EM QUARENTENA
        </div>
        <table style="width:100%;margin-top:20px;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:8px 4px;font-weight:700;width:140px;border-bottom:1px solid #e5e5e5;">N.º RNC</td>
             <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">${escapeHtml(nc?.code ?? "—")}</td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;border-bottom:1px solid #e5e5e5;">Data</td>
            <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">${nc?.detected_at ? new Date(nc.detected_at).toLocaleDateString("pt-PT") : new Date().toLocaleDateString("pt-PT")}</td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;border-bottom:1px solid #e5e5e5;">Material</td>
            <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">${escapeHtml(material.name)} (${escapeHtml(material.code)})</td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;border-bottom:1px solid #e5e5e5;">Lote / Série</td>
            <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">________________</td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;border-bottom:1px solid #e5e5e5;">Razão</td>
            <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">${nc?.description ?? material.rejection_reason ?? "—"}</td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;border-bottom:1px solid #e5e5e5;">Acção</td>
            <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">
              ☐ Re-ensaio &nbsp;&nbsp; ☐ Devolver ao fornecedor &nbsp;&nbsp; ☐ Aguardar decisão &nbsp;&nbsp; ☐ Rejeitar
            </td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;border-bottom:1px solid #e5e5e5;">TQ</td>
            <td style="padding:8px 4px;border-bottom:1px solid #e5e5e5;">________________________________</td>
          </tr>
          <tr>
            <td style="padding:8px 4px;font-weight:700;">Assinatura</td>
            <td style="padding:8px 4px;">________________________________</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;font-size:9px;color:#999;border-top:1px solid #e5e5e5;padding-top:8px;">
        Atlas QMS · PF17A · ACE ASCH Infraestructuras + Cimontubo
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Etiqueta de Quarentena — ${material.code}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; }
  @page { size: A4 portrait; margin: 0; }
</style>
</head><body>
${labelBlock(0)}
${labelBlock(1)}
</body></html>`;
}

export function printQuarantineLabel(
  material: Material,
  nc?: QuarantineLabelProps["nc"],
) {
  const html = buildLabelHtml(material, nc);
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}
