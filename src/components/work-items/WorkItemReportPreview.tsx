/**
 * WorkItemReportPreview — Ficha de Frente de Obra
 *
 * Migrated to the unified Atlas QMS report pattern:
 *   1. Build a full institutional HTML (logo + project header strip + footer)
 *      via `generatePdfDocument` from reportService.
 *   2. Render it inside the standard `PdfPreviewDialog`, which gives the user
 *      Preview → Imprimir / Descarregar PDF (real, multi-page A4) / Nova aba.
 *
 * This replaces the previous self-contained Dialog that called window.print()
 * without project branding.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PdfPreviewDialog } from "@/components/ui/pdf-preview-dialog";
import { buildHtmlPreviewUrl, revokeHtmlPreviewUrl } from "@/lib/utils/htmlPreview";
import { generatePdfDocument, buildReportFilename, type ReportLabels } from "@/lib/services/reportService";
import { useReportMeta } from "@/hooks/useReportMeta";
import { useProjectLogo } from "@/hooks/useProjectLogo";
import { escapeHtml } from "@/lib/utils/escapeHtml";

export interface WorkItemReportData {
  work_item: Record<string, any>;
  ppi_instances: Array<{
    code: string;
    template_name: string;
    status: string;
    items: Array<{
      description: string;
      point_type: string;
      status: string;
      observation?: string;
    }>;
  }>;
  test_results: Array<{
    test_name: string;
    standard?: string;
    date: string;
    result_status?: string;
    sample_ref?: string;
    laboratory_name?: string;
    report_number?: string;
  }>;
  non_conformities: Array<{
    code?: string;
    title: string;
    status: string;
    severity: string;
    due_date?: string;
  }>;
  materials: Array<{
    material_name: string;
    pame_status?: string;
    quantity?: number;
    unit?: string;
  }>;
}

// ── HTML helpers (presentation only) ─────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-PT"); } catch { return iso; }
}

function statusPill(status: string): string {
  const s = (status ?? "").toLowerCase();
  let bg = "#F3F4F6", color = "#374151";
  if (s === "aprovado" || s === "approved" || s === "pass" || s === "conforme") { bg = "#DCFCE7"; color = "#166534"; }
  else if (s === "reprovado" || s === "rejected" || s === "fail" || s === "nao_conforme" || s === "aberta" || s === "open") { bg = "#FEE2E2"; color = "#991B1B"; }
  else if (s === "pendente" || s === "pending") { bg = "#FEF3C7"; color = "#92400E"; }
  else if (s === "fechada" || s === "closed") { bg = "#DCFCE7"; color = "#166534"; }
  return `<span style="display:inline-block;padding:1px 6px;border-radius:10px;background:${bg};color:${color};font-size:9px;font-weight:600;">${escapeHtml(status ?? "—")}</span>`;
}

function pointTypeBadge(type: string): string {
  const u = (type ?? "").toUpperCase();
  let bg = "#F3F4F6", color = "#6B7280";
  if (u === "HP") { bg = "#FEE2E2"; color = "#991B1B"; }
  else if (u === "WP") { bg = "#DBEAFE"; color = "#1E40AF"; }
  return `<span style="display:inline-block;padding:1px 6px;border-radius:10px;background:${bg};color:${color};font-size:9px;font-weight:700;">${escapeHtml(u || "RP")}</span>`;
}

function sectionTitle(text: string): string {
  return `<h3 style="font-size:12px;font-weight:700;color:#192F48;margin:14px 0 6px 0;border-bottom:1px solid #E5E7EB;padding-bottom:3px;">${escapeHtml(text)}</h3>`;
}

function emptyHint(text: string): string {
  return `<p style="font-size:10px;color:#6B7280;font-style:italic;margin:4px 0;">${escapeHtml(text)}</p>`;
}

function buildBody(data: WorkItemReportData): string {
  const wi = data.work_item ?? {};
  const pkRange = wi.pk_inicio != null
    ? `${escapeHtml(String(wi.pk_inicio))}${wi.pk_fim != null ? ` → ${escapeHtml(String(wi.pk_fim))}` : ""}`
    : "—";

  // Activity identification card
  const headerInfo = `
    <div style="border:1px solid #E5E7EB;border-radius:6px;padding:10px;margin-bottom:12px;background:#F9FAFB;">
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:13px;font-weight:800;color:#192F48;letter-spacing:0.5px;">FICHA DE FRENTE DE OBRA</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:10px;">
        <div><span style="color:#6B7280;font-weight:600;">SECTOR</span><br>${escapeHtml(wi.sector ?? "—")}</div>
        <div><span style="color:#6B7280;font-weight:600;">DISCIPLINA</span><br>${escapeHtml(wi.disciplina ?? "—")}</div>
        <div><span style="color:#6B7280;font-weight:600;">ELEMENTO</span><br>${escapeHtml(wi.elemento ?? wi.element ?? "—")}</div>
        <div><span style="color:#6B7280;font-weight:600;">PARTE</span><br>${escapeHtml(wi.parte ?? "—")}</div>
        <div><span style="color:#6B7280;font-weight:600;">PK</span><br>${pkRange}</div>
        <div><span style="color:#6B7280;font-weight:600;">CÓDIGO</span><br>${escapeHtml(wi.code ?? "—")}</div>
      </div>
    </div>`;

  // 1. PPIs
  let ppiBlock = sectionTitle("1. Plano de Inspecção (PPI)");
  if (!data.ppi_instances?.length) {
    ppiBlock += emptyHint("Sem PPI associados a este elemento.");
  } else {
    for (const ppi of data.ppi_instances) {
      ppiBlock += `<div style="margin-bottom:10px;">
        <div style="font-size:10px;margin-bottom:4px;">
          <strong>${escapeHtml(ppi.code)}</strong>
          <span style="color:#6B7280;"> · ${escapeHtml(ppi.template_name)}</span>
          ${statusPill(ppi.status)}
        </div>`;
      if (ppi.items?.length) {
        ppiBlock += `<table class="atlas-table"><thead><tr>
          <th>Fase / Descrição</th><th style="width:60px;">Tipo</th><th style="width:80px;">Estado</th>
        </tr></thead><tbody>`;
        for (const item of ppi.items) {
          ppiBlock += `<tr>
            <td>${escapeHtml(item.description)}</td>
            <td>${pointTypeBadge(item.point_type)}</td>
            <td>${statusPill(item.status)}</td>
          </tr>`;
        }
        ppiBlock += `</tbody></table>`;
      }
      ppiBlock += `</div>`;
    }
  }

  // 2. Tests
  let testBlock = sectionTitle("2. Ensaios Realizados");
  if (!data.test_results?.length) {
    testBlock += emptyHint("Sem ensaios registados.");
  } else {
    testBlock += `<table class="atlas-table"><thead><tr>
      <th>Ensaio</th><th>Norma</th><th>Amostra</th><th>Data</th><th>Resultado</th>
    </tr></thead><tbody>`;
    for (const tr of data.test_results) {
      testBlock += `<tr>
        <td>${escapeHtml(tr.test_name)}${tr.laboratory_name ? `<br><span style="font-size:9px;color:#6B7280;">${escapeHtml(tr.laboratory_name)}${tr.report_number ? ` · ${escapeHtml(tr.report_number)}` : ""}</span>` : ""}</td>
        <td>${escapeHtml(tr.standard ?? "—")}</td>
        <td>${escapeHtml(tr.sample_ref ?? "—")}</td>
        <td>${fmtDate(tr.date)}</td>
        <td>${statusPill(tr.result_status ?? "—")}</td>
      </tr>`;
    }
    testBlock += `</tbody></table>`;
  }

  // 3. NCs
  let ncBlock = sectionTitle("3. Não Conformidades");
  if (!data.non_conformities?.length) {
    ncBlock += `<p style="font-size:10px;color:#166534;margin:4px 0;">✅ Sem não conformidades registadas.</p>`;
  } else {
    ncBlock += `<table class="atlas-table"><thead><tr>
      <th>Código</th><th>Título</th><th>Gravidade</th><th>Estado</th><th>Prazo</th>
    </tr></thead><tbody>`;
    for (const nc of data.non_conformities) {
      ncBlock += `<tr>
        <td>${escapeHtml(nc.code ?? "—")}</td>
        <td>${escapeHtml(nc.title)}</td>
        <td>${escapeHtml(nc.severity ?? "—")}</td>
        <td>${statusPill(nc.status)}</td>
        <td>${fmtDate(nc.due_date)}</td>
      </tr>`;
    }
    ncBlock += `</tbody></table>`;
  }

  // 4. Materials
  let matBlock = sectionTitle("4. Materiais Aprovados (PAME)");
  if (!data.materials?.length) {
    matBlock += emptyHint("Sem materiais associados.");
  } else {
    matBlock += `<table class="atlas-table"><thead><tr>
      <th>Material</th><th>PAME</th><th>Quantidade</th><th>Unidade</th>
    </tr></thead><tbody>`;
    for (const m of data.materials) {
      matBlock += `<tr>
        <td>${escapeHtml(m.material_name)}</td>
        <td>${statusPill(m.pame_status ?? "Pendente")}</td>
        <td>${m.quantity != null ? escapeHtml(String(m.quantity)) : "—"}</td>
        <td>${escapeHtml(m.unit ?? "—")}</td>
      </tr>`;
    }
    matBlock += `</tbody></table>`;
  }

  return headerInfo + ppiBlock + testBlock + ncBlock + matBlock;
}

// ── Component ────────────────────────────────────────────────────────────────

export function WorkItemReportPreview({ data, onClose }: { data: WorkItemReportData; onClose: () => void }) {
  const { t } = useTranslation();
  const meta = useReportMeta();
  const { logoBase64 } = useProjectLogo();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const wi = data.work_item ?? {};
  const docCode = `FFO-${wi.code ?? wi.id ?? "elemento"}`;

  const html = useMemo(() => {
    if (!meta) return null;
    const labels: ReportLabels = {
      appName: "Atlas QMS",
      reportTitle: "FICHA DE FRENTE DE OBRA",
      generatedOn: "Gerado a",
    };
    return generatePdfDocument({
      title: `${docCode} — Atlas QMS`,
      labels,
      meta,
      bodyHtml: buildBody(data),
      footerRef: docCode,
      logoBase64,
    });
  }, [data, meta, logoBase64, docCode]);

  // Build blob URL once HTML is ready and revoke on unmount/close
  useEffect(() => {
    if (!html) return;
    const url = buildHtmlPreviewUrl(html);
    setPreviewUrl(url);
    return () => { revokeHtmlPreviewUrl(url); };
  }, [html]);

  const filename = meta
    ? buildReportFilename("FFO", meta.projectCode, wi.code ?? "elemento")
    : "ficha-frente-obra.pdf";

  return (
    <PdfPreviewDialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      url={previewUrl}
      title={t("workItems.report.title", { defaultValue: "Ficha de Frente de Obra" })}
      subtitle={`${wi.sector ?? ""}${wi.elemento ? ` · ${wi.elemento}` : ""}`}
      downloadName={filename}
      htmlSource
    />
  );
}
