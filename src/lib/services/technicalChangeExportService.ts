/**
 * technicalChangeExportService — Exportação PDF de Alterações Técnicas / Desvios
 * Segue o padrão HTML print do Atlas (printHtml + fullPdfHeader)
 */
import { printHtml, infoGridHtml, sharedCss, footerHtml } from "./reportService";
import { fullPdfHeader } from "./pdfProjectHeader";

function esc(s?: string | null): string {
  if (!s) return "—";
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function dateStr(d?: string | null): string {
  if (!d) return "—";
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-PT");
}

export interface TechnicalChange {
  id: string; code: string; change_type: string; title: string;
  description: string | null; origin_ref: string | null; requested_by: string | null;
  status: string; priority: string; submitted_at: string | null;
  approved_at: string | null; approved_by: string | null; approval_ref: string | null;
  implementation_deadline: string | null; implemented_at: string | null;
  requires_new_test: boolean; dfo_impact: string | null; notes: string | null;
  created_at: string;
  work_item?: { obra: string; lote: string | null } | null;
}

export interface TechnicalChangeLabels {
  appName: string; reportTitle: string; generatedOn: string; page: string;
  fields: {
    code: string; type: string; title: string; status: string; priority: string;
    description: string; originRef: string; requestedBy: string;
    submittedAt: string; approvedAt: string; approvedBy: string; approvalRef: string;
    deadline: string; implementedAt: string; requiresTest: string; dfoImpact: string;
    notes: string; workItem: string;
  };
  types: Record<string, string>;
  statuses: Record<string, string>;
  priorities: Record<string, string>;
  yes: string; no: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#7f1d1d",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8", under_review: "#f59e0b", approved: "#22c55e",
  rejected: "#ef4444", implemented: "#3b82f6", closed: "#6b7280",
};

export function buildTechnicalChangeHtml(
  tc: TechnicalChange,
  projectName: string,
  logoBase64: string | null,
  labels: TechnicalChangeLabels,
): string {
  const today = new Date().toLocaleDateString("pt-PT");
  const priorityColor = PRIORITY_COLORS[tc.priority] ?? "#94a3b8";
  const statusColor   = STATUS_COLORS[tc.status] ?? "#94a3b8";

  const header = fullPdfHeader(logoBase64, projectName, tc.code, "0", today);
  const css = sharedCss();

  const body = `
    <div class="section-title">${esc(labels.reportTitle)}</div>

    <table class="info-grid" style="width:100%;border-collapse:collapse;margin-bottom:12px">
      <tr>
        <td style="width:20%;font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.code)}</td>
        <td style="padding:4px;border:1px solid #ddd;font-family:monospace">${esc(tc.code)}</td>
        <td style="width:20%;font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.type)}</td>
        <td style="padding:4px;border:1px solid #ddd">${esc(labels.types[tc.change_type] ?? tc.change_type)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.status)}</td>
        <td style="padding:4px;border:1px solid #ddd">
          <span style="background:${statusColor}20;color:${statusColor};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:bold">
            ${esc(labels.statuses[tc.status] ?? tc.status)}
          </span>
        </td>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.priority)}</td>
        <td style="padding:4px;border:1px solid #ddd">
          <span style="background:${priorityColor}20;color:${priorityColor};padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:bold">
            ${esc(labels.priorities[tc.priority] ?? tc.priority)}
          </span>
        </td>
      </tr>
    </table>

    <table class="info-grid" style="width:100%;border-collapse:collapse;margin-bottom:12px">
      <tr>
        <td colspan="4" style="font-weight:bold;padding:6px;background:#1e3a5f;color:#fff;font-size:11px">
          ${esc(labels.fields.title)}
        </td>
      </tr>
      <tr>
        <td colspan="4" style="padding:8px;border:1px solid #ddd;font-size:13px;font-weight:600">
          ${esc(tc.title)}
        </td>
      </tr>
      ${tc.description ? `
      <tr>
        <td colspan="4" style="font-weight:bold;padding:6px;background:#f8fafc;border:1px solid #ddd">
          ${esc(labels.fields.description)}
        </td>
      </tr>
      <tr>
        <td colspan="4" style="padding:8px;border:1px solid #ddd;white-space:pre-wrap">
          ${esc(tc.description)}
        </td>
      </tr>` : ""}
    </table>

    <table class="info-grid" style="width:100%;border-collapse:collapse;margin-bottom:12px">
      <tr>
        <td style="width:25%;font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.originRef)}</td>
        <td style="padding:4px;border:1px solid #ddd">${esc(tc.origin_ref)}</td>
        <td style="width:25%;font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.requestedBy)}</td>
        <td style="padding:4px;border:1px solid #ddd">${esc(tc.requested_by)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.submittedAt)}</td>
        <td style="padding:4px;border:1px solid #ddd">${dateStr(tc.submitted_at)}</td>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.deadline)}</td>
        <td style="padding:4px;border:1px solid #ddd;${tc.implementation_deadline && new Date(tc.implementation_deadline) < new Date() && tc.status !== 'implemented' && tc.status !== 'closed' ? 'color:#ef4444;font-weight:bold' : ''}">
          ${dateStr(tc.implementation_deadline)}
        </td>
      </tr>
      <tr>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.approvedAt)}</td>
        <td style="padding:4px;border:1px solid #ddd">${dateStr(tc.approved_at)}</td>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.approvedBy)}</td>
        <td style="padding:4px;border:1px solid #ddd">${esc(tc.approved_by)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.approvalRef)}</td>
        <td style="padding:4px;border:1px solid #ddd">${esc(tc.approval_ref)}</td>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.implementedAt)}</td>
        <td style="padding:4px;border:1px solid #ddd">${dateStr(tc.implemented_at)}</td>
      </tr>
      <tr>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.requiresTest)}</td>
        <td style="padding:4px;border:1px solid #ddd">${tc.requires_new_test ? labels.yes : labels.no}</td>
        <td style="font-weight:bold;padding:4px;border:1px solid #ddd">${esc(labels.fields.workItem)}</td>
        <td style="padding:4px;border:1px solid #ddd">${tc.work_item ? esc(`${tc.work_item.obra} ${tc.work_item.lote ?? ""}`) : "—"}</td>
      </tr>
    </table>

    ${tc.dfo_impact ? `
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px;margin-bottom:12px">
      <div style="font-weight:bold;font-size:11px;color:#92400e;margin-bottom:4px">⚠ ${esc(labels.fields.dfoImpact)}</div>
      <div style="white-space:pre-wrap;color:#78350f">${esc(tc.dfo_impact)}</div>
    </div>` : ""}

    ${tc.notes ? `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:12px">
      <div style="font-weight:bold;font-size:11px;color:#475569;margin-bottom:4px">${esc(labels.fields.notes)}</div>
      <div style="white-space:pre-wrap">${esc(tc.notes)}</div>
    </div>` : ""}

    ${footerHtml(`${labels.appName} — ${labels.generatedOn} ${today} — ${labels.page}`, { appName: labels.appName } as any)}
  `;

  return `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8">
    <title>${esc(tc.code)} — ${esc(tc.title)}</title>
    ${css}
    <style>
      @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
      .section-title { font-size:16px; font-weight:bold; color:#1e3a5f; margin-bottom:12px; border-bottom:2px solid #1e3a5f; padding-bottom:4px; }
    </style>
  </head><body>${header}${body}</body></html>`;
}

export function exportTechnicalChangePdf(
  tc: TechnicalChange,
  projectName: string,
  logoBase64: string | null,
  labels: TechnicalChangeLabels,
): void {
  const html = buildTechnicalChangeHtml(tc, projectName, logoBase64, labels);
  printHtml(html, `${tc.code}.pdf`);
}
