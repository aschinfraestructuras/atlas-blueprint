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
