/**
 * SGQ List Export Service — Atlas QMS
 *
 * Generates printWindow PDFs for SGQ master lists:
 * LMD, LNC, REQ, PAI, LGR
 */

import {
  sharedCss, headerHtmlAsync, footerHtml,
  type ReportMeta, type ReportLabels, printHtml,
} from "./reportService";
import { projectInfoStripHtml } from "./pdfProjectHeader";

const BRAND = {
  primary: "#2F4F75",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F9FAFB",
  white: "#FFFFFF",
  text: "#111827",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-PT", { year: "numeric", month: "2-digit", day: "2-digit" }); }
  catch { return iso.slice(0, 10); }
}

function tableHtml(columns: string[], rows: string[][]): string {
  return `
<table class="atlas-table">
  <thead><tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;
}

function summaryRow(items: [string, number][]): string {
  return `<div style="margin-top:10px;display:flex;gap:20px;font-size:10px;font-weight:600;color:${BRAND.muted}">
    ${items.map(([l, v]) => `<span>${l}: <strong style="color:${BRAND.text}">${v}</strong></span>`).join("")}
  </div>`;
}

async function buildDoc(opts: {
  code: string;
  title: string;
  meta: ReportMeta;
  body: string;
}): Promise<string> {
  const labels: ReportLabels = {
    appName: "Atlas QMS",
    reportTitle: `${opts.code} — ${opts.title}`,
    generatedOn: "Gerado em",
  };
  const header = await headerHtmlAsync(`${opts.code} — ${opts.title}`, labels, opts.meta);
  const footer = `<div class="atlas-footer">
    <span>Atlas QMS · ${opts.meta.projectCode} · Gerado em ${fmtDate(new Date().toISOString())}</span>
    <span>${opts.code}</span>
  </div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${opts.code} — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>${header}${projectInfoStripHtml(null)}${opts.body}${footer}</body></html>`;
}

// ─── LMD: Lista Mestra de Documentos ──────────────────────────────────────────

export async function exportLMD(
  docs: { code?: string | null; title: string; revision?: string | null; status: string; approved_at?: string | null; created_by?: string | null }[],
  meta: ReportMeta,
) {
  const columns = ["Código", "Título", "Revisão", "Estado", "Data Aprovação", "Responsável"];
  const rows = docs.map(d => [
    d.code ?? "—", d.title, d.revision ?? "0", d.status.toUpperCase(),
    fmtDate(d.approved_at), d.created_by ?? "—",
  ]);
  const body = tableHtml(columns, rows) +
    `<div style="margin-top:8px;font-size:9px;color:${BRAND.muted}">${rows.length} documento(s)</div>`;
  const html = await buildDoc({ code: `LMD-${meta.projectCode}-001`, title: "Lista Mestra de Documentos", meta, body });
  printHtml(html, `LMD_${meta.projectCode}.pdf`);
}

// ─── LNC: Lista de Não Conformidades ──────────────────────────────────────────

export async function exportLNC(
  ncs: { code?: string | null; detected_at?: string; created_at: string; discipline?: string | null; classification?: string | null; description: string; status: string; closure_date?: string | null }[],
  meta: ReportMeta,
) {
  const columns = ["N.º RNC", "Data Abertura", "Disciplina", "Classificação", "Descrição", "Estado", "Data Encerramento"];
  const rows = ncs.map(nc => [
    nc.code ?? "—",
    fmtDate(nc.detected_at ?? nc.created_at),
    (nc as any).discipline ?? "—",
    (nc as any).classification ?? "—",
    nc.description.length > 60 ? nc.description.slice(0, 57) + "…" : nc.description,
    nc.status.toUpperCase(),
    fmtDate(nc.closure_date),
  ]);
  const openCount = ncs.filter(n => !["closed", "archived"].includes(n.status)).length;
  const closedCount = ncs.filter(n => n.status === "closed").length;
  const body = tableHtml(columns, rows) +
    summaryRow([["Total aberto", openCount], ["Total encerrado", closedCount], ["Total", ncs.length]]);
  const html = await buildDoc({ code: `LNC-${meta.projectCode}-001`, title: "Lista de Não Conformidades", meta, body });
  printHtml(html, `LNC_${meta.projectCode}.pdf`);
}

// ─── REQ: Registo de Equipamentos de Medição ─────────────────────────────────

export async function exportREQ(
  equipment: {
    code: string; equipment_type: string; brand?: string | null; model?: string | null;
    serial_number?: string | null; application_scope?: string | null;
    calibration_frequency?: string | null; calibration_valid_until?: string | null;
    calibration_status?: string | null;
    lastCalibrationDate?: string | null;
  }[],
  meta: ReportMeta,
) {
  const today = new Date().toISOString().slice(0, 10);
  const columns = ["Código EME", "Designação", "Marca/Modelo", "N.º Série", "Aplicação (PPI)", "Periodicidade", "Última Calibração", "Próxima Calibração", "Estado"];
  const rows = equipment.map(e => {
    const isExpired = e.calibration_valid_until && e.calibration_valid_until < today;
    const style = isExpired ? ' style="color:red;font-weight:bold"' : '';
    return [
      e.code,
      e.equipment_type,
      [e.brand, e.model].filter(Boolean).join(" ") || "—",
      e.serial_number ?? "—",
      e.application_scope ?? "—",
      e.calibration_frequency ?? "—",
      e.lastCalibrationDate ? fmtDate(e.lastCalibrationDate) : "—",
      `<span${style}>${fmtDate(e.calibration_valid_until)}</span>`,
      (e.calibration_status ?? "—").toUpperCase(),
    ];
  });
  const body = tableHtml(columns, rows) +
    `<div style="margin-top:8px;font-size:9px;color:${BRAND.muted}">${rows.length} equipamento(s)</div>`;
  const html = await buildDoc({ code: `REQ-${meta.projectCode}-001`, title: "Registo de Equipamentos de Medição e Ensaio", meta, body });
  printHtml(html, `REQ_${meta.projectCode}.pdf`);
}

// ─── PAI: Programa de Auditorias Internas ─────────────────────────────────────

export async function exportPAI(
  audits: { code: string; audit_type: string; planned_date: string; auditor_name?: string | null; scope?: string | null; status: string }[],
  meta: ReportMeta,
) {
  const columns = ["Código", "Tipo", "Data Planeada", "Auditor", "Âmbito", "Estado"];
  const TYPE_LABELS: Record<string, string> = { internal: "Interna", external: "Externa", surveillance: "Vigilância", closing: "Encerramento" };
  const STATUS_LABELS: Record<string, string> = { planned: "Planeada", in_progress: "Em Curso", completed: "Concluída", cancelled: "Cancelada" };
  const rows = audits.map(a => [
    a.code, TYPE_LABELS[a.audit_type] ?? a.audit_type, fmtDate(a.planned_date),
    a.auditor_name ?? "—", a.scope ?? "—", STATUS_LABELS[a.status] ?? a.status,
  ]);
  const planned = audits.filter(a => a.status === "planned").length;
  const completed = audits.filter(a => a.status === "completed").length;
  const inProgress = audits.filter(a => a.status === "in_progress").length;
  const body = tableHtml(columns, rows) +
    summaryRow([["Total planeadas", planned], ["Concluídas", completed], ["Em Curso", inProgress]]);
  const year = new Date().getFullYear();
  const html = await buildDoc({ code: `PAI-${meta.projectCode}-001`, title: `Programa Anual de Auditorias Internas — ${year}`, meta, body });
  printHtml(html, `PAI_${meta.projectCode}.pdf`);
}

// ─── LGR: Lista de Fornecedores e Subcontratados Qualificados ────────────────

export async function exportLGR(
  suppliers: { code?: string | null; name: string; category?: string | null; pame_status?: string | null; qualification_status?: string | null; approval_status?: string | null; evaluation_score?: number | null; valid_until?: string | null }[],
  subcontractors: { code?: string | null; name: string; category?: string | null; qualification_status?: string | null; evaluation_score?: number | null; valid_until?: string | null }[],
  meta: ReportMeta,
) {
  const supColumns = ["Código", "Nome", "Categoria", "Estado PAME", "Avaliação", "Válido até"];
  const supRows = suppliers.map(s => [
    s.code ?? "—", s.name, s.category ?? "—",
    (s.pame_status ?? s.qualification_status ?? s.approval_status ?? "—").toUpperCase(),
    s.evaluation_score != null ? `${s.evaluation_score}%` : "—",
    fmtDate(s.valid_until),
  ]);

  const subColumns = ["Código", "Nome", "Categoria", "Qualificação", "Avaliação", "Válido até"];
  const subRows = subcontractors.map(s => [
    s.code ?? "—", s.name, s.category ?? "—",
    (s.qualification_status ?? "—").toUpperCase(),
    s.evaluation_score != null ? `${s.evaluation_score}%` : "—",
    fmtDate(s.valid_until),
  ]);

  const body = `
    <div class="atlas-section">A — Fornecedores</div>
    ${tableHtml(supColumns, supRows)}
    <div style="margin-top:8px;font-size:9px;color:${BRAND.muted}">${supRows.length} fornecedor(es)</div>
    <div class="atlas-section" style="margin-top:20px">B — Subcontratados</div>
    ${tableHtml(subColumns, subRows)}
    <div style="margin-top:8px;font-size:9px;color:${BRAND.muted}">${subRows.length} subcontratado(s)</div>
  `;
  const html = await buildDoc({ code: `LGR-${meta.projectCode}-001`, title: "Lista de Fornecedores e Subcontratados Qualificados", meta, body });
  printHtml(html, `LGR_${meta.projectCode}.pdf`);
}

// ─── LFQ: Lista de Fornecedores Qualificados com Avaliação ───────────────────

export async function exportLFQ(
  suppliers: { name: string; code?: string | null; category?: string | null; qualification_status?: string | null; approval_status?: string | null }[],
  evaluations: { supplier_id: string; quality_score: number; delivery_score: number; nc_management_score: number; cooperation_score: number; overall_score: number; evaluation_period?: string | null; recommendation?: string | null; notes?: string | null }[],
  meta: ReportMeta,
) {
  const evalMap = new Map<string, typeof evaluations[0][]>();
  evaluations.forEach(e => {
    if (!evalMap.has(e.supplier_id)) evalMap.set(e.supplier_id, []);
    evalMap.get(e.supplier_id)!.push(e);
  });

  const columns = ["Fornecedor", "Categoria", "Período", "Qualidade (35%)", "Prazo (25%)", "NC (25%)", "Cooperação (15%)", "Score", "Recomendação"];
  const rows: string[][] = [];

  for (const sup of suppliers) {
    const evals = evalMap.get((sup as any).id) ?? [];
    if (evals.length === 0) {
      rows.push([sup.name, sup.category ?? "—", "—", "—", "—", "—", "—", "—", "—"]);
    } else {
      for (const ev of evals) {
        const rec = ev.overall_score < 60 ? "Desqualificado" : ev.overall_score < 75 ? "Condicional" : "Qualificado";
        rows.push([
          sup.name, sup.category ?? "—", ev.evaluation_period ?? "—",
          `${ev.quality_score}`, `${ev.delivery_score}`, `${ev.nc_management_score}`, `${ev.cooperation_score}`,
          `${ev.overall_score}%`, rec,
        ]);
      }
    }
  }

  const body = tableHtml(columns, rows) +
    `<div style="margin-top:8px;font-size:9px;color:${BRAND.muted}">${rows.length} registo(s)</div>`;
  const html = await buildDoc({ code: `LFQ-${meta.projectCode}-001`, title: "Lista de Fornecedores Qualificados com Avaliação de Desempenho", meta, body });
  printHtml(html, `LFQ_${meta.projectCode}.pdf`);
}
