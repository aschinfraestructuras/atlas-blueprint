/**
 * workerSheetExportService — Ficha Pessoal de Trabalhador (PDF)
 *
 * Gera um PDF profissional tipo "ficha individual" contendo:
 *  - Identificação completa do trabalhador
 *  - Empresa e função
 *  - Estado e datas de presença em obra
 *  - Tabela de qualificações (com validade)
 *  - Tabela de formações frequentadas
 *  - Cabeçalho institucional Atlas QMS + branding do projeto
 *
 * Usa o sistema HTML-to-Print centralizado (printHtml + buildHtmlPreviewUrl).
 */

import { fullPdfHeader } from "./pdfProjectHeader";
import { printHtml } from "./reportService";
import { esc } from "@/lib/utils/escapeHtml";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkerSheetData {
  id: string;
  name: string;
  company: string | null;
  role_function: string | null;
  worker_number: string | null;
  status: string;
  has_safety_training: boolean;
  notes: string | null;
  birth_date: string | null;
  id_number: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  entry_date: string | null;
  exit_date: string | null;
  discipline: string | null;
  ip_qual_status: string | null;
}

export interface WorkerQualification {
  id: string;
  qualification: string;
  cert_ref: string | null;
  issued_by: string | null;
  valid_from: string | null;
  valid_until: string | null;
  standard_ref: string | null;
  scope: string | null;
  ip_qualification_code: string | null;
  renewal_date: string | null;
  exam_entity: string | null;
  training_hours: number | null;
}

export interface WorkerTraining {
  id: string;
  title: string;
  session_date: string;
  session_type: string;
  trainer: string | null;
  hours: number | null;
  signed: boolean;
}

export interface WorkerSheetLabels {
  appName: string;
  reportTitle: string;
  generatedOn: string;
  // Sections
  identification: string;
  presence: string;
  qualifications: string;
  trainings: string;
  observations: string;
  // Fields
  name: string;
  company: string;
  function: string;
  workerNumber: string;
  idNumber: string;
  birthDate: string;
  contactPhone: string;
  contactEmail: string;
  discipline: string;
  status: string;
  ipQualStatus: string;
  entryDate: string;
  exitDate: string;
  safetyTraining: string;
  // Quals table
  qualType: string;
  certRef: string;
  issuedBy: string;
  standardRef: string;
  validUntil: string;
  // Trainings table
  trainingTitle: string;
  trainingDate: string;
  trainingType: string;
  trainer: string;
  hours: string;
  signed: string;
  // Empty
  empty: string;
  // Footer
  signatureWorker: string;
  signatureManager: string;
}

// ─── Brand ────────────────────────────────────────────────────────────────────

