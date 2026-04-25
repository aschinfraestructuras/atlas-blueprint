/**
 * riskExportService — Exportação PDF do Registo de Riscos
 * Segue o padrão HTML print do Atlas (printHtml + fullPdfHeader)
 */
import { printHtml, sharedCss, footerHtml } from "./reportService";
import { fullPdfHeader } from "./pdfProjectHeader";

function esc(s?: string | null): string {
  if (!s) return "—";
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function dateStr(d?: string | null): string {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-PT");
}

export interface RiskItem {
  id: string; code: string; is_opportunity: boolean; risk_category: string;
  title: string; description: string | null; origin: string | null;
  probability: number; impact: number; risk_level: string;
  preventive_measure: string | null; contingency_measure: string | null;
  responsible_name: string | null; status: string; review_date: string | null;
  residual_probability: number | null; residual_impact: number | null;
  residual_level: string | null; notes: string | null; created_at: string;
}

export interface RiskExportLabels {
  appName: string; reportTitle: string; generatedOn: string; page: string;
  fields: {
    code: string; category: string; title: string; status: string;
    description: string; origin: string; probability: string; impact: string;
    level: string; preventive: string; contingency: string;
    responsible: string; reviewDate: string; residualProb: string;
    residualImpact: string; residualLevel: string; notes: string;
  };
  levels: Record<string, string>;
  statuses: Record<string, string>;
  categories: Record<string, string>;
  opportunity: string; risk: string;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#7f1d1d", text: "#fff" },
  high:     { bg: "#ef4444", text: "#fff" },
  medium:   { bg: "#f59e0b", text: "#fff" },
  low:      { bg: "#22c55e", text: "#fff" },
};

export function buildRiskListHtml(
  risks: RiskItem[],
  projectName: string,
  logoBase64: string | null,
  labels: RiskExportLabels,
): string {
  const today = new Date().toLocaleDateString("pt-PT");
  const header = fullPdfHeader(logoBase64, projectName, "REG-RISCOS", "0", today);
  const css = sharedCss();

  const rows = risks.map((r, i) => {
    const lc = LEVEL_COLORS[r.risk_level] ?? { bg: "#94a3b8", text: "#fff" };
    const rlc = r.residual_level ? (LEVEL_COLORS[r.residual_level] ?? lc) : lc;
    const bg = i % 2 === 0 ? "#fff" : "#f8fafc";
    return `
      <tr style="background:${bg}">
        <td style="padding:4px;border:1px solid #ddd;font-family:monospace;font-size:10px">${esc(r.code)}</td>
        <td style="padding:4px;border:1px solid #ddd;font-size:10px">${esc(r.is_opportunity ? labels.opportunity : labels.risk)}</td>
        <td style="padding:4px;border:1px solid #ddd;font-size:10px">${esc(labels.categories[r.risk_category] ?? r.risk_category)}</td>
        <td style="padding:4px;border:1px solid #ddd;font-weight:600;font-size:11px">${esc(r.title)}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center">
          <span style="background:${lc.bg};color:${lc.text};padding:2px 6px;border-radius:9999px;font-size:9px;font-weight:bold">
            ${r.probability}×${r.impact}
          </span>
        </td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center">
          <span style="background:${lc.bg};color:${lc.text};padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:bold">
            ${esc(labels.levels[r.risk_level] ?? r.risk_level)}
          </span>
        </td>
        <td style="padding:4px;border:1px solid #ddd;font-size:10px">${esc(r.preventive_measure)}</td>
        <td style="padding:4px;border:1px solid #ddd;font-size:10px">${esc(r.responsible_name)}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center">
          <span style="background:${r.residual_level ? rlc.bg : '#94a3b8'};color:${r.residual_level ? rlc.text : '#fff'};padding:2px 6px;border-radius:9999px;font-size:9px;font-weight:bold">
            ${r.residual_probability && r.residual_impact ? `${r.residual_probability}×${r.residual_impact}` : "—"}
          </span>
        </td>
        <td style="padding:4px;border:1px solid #ddd;text-align:center;font-size:10px">
          ${esc(labels.statuses[r.status] ?? r.status)}
        </td>
      </tr>`;
  }).join("");

  const body = `
    <div style="font-size:16px;font-weight:bold;color:#1e3a5f;margin-bottom:12px;border-bottom:2px solid #1e3a5f;padding-bottom:4px">
      ${esc(labels.reportTitle)} (${risks.length})
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#1e3a5f;color:#fff">
          <th style="padding:5px;text-align:left">${esc(labels.fields.code)}</th>
          <th style="padding:5px">Tipo</th>
          <th style="padding:5px;text-align:left">${esc(labels.fields.category)}</th>
          <th style="padding:5px;text-align:left">${esc(labels.fields.title)}</th>
          <th style="padding:5px">P×I</th>
          <th style="padding:5px">${esc(labels.fields.level)}</th>
          <th style="padding:5px;text-align:left">${esc(labels.fields.preventive)}</th>
          <th style="padding:5px;text-align:left">${esc(labels.fields.responsible)}</th>
          <th style="padding:5px">Residual</th>
          <th style="padding:5px">${esc(labels.fields.status)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${footerHtml(labels.appName, labels.generatedOn, today, labels.page)}
  `;

  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
    <title>${esc(labels.reportTitle)}</title>
    ${css}
    <style>@page { size: A4 landscape; margin: 15mm; } body { font-family: Arial, sans-serif; }</style>
  </head><body>${header}${body}</body></html>`;
}

export function exportRisksPdf(
  risks: RiskItem[],
  projectName: string,
  logoBase64: string | null,
  labels: RiskExportLabels,
): void {
  const html = buildRiskListHtml(risks, projectName, logoBase64, labels);
  const filename = `REG-RISCOS-${projectName.replace(/\s+/g, "-")}.pdf`;
  printHtml(html, filename);
}
