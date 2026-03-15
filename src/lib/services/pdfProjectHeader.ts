/**
 * Shared project identification header strip for all PDF exports.
 * Renders a compact 2-row grid below the main header with project metadata.
 */

export function projectInfoStripHtml(): string {
  return `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:8px 20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;">
    <div><span style="color:#6b7280;font-weight:600;">EMPREITADA</span><br>PF17A — Linha do Sul</div>
    <div><span style="color:#6b7280;font-weight:600;">EMPREITEIRO</span><br>ACE ASCH Infraestructuras + Cimontubo</div>
    <div><span style="color:#6b7280;font-weight:600;">DONO DE OBRA</span><br>IP — Infraestruturas de Portugal, S.A.</div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:0;padding:6px 20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;margin-bottom:16px;">
    <div><span style="color:#6b7280;font-weight:600;">LOCALIZAÇÃO</span><br>Porto de Setúbal — Praias do Sado</div>
    <div><span style="color:#6b7280;font-weight:600;">EXTENSÃO</span><br>PK 29+730 a PK 33+700 (~4 km)</div>
    <div><span style="color:#6b7280;font-weight:600;">CONTRATO</span><br>Nº CE/2024/PF17A</div>
  </div>`;
}
