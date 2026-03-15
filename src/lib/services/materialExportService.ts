import jsPDF from "jspdf";
import type { Material, MaterialDocument, MaterialDetailMetrics, WorkItemMaterial } from "./materialService";
import { auditService } from "./auditService";

interface ExportData {
  material: Material;
  metrics: MaterialDetailMetrics | null;
  docs: MaterialDocument[];
  workItemLinks: WorkItemMaterial[];
  ncs: { code: string; title: string; severity: string; status: string }[];
  tests: { code: string; date: string; pass_fail: string; status: string }[];
  projectName: string;
  projectCode: string;
  logoUrl?: string | null;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

export async function exportMaterialPdf(data: ExportData) {
  const { material, metrics, docs, workItemLinks, ncs, tests, projectName, projectCode, t } = data;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  const addPage = () => { doc.addPage(); y = 15; drawHeader(); };
  const checkY = (need: number) => { if (y + need > 275) addPage(); };

  function drawHeader() {
    doc.setFillColor(15, 30, 55);
    doc.rect(0, 0, W, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    // If logo available, try to add it (jsPDF addImage is complex, fallback to text)
    doc.text("ATLAS QMS", margin, 8);
    doc.setFontSize(7);
    doc.text(t("materials.export.reportTitle", { defaultValue: "Ficha de Material" }), W - margin, 8, { align: "right" });
    y = 18;
  }

  function sectionTitle(title: string) {
    checkY(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 30, 55);
    doc.text(title.toUpperCase(), margin, y);
    y += 1;
    doc.setDrawColor(15, 30, 55);
    doc.setLineWidth(0.3);
    doc.line(margin, y, W - margin, y);
    y += 5;
  }

  function field(label: string, value: string) {
    checkY(6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(label, margin, y);
    doc.setTextColor(30);
    doc.setFont("helvetica", "bold");
    doc.text(value || "—", margin + 50, y);
    y += 5;
  }

  drawHeader();

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 30, 55);
  doc.text(material.name, margin, y + 2);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`${material.code} · ${projectName} (${projectCode})`, margin, y);
  y += 8;

  // Identification
  sectionTitle(t("materials.detail.tabs.summary", { defaultValue: "Resumo" }));
  field(t("materials.form.category"), t(`materials.categories.${material.category}`, { defaultValue: material.category }));
  field(t("materials.form.subcategory"), material.subcategory ?? "—");
  field(t("materials.form.specification"), material.specification ?? "—");
  field(t("materials.form.unit"), material.unit ?? "—");
  field(t("materials.form.normativeRefs"), material.normative_refs ?? "—");
  field(t("materials.form.acceptanceCriteria"), material.acceptance_criteria ?? "—");
  field(t("common.status"), t(`materials.status.${material.status}`));
  field(t("materials.approval.status"), t(`materials.approval.statuses.${material.approval_status}`, { defaultValue: material.approval_status }));
  if (material.rejection_reason) field(t("materials.approval.rejectionReason"), material.rejection_reason);
  y += 3;

  // KPIs
  if (metrics) {
    sectionTitle("KPIs");
    field(t("materials.detail.suppliersCount"), String(metrics.suppliers_count));
    field(t("materials.detail.testsTotal"), String(metrics.tests_total));
    field(t("materials.detail.testsNC"), String(metrics.tests_nonconform));
    field(t("materials.detail.ncOpen"), String(metrics.nc_open_count));
    field(t("materials.detail.docsExpiring"), String(metrics.docs_expiring_30d));
    field(t("materials.detail.docsExpired"), String(metrics.docs_expired));
    field(t("materials.detail.workItems"), String(metrics.work_items_count));
    y += 3;
  }

  // Documents
  if (docs.length > 0) {
    sectionTitle(t("materials.detail.tabs.documents", { defaultValue: "Documentos" }));
    docs.forEach(d => {
      checkY(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(`${t(`materials.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })} — ${d.valid_to ? new Date(d.valid_to).toLocaleDateString() : "—"} — ${d.status}`, margin, y);
      y += 4.5;
    });
    y += 3;
  }

  // Tests
  if (tests.length > 0) {
    sectionTitle(t("materials.detail.tabs.tests", { defaultValue: "Ensaios" }));
    tests.slice(0, 20).forEach(tr => {
      checkY(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(`${tr.code ?? "—"} — ${new Date(tr.date).toLocaleDateString()} — ${tr.pass_fail ?? "—"}`, margin, y);
      y += 4.5;
    });
    y += 3;
  }

  // NCs
  if (ncs.length > 0) {
    sectionTitle(t("materials.detail.tabs.ncs", { defaultValue: "Não Conformidades" }));
    ncs.forEach(nc => {
      checkY(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(`${nc.code} — ${nc.title ?? "—"} — ${t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })} — ${t(`nc.status.${nc.status}`, { defaultValue: nc.status })}`, margin, y);
      y += 4.5;
    });
    y += 3;
  }

  // Work Items
  if (workItemLinks.length > 0) {
    sectionTitle(t("materials.detail.tabs.workItems", { defaultValue: "Aplicação em Obra" }));
    workItemLinks.slice(0, 20).forEach(wl => {
      checkY(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(`${wl.work_item_id.substring(0, 8)}… — ${wl.lot_ref ?? "—"} — ${wl.quantity ?? "—"} ${wl.unit ?? ""}`, margin, y);
      y += 4.5;
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text(
      `${t("documents.export.generatedOn", { defaultValue: "Gerado em" })}: ${new Date().toLocaleString()} — ${t("documents.export.page", { defaultValue: "Página" })} ${i}/${pages}`,
      W / 2, 290, { align: "center" }
    );
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  doc.save(`MAT_${projectCode}_${material.code}_${dateStr}.pdf`);

  // Audit
  await auditService.log({
    projectId: material.project_id,
    entity: "materials",
    entityId: material.id,
    action: "EXPORT",
    module: "materials",
    description: `PDF exportado: ${material.code}`,
  }).catch(() => null);
}

// ── FAV PDF Export (Print Window) ────────────────────────────────────────────

export function exportFavPdf(
  material: Material,
  ncs: { code: string; title: string; severity: string; status: string }[],
  projectName: string,
  projectCode: string,
) {
  const techComparison = (material as any).technical_comparison ?? [];
  const favDocs = (material as any).fav_documents ?? [];

  const defaultDocs = [
    "Ficha técnica do produto",
    "Declaração de Desempenho (DoP) / Marcação CE",
    "Certificado de ensaio de fábrica (FPC)",
    "Certificado de calibração do equipamento (se aplicável)",
    "Amostra física (se aplicável)",
  ];

  const docsToShow = favDocs.length > 0 ? favDocs : defaultDocs.map((d: string) => ({ label: d, checked: false }));

  const techRows = techComparison.map((r: any) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${r.parameter ?? ""}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${r.specified ?? ""}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${r.proposed ?? ""}</td>
      <td style="padding:6px 8px;border:1px solid #d1d5db;text-align:center;">${r.compliant ? "✅" : "❌"}</td>
    </tr>
  `).join("");

