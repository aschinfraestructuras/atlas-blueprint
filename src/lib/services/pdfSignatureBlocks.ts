/**
 * Reusable PDF signature block helpers for all exports.
 * Standard 3-column layout: Empreiteiro, Fiscalização, Dono de Obra.
 */

export interface SignatureRole {
  role: string;
  name?: string;
  date?: string;
}

/**
 * Standard 3-party signature block for formal construction documents.
 */
export function signatureBlockHtml(
  roles?: SignatureRole[],
): string {
  const defaultRoles: SignatureRole[] = roles ?? [
    { role: "Empreiteiro" },
    { role: "Fiscalização" },
    { role: "Dono de Obra (IP)" },
  ];

  const blocks = defaultRoles
    .map(
      (r) => `
    <div style="flex:1;text-align:center;padding:0 8px;">
      <div style="font-size:9px;font-weight:700;color:#192F48;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:16px;">${r.role}</div>
      <div style="font-size:9px;color:#6B7280;margin-bottom:6px;">Nome: ${r.name ? r.name : "______________________________"}</div>
      <div style="font-size:9px;color:#6B7280;margin-bottom:16px;">Data: ${r.date ? r.date : "_______ / _______ / _______"}</div>
      <div style="border-top:1px solid #374151;width:80%;margin:0 auto;padding-top:4px;font-size:8px;color:#9CA3AF;">Assinatura</div>
    </div>`,
    )
    .join("");

  return `
  <div style="margin-top:40px;padding-top:16px;border-top:2px solid #192F48;">
    <div style="font-size:8px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Reconhecimento e Assinaturas</div>
    <div style="display:flex;gap:12px;">
      ${blocks}
    </div>
  </div>`;
}

/**
 * Compact 2-column signature block (e.g. for field records, daily reports).
 */
export function compactSignatureBlockHtml(
  leftRole = "Responsável",
  rightRole = "Verificado por",
): string {
  return `
  <div style="margin-top:30px;padding-top:12px;border-top:1.5px solid #192F48;display:flex;gap:40px;">
    <div style="flex:1;text-align:center;">
      <div style="font-size:9px;font-weight:700;color:#192F48;margin-bottom:14px;">${leftRole}</div>
      <div style="font-size:9px;color:#6B7280;margin-bottom:5px;">Nome: ______________________________</div>
      <div style="font-size:9px;color:#6B7280;margin-bottom:14px;">Data: _______ / _______ / _______</div>
      <div style="border-top:1px solid #374151;width:70%;margin:0 auto;padding-top:3px;font-size:8px;color:#9CA3AF;">Assinatura</div>
    </div>
    <div style="flex:1;text-align:center;">
      <div style="font-size:9px;font-weight:700;color:#192F48;margin-bottom:14px;">${rightRole}</div>
      <div style="font-size:9px;color:#6B7280;margin-bottom:5px;">Nome: ______________________________</div>
      <div style="font-size:9px;color:#6B7280;margin-bottom:14px;">Data: _______ / _______ / _______</div>
      <div style="border-top:1px solid #374151;width:70%;margin:0 auto;padding-top:3px;font-size:8px;color:#9CA3AF;">Assinatura</div>
    </div>
  </div>`;
}
