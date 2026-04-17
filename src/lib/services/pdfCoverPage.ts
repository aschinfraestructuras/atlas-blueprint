/**
 * Capa institucional para PDFs do Atlas QMS.
 * Renderiza uma página A4 inteira com logo grande, nome da obra, código,
 * dados do empreiteiro/dono de obra, data e bloco de assinaturas opcional.
 *
 * Uso típico:
 *   const html = `${coverPageHtml({ title: "Relatório Mensal", logoBase64, ...meta })}
 *                 ${restOfDocumentHtml}`;
 */

import { escapeHtml } from "@/lib/utils/escapeHtml";

export interface CoverPageOptions {
  /** Título do documento (ex: "Relatório Mensal de Qualidade") */
  title: string;
  /** Subtítulo opcional (ex: período, número de revisão) */
  subtitle?: string;
  /** Código do documento (ex: RM-2024-11) */
  docCode?: string;
  /** Revisão do documento */
  revision?: string;
  /** Data de emissão (string já formatada) */
  date?: string;
  /** Logótipo em base64 (data URL) */
  logoBase64?: string | null;
  /** Metadados do projeto */
  projectName?: string | null;
  projectCode?: string | null;
  contractor?: string | null;
  client?: string | null;
  location?: string | null;
  contractNumber?: string | null;
  /** Bloco de assinaturas: lista de papéis (ex: ["Director de Obra", "Fiscalização"]) */
  signatureRoles?: string[];
  /** Texto de classificação (default: "Confidencial — Uso Interno") */
  classification?: string;
}

function val(v?: string | null): string {
  return v && v.trim() ? escapeHtml(v) : "—";
}