  const docRows = docsToShow.map((d: any) => {
    const label = typeof d === "string" ? d : d.label;
    const checked = typeof d === "string" ? false : d.checked;
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #d1d5db;">${checked ? "☑" : "☐"} ${label}</td>
    </tr>`;
  }).join("");

  const logo = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#2F4F75"/><path d="M16 4L6 9v7c0 5.25 4.25 10.15 10 11.35C21.75 26.15 26 21.25 26 16V9L16 4z" fill="white" fill-opacity="0.9"/><path d="M13 16l2 2 4-4" stroke="#2F4F75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>FAV — ${material.pame_code ?? material.code}</title>
<style>
  @media print { body { margin: 0; } }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
  @page { size: A4 portrait; margin: 15mm; }
  table { border-collapse: collapse; width: 100%; }
</style>
</head><body>
  <div style="background:#0f1e37;color:#fff;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:12px;">
      ${logo}
      <div>
        <div style="font-size:18px;font-weight:900;letter-spacing:0.1em;">ATLAS QMS</div>
        <div style="font-size:10px;opacity:0.7;">Ficha de Aprovação de Materiais (FAV)</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:16px;font-weight:700;">${material.pame_code ?? material.code}</div>
      <div style="font-size:10px;opacity:0.7;">${projectName} (${projectCode})</div>
    </div>
  </div>

  <div style="padding:20px;">
    <table style="margin-bottom:20px;">
      <tr>
        <td style="padding:6px 8px;font-weight:700;width:140px;border:1px solid #d1d5db;background:#f3f4f6;">Material</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.name}</td>
        <td style="padding:6px 8px;font-weight:700;width:100px;border:1px solid #d1d5db;background:#f3f4f6;">Código</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.code}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Categoria</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.category}</td>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Unidade</td>
        <td style="padding:6px 8px;border:1px solid #d1d5db;">${material.unit ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Especificação</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${material.specification ?? "—"}</td>
      </tr>
      <tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Referências Normativas</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${material.normative_refs ?? "—"}</td>
      </tr>
      ${material.submitted_at ? `<tr>
        <td style="padding:6px 8px;font-weight:700;border:1px solid #d1d5db;background:#f3f4f6;">Data Submissão</td>
        <td colspan="3" style="padding:6px 8px;border:1px solid #d1d5db;">${new Date(material.submitted_at).toLocaleDateString("pt-PT")}</td>
      </tr>` : ""}
    </table>

    ${techComparison.length > 0 ? `
    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">A — Comparação Técnica: Especificado vs. Proposto</div>
    <table style="margin-bottom:20px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Parâmetro</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Especificado</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;text-align:left;">Proposto</th>
          <th style="padding:6px 8px;border:1px solid #d1d5db;width:60px;">Conf.</th>
        </tr>
      </thead>
      <tbody>${techRows}</tbody>
    </table>` : ""}

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:6px;">B — Documentos Submetidos</div>
    <table style="margin-bottom:30px;">
      <tbody>${docRows}</tbody>
    </table>

    <div style="font-weight:700;font-size:11px;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">C — Decisão</div>
    <div style="display:flex;gap:20px;margin-bottom:30px;font-size:13px;">
      <span>☐ Aprovado</span>
      <span>☐ Aprovado com condições</span>
      <span>☐ Rejeitado</span>
    </div>
    ${material.rejection_reason ? `<div style="margin-bottom:20px;font-size:11px;"><strong>Motivo:</strong> ${material.rejection_reason}</div>` : ""}

    <div style="display:flex;justify-content:space-between;margin-top:40px;">
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">TQ / Inspector</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ________________</div>
        <div style="font-size:10px;margin-top:4px;">Data: _______ &nbsp; Assinatura: ________________</div>
      </div>
      <div style="width:45%;">
        <div style="font-weight:700;font-size:11px;margin-bottom:30px;">Fiscalização</div>
        <div style="border-top:1px solid #000;padding-top:4px;font-size:10px;">Nome: ________________</div>
        <div style="font-size:10px;margin-top:4px;">Data: _______ &nbsp; Assinatura: ________________</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;font-size:8px;color:#999;margin-top:20px;padding:8px;">
    Atlas QMS · PF17A · Gerado em ${new Date().toLocaleString("pt-PT")}
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
}
