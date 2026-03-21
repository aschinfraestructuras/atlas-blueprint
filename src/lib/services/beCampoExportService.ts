/**
 * BE-CAMPO Export Service — Atlas QMS
 * Generates printWindow PDF matching BE-CAMPO-PF17A physical document.
 */

import type { TestResult } from "./testService";
import { printHtml } from "./reportService";
import { projectInfoStripHtml } from "./pdfProjectHeader";
import { esc } from "@/lib/utils/escapeHtml";

const BRAND = { primary: "#2F4F75", muted: "#6B7280", border: "#E5E7EB", bg: "#F9FAFB" };

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-PT"); } catch { return iso.slice(0, 10); }
}

const TEST_TYPE_LABELS: Record<string, string> = {
  compaction_nuclear: "Compactação γd (nuclear)",
  compaction_plate: "Compactação Ev2/Ev1 (placa)",
  slump: "Slump / Abaixamento",
  temperature: "Temperatura betão",
  insulation: "Resistência isolamento",
  earth_resistance: "Resistência terra",
  otdr: "OTDR",
};

export function exportBeCampoPdf(
  result: TestResult & { be_campo_code?: string | null; eme_code?: string | null; eme_calibration_date?: string | null; location_pk?: string | null; weather?: string | null; ambient_temperature?: number | null; gr_id?: string | null; gr_code?: string | null },
  projectName: string,
  logoBase64?: string | null,
) {
  const code = result.be_campo_code ?? result.code ?? "BE-CAMPO";
  const tc = result.tests_catalog as any;
  const testType = detectTestType(code);
  const payload = result.result_payload ?? result.result ?? {};

  // EME validity
  const emeValid = result.eme_calibration_date ? new Date(result.eme_calibration_date) >= new Date() : null;
  const emeColor = emeValid === true ? "#166534" : emeValid === false ? "#dc2626" : BRAND.muted;
  const emeLabel = emeValid === true ? "VÁLIDO" : emeValid === false ? "EXPIRADO" : "—";

  // Result badge
  const resultStatus = result.result_status ?? "pending";
  const resultColor = resultStatus === "pass" ? "#166534" : resultStatus === "fail" ? "#dc2626" : "#a16207";
  const resultLabel = resultStatus === "pass" ? "CONFORME" : resultStatus === "fail" ? "NÃO CONFORME" : resultStatus === "inconclusive" ? "INCONCLUSIVO" : "PENDENTE";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${code}</title>
<style>
  body{font-family:Arial,sans-serif;margin:30px;font-size:11px}
  h3{margin:18px 0 6px;font-size:12px;border-bottom:1px solid #ccc;padding-bottom:3px;text-transform:uppercase;letter-spacing:.08em;color:#555}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border:1px solid #ccc;padding:5px 8px;text-align:left;font-size:10px}
  th{background:#f0f4f8;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:.06em;color:#555}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${BRAND.primary};padding-bottom:10px;margin-bottom:14px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
  .label{font-weight:700;color:#555;text-transform:uppercase;font-size:8px;letter-spacing:.1em}
  .value{font-size:11px;color:#111}
  .test-types{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .test-type{padding:4px 10px;border:1px solid #ccc;border-radius:4px;font-size:9px;font-weight:600;color:#555}
  .test-type.active{border-color:${BRAND.primary};background:${BRAND.primary}11;color:${BRAND.primary};font-weight:800}
  .result-box{margin-top:18px;padding:10px 16px;border:3px solid ${resultColor};border-radius:6px;font-size:14px;font-weight:900;color:${resultColor};text-align:center}
  .sig-row{display:flex;gap:40px;margin-top:50px}
  .sig-block{flex:1;text-align:center;font-size:10px}
  .sig-block .line{border-top:1px solid #333;margin-top:40px;padding-top:4px}
  .sig-block .role{font-weight:700;color:#555;margin-bottom:2px}
  @page{size:A4 portrait;margin:14mm 12mm}
</style>
</head><body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      ${logoBase64 ? `<img src="${logoBase64}" style="height:45px;max-width:150px;object-fit:contain;" />` : ""}
      <div>
        <h2 style="color:${BRAND.primary};font-size:18px;font-weight:900;margin:0">ATLAS QMS</h2>
        <p style="color:#777;margin:2px 0 0;font-size:10px">${projectName}</p>
      </div>
    </div>
    <div style="text-align:right">
      <h2 style="font-size:16px;color:${BRAND.primary};font-weight:900;margin:0">${code}</h2>
      <p style="margin:2px 0 0;color:#777;font-size:9px;text-transform:uppercase;letter-spacing:.1em">Boletim de Ensaio de Campo</p>
    </div>
  </div>

  ${projectInfoStripHtml()}

   <h3>1. Identificação</h3>
  <div class="info-grid">
    <div><span class="label">Código BE</span><br/><span class="value">${esc(code)}</span></div>
    <div><span class="label">Data</span><br/><span class="value">${fmtDate(result.date)}</span></div>
    <div><span class="label">GR Associada</span><br/><span class="value">${esc(result.gr_code ?? (result.gr_id ? result.gr_id.slice(0, 8) + "…" : "—"))}</span></div>
    <div><span class="label">Ref. PPI</span><br/><span class="value">${esc(tc?.code)}</span></div>
    <div><span class="label">PK / Localização</span><br/><span class="value">${esc(result.location_pk ?? result.location)}</span></div>
    <div><span class="label">Responsável</span><br/><span class="value">${esc(result.created_by)}</span></div>
  </div>

  <h3>2. Tipo de Ensaio</h3>
  <div class="test-types">
    ${Object.entries(TEST_TYPE_LABELS).map(([k, v]) =>
      `<div class="test-type${testType === k ? ' active' : ''}">${v}</div>`
    ).join("")}
  </div>

  <h3>3. Equipamento de Medição (EME)</h3>
  <div class="info-grid">
    <div><span class="label">Código EME</span><br/><span class="value">${result.eme_code ?? "—"}</span></div>
    <div><span class="label">Calibração</span><br/><span class="value" style="color:${emeColor};font-weight:700">${fmtDate(result.eme_calibration_date)} — ${emeLabel}</span></div>
  </div>

  <h3>4. Resultados</h3>
  <table>
    <thead><tr><th>Parâmetro</th><th>Valor Medido</th><th>Critério Aceitação</th><th>Resultado</th></tr></thead>
    <tbody>
      ${renderPayloadRows(payload, tc?.acceptance_criteria)}
    </tbody>
  </table>

  <h3>5. Condições Ambientais</h3>
  <div class="info-grid">
    <div><span class="label">Meteorologia</span><br/><span class="value">${result.weather ?? "—"}</span></div>
    <div><span class="label">Temperatura Ambiente</span><br/><span class="value">${result.ambient_temperature != null ? `${result.ambient_temperature} °C` : "—"}</span></div>
  </div>

  <div class="result-box">${resultLabel}</div>
  ${result.notes ? `<p style="margin-top:12px;font-size:10px"><strong>Observações:</strong> ${esc(result.notes)}</p>` : ""}

  <div class="sig-row">
    <div class="sig-block">
      <div class="role">Responsável pelo Ensaio</div>
      <div>Nome: ______________________</div>
      <div>Data: ______________________</div>
      <div class="line">Assinatura</div>
    </div>
    <div class="sig-block">
      <div class="role">TQ — Técnico de Qualidade</div>
      <div>Nome: ______________________</div>
      <div>Data: ______________________</div>
      <div class="line">Assinatura</div>
    </div>
  </div>

  <div style="margin-top:30px;padding-top:8px;border-top:1px solid #ccc;font-size:8px;color:#999;display:flex;justify-content:space-between">
    <span>Atlas QMS · ${projectName} · ACE ASCH Infraestructuras + Cimontubo</span>
    <span>${code}</span>
  </div>
</body></html>`;

  printHtml(html, `${code}.pdf`);
}

function detectTestType(code: string): string {
  if (code.includes("COMP")) return code.includes("PLQ") ? "compaction_plate" : "compaction_nuclear";
  if (code.includes("SLUMP")) return "slump";
  if (code.includes("TEMP")) return "temperature";
  if (code.includes("ISO")) return "insulation";
  if (code.includes("TERRA")) return "earth_resistance";
  if (code.includes("OTDR")) return "otdr";
  return "compaction_nuclear";
}

function renderPayloadRows(payload: Record<string, unknown>, criteria?: string | null): string {
  const entries = Object.entries(payload).filter(([k]) => !["__type", "type"].includes(k));
  if (entries.length === 0) {
    return `<tr><td colspan="4" style="text-align:center;color:#999">Sem dados de resultado</td></tr>`;
  }
  return entries.map(([k, v]) => {
    const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const val = v != null ? String(v) : "—";
    return `<tr><td>${label}</td><td>${val}</td><td>${criteria ?? "—"}</td><td>—</td></tr>`;
  }).join("");
}