const BRAND = {
  primary:   "#2F4F75",
  muted:     "#6B7280",
  border:    "#E5E7EB",
  bg:        "#F9FAFB",
  white:     "#FFFFFF",
  text:      "#111827",
  textLight: "#6B7280",
  ok:        "#059669",
  warn:      "#D97706",
  danger:    "#DC2626",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(locale === "pt" ? "pt-PT" : "es-ES", {
      year: "numeric", month: "2-digit", day: "2-digit",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function sanitize(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 40);
}

function expiryColor(validUntil: string | null): string {
  if (!validUntil) return BRAND.muted;
  const diff = (new Date(validUntil).getTime() - Date.now()) / 86400000;
  if (diff < 0) return BRAND.danger;
  if (diff <= 30) return BRAND.warn;
  return BRAND.ok;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

export function buildWorkerSheetHtml(
  worker: WorkerSheetData,
  qualifications: WorkerQualification[],
  trainings: WorkerTraining[],
  labels: WorkerSheetLabels,
  locale: string,
  projectName: string,
  projectCode: string,
  logoBase64?: string | null,
): string {
  const fieldRow = (label: string, value: string | null | undefined) => `
    <div style="display:flex;flex-direction:column;">
      <span style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:${BRAND.muted};margin-bottom:1px;">${esc(label)}</span>
      <span style="font-size:11px;color:${BRAND.text};">${esc(value ?? "—") || "—"}</span>
    </div>`;

  const qualRows = qualifications.length === 0
    ? `<tr><td colspan="5" style="padding:10px;text-align:center;color:${BRAND.textLight};font-style:italic;">${esc(labels.empty)}</td></tr>`
    : qualifications.map(q => `
      <tr>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};">${esc(q.qualification.replace(/_/g, " "))}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};font-family:monospace;">${esc(q.cert_ref ?? "—")}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};">${esc(q.issued_by ?? "—")}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};">${esc(q.standard_ref ?? "—")}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};color:${expiryColor(q.valid_until)};font-weight:600;">${fmtDate(q.valid_until, locale)}</td>
      </tr>`).join("");

  const trainingRows = trainings.length === 0
    ? `<tr><td colspan="5" style="padding:10px;text-align:center;color:${BRAND.textLight};font-style:italic;">${esc(labels.empty)}</td></tr>`
    : trainings.map(s => `
      <tr>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};">${esc(s.title)}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};">${fmtDate(s.session_date, locale)}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};">${esc(s.session_type)}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};">${esc(s.trainer ?? "—")}</td>
        <td style="padding:5px 6px;font-size:10px;border:1px solid ${BRAND.border};text-align:center;">${s.signed ? "✓" : "—"}</td>
      </tr>`).join("");

  const today = new Date();
  const generatedOn = today.toLocaleDateString(locale === "pt" ? "pt-PT" : "es-ES");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/>
<title>${esc(labels.reportTitle)} — ${esc(worker.name)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
         font-size: 11px; color: ${BRAND.text}; background: ${BRAND.white}; padding: 14mm 12mm; }
  @page { size: A4; margin: 12mm 10mm; }
  @media print { .no-print { display:none; } body { padding: 0; } }

  h1.title { font-size: 18px; font-weight: 800; color: ${BRAND.primary};
             text-transform: uppercase; letter-spacing: .08em; margin: 12px 0 4px; }
  .subtitle { font-size: 10px; color: ${BRAND.muted}; margin-bottom: 14px; }

  .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase;
                   letter-spacing: .14em; color: ${BRAND.primary};
                   border-bottom: 2px solid ${BRAND.primary}; padding-bottom: 3px;
                   margin: 14px 0 8px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 18px;
               background: ${BRAND.bg}; border: 1px solid ${BRAND.border};
               border-radius: 6px; padding: 10px 14px; }

  table.data { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.data thead tr { background: ${BRAND.primary}; color: ${BRAND.white}; }
  table.data thead th { padding: 5px 6px; font-size: 8px; font-weight: 700;
                        text-transform: uppercase; letter-spacing: .08em; text-align: left;
                        border: 1px solid ${BRAND.primary}; }
  table.data tbody tr:nth-child(even) { background: ${BRAND.bg}; }

  .observations { margin-top: 10px; padding: 10px 12px; background: ${BRAND.bg};
                  border-left: 3px solid ${BRAND.primary}; border-radius: 4px;
                  font-size: 10px; color: ${BRAND.text}; min-height: 30px; }

  .signatures { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .sig-block { border-top: 1px solid ${BRAND.border}; padding-top: 8px; }
  .sig-role { font-size: 9px; font-weight: 700; color: ${BRAND.primary}; margin-bottom: 12px; }
  .sig-line { display: flex; gap: 16px; margin-top: 8px; }
  .sig-field { font-size: 9px; color: ${BRAND.muted};
               border-bottom: 1px solid ${BRAND.border}; min-width: 120px; padding-bottom: 18px; }

  .footer { margin-top: 20px; padding-top: 6px; border-top: 1px solid ${BRAND.border};
            display: flex; justify-content: space-between; font-size: 8px; color: ${BRAND.textLight}; }
</style>
</head>
<body>
  ${fullPdfHeader(logoBase64 ?? null, projectName, "REG-PESSOAL-IND", "0", generatedOn)}

  <h1 class="title">${esc(labels.reportTitle)}</h1>
  <p class="subtitle">${esc(worker.name)} · ${esc(worker.company ?? "ASCH")}${worker.worker_number ? ` · Nº ${esc(worker.worker_number)}` : ""}</p>

  <!-- Identificação -->
  <div class="section-title">${esc(labels.identification)}</div>
  <div class="info-grid">
    ${fieldRow(labels.name, worker.name)}
    ${fieldRow(labels.company, worker.company ?? "ASCH")}
    ${fieldRow(labels.function, worker.role_function)}
    ${fieldRow(labels.workerNumber, worker.worker_number)}
    ${fieldRow(labels.idNumber, worker.id_number)}
    ${fieldRow(labels.birthDate, fmtDate(worker.birth_date, locale))}
    ${fieldRow(labels.contactPhone, worker.contact_phone)}
    ${fieldRow(labels.contactEmail, worker.contact_email)}
    ${fieldRow(labels.discipline, worker.discipline)}
  </div>

  <!-- Presença em obra -->
  <div class="section-title">${esc(labels.presence)}</div>
  <div class="info-grid">
    ${fieldRow(labels.entryDate, fmtDate(worker.entry_date, locale))}
    ${fieldRow(labels.exitDate, fmtDate(worker.exit_date, locale))}
    ${fieldRow(labels.status, worker.status)}
    ${fieldRow(labels.ipQualStatus, worker.ip_qual_status)}
    ${fieldRow(labels.safetyTraining, worker.has_safety_training ? "✓" : "✗")}
  </div>

  <!-- Qualificações -->
  <div class="section-title">${esc(labels.qualifications)} (${qualifications.length})</div>
  <table class="data">
    <thead>
      <tr>
        <th>${esc(labels.qualType)}</th>
        <th style="width:90px;">${esc(labels.certRef)}</th>
        <th>${esc(labels.issuedBy)}</th>
        <th>${esc(labels.standardRef)}</th>
        <th style="width:90px;">${esc(labels.validUntil)}</th>
      </tr>
    </thead>
    <tbody>${qualRows}</tbody>
  </table>

  <!-- Formações -->
  <div class="section-title">${esc(labels.trainings)} (${trainings.length})</div>
  <table class="data">
    <thead>
      <tr>
        <th>${esc(labels.trainingTitle)}</th>
        <th style="width:90px;">${esc(labels.trainingDate)}</th>
        <th style="width:100px;">${esc(labels.trainingType)}</th>
        <th>${esc(labels.trainer)}</th>
        <th style="width:60px;">${esc(labels.signed)}</th>
      </tr>
    </thead>
    <tbody>${trainingRows}</tbody>
  </table>

  ${worker.notes ? `
    <div class="section-title">${esc(labels.observations)}</div>
    <div class="observations">${esc(worker.notes)}</div>
  ` : ""}

  <!-- Assinaturas -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-role">${esc(labels.signatureWorker)}</div>
      <div class="sig-line">
        <div class="sig-field">Nome: _________________________</div>
        <div class="sig-field">Data: _________</div>
      </div>
      <div class="sig-line" style="margin-top:10px;">
        <div class="sig-field">Assinatura: _________________________</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-role">${esc(labels.signatureManager)}</div>
      <div class="sig-line">
        <div class="sig-field">Nome: _________________________</div>
        <div class="sig-field">Data: _________</div>
      </div>
      <div class="sig-line" style="margin-top:10px;">
        <div class="sig-field">Assinatura: _________________________</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>${esc(labels.appName)} · Quality Management System · ${esc(projectCode)}</span>
    <span>${esc(labels.generatedOn)}: ${generatedOn}</span>
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function exportWorkerSheetPdf(
  worker: WorkerSheetData,
  qualifications: WorkerQualification[],
  trainings: WorkerTraining[],
  labels: WorkerSheetLabels,
  locale: string,
  projectName: string,
  projectCode: string,
  logoBase64?: string | null,
): void {
  const html = buildWorkerSheetHtml(worker, qualifications, trainings, labels, locale, projectName, projectCode, logoBase64);
  const filename = `FichaPessoal_${sanitize(worker.name)}_${sanitize(projectCode)}.pdf`;
  printHtml(html, filename);
}