export function coverPageHtml(opts: CoverPageOptions): string {
  const {
    title,
    subtitle,
    docCode,
    revision,
    date,
    logoBase64,
    projectName,
    projectCode,
    contractor,
    client,
    location,
    contractNumber,
    signatureRoles = [],
    classification = "Confidencial — Uso Interno",
  } = opts;

  const logo = logoBase64
    ? `<img src="${logoBase64}" style="max-width:100mm;max-height:50mm;object-fit:contain;" alt="logo" />`
    : `<div style="width:90mm;height:30mm;background:#192F48;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:900;letter-spacing:-1px;">ATLAS QMS</div>`;

  const sigCells = signatureRoles.length > 0
    ? signatureRoles.map(role => `
        <div style="border:1px solid #C4CBD4;border-radius:4px;padding:14px 12px;min-height:38mm;display:flex;flex-direction:column;justify-content:flex-end;">
          <div style="border-top:1px solid #1A1A1A;margin-bottom:6px;"></div>
          <div style="font-size:9px;color:#505A68;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(role)}</div>
          <div style="font-size:8px;color:#9CA3AF;margin-top:3px;">Nome / Data / Assinatura</div>
        </div>
      `).join("")
    : "";

  const sigGrid = sigCells
    ? `<div style="display:grid;grid-template-columns:repeat(${Math.min(signatureRoles.length, 3)}, 1fr);gap:10mm;margin-top:10mm;">${sigCells}</div>`
    : "";

  return `
  <section style="page-break-after:always;width:100%;min-height:265mm;padding:0;display:flex;flex-direction:column;font-family:Arial,sans-serif;color:#1A1A1A;">
    <!-- Faixa superior decorativa -->
    <div style="height:8mm;background:linear-gradient(90deg,#192F48 0%,#24436A 60%,#3B5B82 100%);"></div>

    <!-- Bloco do logo -->
    <div style="text-align:center;padding:30mm 16mm 14mm 16mm;">
      ${logo}
    </div>

    <!-- Título principal -->
    <div style="text-align:center;padding:0 20mm;">
      <div style="font-size:11px;font-weight:700;color:#505A68;text-transform:uppercase;letter-spacing:0.18em;margin-bottom:4mm;">
        ${escapeHtml(classification)}
      </div>
      <h1 style="font-size:32px;font-weight:900;color:#192F48;margin:0 0 6mm 0;line-height:1.15;letter-spacing:-0.5px;">
        ${escapeHtml(title)}
      </h1>
      ${subtitle ? `<div style="font-size:14px;color:#24436A;font-weight:600;margin-bottom:6mm;">${escapeHtml(subtitle)}</div>` : ""}
      <div style="width:60mm;height:3px;background:#192F48;margin:8mm auto 0;border-radius:2px;"></div>
    </div>

    <!-- Bloco de metadados do projeto -->
    <div style="margin:18mm 16mm 0 16mm;border:1px solid #C4CBD4;border-radius:6px;overflow:hidden;">
      <div style="background:#192F48;color:#fff;padding:6px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">
        Identificação da Obra
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <tr>
          <td style="padding:8px 12px;width:30%;background:#F1F3F5;font-weight:700;color:#505A68;text-transform:uppercase;font-size:8px;letter-spacing:0.08em;">Empreitada</td>
          <td style="padding:8px 12px;color:#1A1A1A;">${val(projectCode)} — ${val(projectName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#F1F3F5;font-weight:700;color:#505A68;text-transform:uppercase;font-size:8px;letter-spacing:0.08em;border-top:1px solid #E5E7EB;">Empreiteiro</td>
          <td style="padding:8px 12px;color:#1A1A1A;border-top:1px solid #E5E7EB;">${val(contractor)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#F1F3F5;font-weight:700;color:#505A68;text-transform:uppercase;font-size:8px;letter-spacing:0.08em;border-top:1px solid #E5E7EB;">Dono de Obra</td>
          <td style="padding:8px 12px;color:#1A1A1A;border-top:1px solid #E5E7EB;">${val(client)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#F1F3F5;font-weight:700;color:#505A68;text-transform:uppercase;font-size:8px;letter-spacing:0.08em;border-top:1px solid #E5E7EB;">Localização</td>
          <td style="padding:8px 12px;color:#1A1A1A;border-top:1px solid #E5E7EB;">${val(location)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#F1F3F5;font-weight:700;color:#505A68;text-transform:uppercase;font-size:8px;letter-spacing:0.08em;border-top:1px solid #E5E7EB;">Contrato</td>
          <td style="padding:8px 12px;color:#1A1A1A;border-top:1px solid #E5E7EB;">${val(contractNumber)}</td>
        </tr>
      </table>
    </div>

    <!-- Bloco de info do documento -->
    <div style="margin:8mm 16mm 0 16mm;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;font-size:10px;">
      <div style="border:1px solid #C4CBD4;border-radius:6px;padding:8px 10px;">
        <div style="font-size:8px;color:#505A68;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">Código</div>
        <div style="font-family:monospace;font-weight:700;color:#192F48;">${val(docCode)}</div>
      </div>
      <div style="border:1px solid #C4CBD4;border-radius:6px;padding:8px 10px;">
        <div style="font-size:8px;color:#505A68;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">Revisão</div>
        <div style="font-weight:700;color:#192F48;">${val(revision)}</div>
      </div>
      <div style="border:1px solid #C4CBD4;border-radius:6px;padding:8px 10px;">
        <div style="font-size:8px;color:#505A68;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">Data</div>
        <div style="font-weight:700;color:#192F48;">${val(date)}</div>
      </div>
    </div>

    <!-- Bloco de assinaturas -->
    ${sigGrid ? `<div style="margin:0 16mm;flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:12mm;">
      <div style="font-size:9px;color:#505A68;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4mm;">Aprovações</div>
      ${sigGrid}
    </div>` : `<div style="flex:1;"></div>`}

    <!-- Faixa inferior -->
    <div style="height:6mm;background:linear-gradient(90deg,#192F48 0%,#24436A 100%);"></div>
  </section>`;
}
