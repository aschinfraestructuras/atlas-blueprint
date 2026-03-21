/**
 * Shared project identification header strip for all PDF exports.
 * Renders a compact 2-row grid below the main header with project metadata.
 */

import { escapeHtml } from "@/lib/utils/escapeHtml";

export interface PdfProjectInfo {
  name?: string | null;
  code?: string | null;
  contractor?: string | null;
  client?: string | null;
  location?: string | null;
  contract_number?: string | null;
}

function val(v?: string | null): string {
  return v ? escapeHtml(v) : "—";
}

export function projectInfoStripHtml(project?: PdfProjectInfo | null): string {
  return `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:8px 20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;">
    <div><span style="color:#6b7280;font-weight:600;">EMPREITADA</span><br>${val(project?.code)} — ${val(project?.name)}</div>
    <div><span style="color:#6b7280;font-weight:600;">EMPREITEIRO</span><br>${val(project?.contractor)}</div>
    <div><span style="color:#6b7280;font-weight:600;">DONO DE OBRA</span><br>${val(project?.client)}</div>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:0;padding:6px 20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;margin-bottom:16px;">
    <div><span style="color:#6b7280;font-weight:600;">LOCALIZAÇÃO</span><br>${val(project?.location)}</div>
    <div><span style="color:#6b7280;font-weight:600;">EXTENSÃO</span><br>—</div>
    <div><span style="color:#6b7280;font-weight:600;">CONTRATO</span><br>${val(project?.contract_number)}</div>
  </div>`;
}

/**
 * Full institutional PDF header with logo, project name, doc code, and contractor info.
 */
export function fullPdfHeader(
  logoBase64: string | null,
  projectName: string,
  docCode: string,
  revision: string,
  date: string,
  empreiteiro = "—",
  donoObra = "—",
): string {
  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" style="height:12mm;max-width:40mm;object-fit:contain;" />`
    : `<div style="width:40mm;height:12mm;background:#192F48;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:900;letter-spacing:-0.5px;">ATLAS</div>`;

  return `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:10px 0 10px 0;border-bottom:3px solid #192F48;margin-bottom:0;">
    <div style="display:flex;align-items:center;gap:14px;">
      ${logoHtml}
      <div>
        <div style="font-size:14px;font-weight:800;color:#192F48;line-height:1.2;">${escapeHtml(projectName)}</div>
        <div style="font-size:9px;color:#6B7280;margin-top:2px;">${escapeHtml(empreiteiro)}</div>
        <div style="font-size:9px;color:#6B7280;">${escapeHtml(donoObra)}</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;font-weight:700;color:#192F48;font-family:monospace;">${escapeHtml(docCode)}</div>
      <div style="font-size:9px;color:#6B7280;margin-top:2px;">Rev. ${escapeHtml(revision)}</div>
      <div style="font-size:9px;color:#6B7280;">${escapeHtml(date)}</div>
    </div>
  </div>
  ${projectInfoStripHtml()}`;
}
