import jsPDF from "jspdf";
import type { Supplier, SupplierDocument, SupplierMaterial, SupplierDetailMetrics } from "./supplierService";

interface ExportData {
  supplier: Supplier;
  metrics: SupplierDetailMetrics | null;
  docs: SupplierDocument[];
  materials: SupplierMaterial[];
  ncs: { code: string; title: string; severity: string; status: string }[];
  projectName: string;
  projectCode: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
  logoBase64?: string | null;
}

export function exportSupplierPdf(data: ExportData) {
  const { supplier, metrics, docs, materials, ncs, projectName, projectCode, t } = data;
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
    doc.text(t("suppliers.export.reportTitle", { defaultValue: "Ficha de Fornecedor" }), W - margin, 8, { align: "right" });
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
    doc.text(value || "—", margin + 45, y);
    y += 5;
  }

  // ── Header ──────────────────────────────────────────────────
  drawHeader();

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 30, 55);
  doc.text(supplier.name, margin, y + 2);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`${supplier.code ?? "—"} · ${projectName} (${projectCode})`, margin, y);
  y += 8;

  // ── Identification ──────────────────────────────────────────
  sectionTitle(t("suppliers.detail.tabs.summary", { defaultValue: "Resumo" }));
  field(t("suppliers.form.category"), supplier.category ? t(`suppliers.categories.${supplier.category}`, { defaultValue: supplier.category }) : "—");
  field(t("suppliers.form.nifCif"), supplier.nif_cif ?? "—");
  field(t("suppliers.form.country"), supplier.country ?? "—");
  field(t("suppliers.form.address"), supplier.address ?? "—");
  field(t("suppliers.form.contactName"), supplier.contact_name ?? "—");
  field(t("suppliers.form.contactEmail"), supplier.contact_email ?? "—");
  field(t("suppliers.form.contactPhone"), supplier.contact_phone ?? "—");
  field(t("common.status"), t(`suppliers.status.${supplier.status}`));
  field(t("suppliers.form.qualificationStatus"), t(`suppliers.qualificationStatus.${supplier.qualification_status ?? supplier.approval_status}`));
  if (supplier.qualification_score != null) {
    field(t("suppliers.form.qualificationScore"), `${supplier.qualification_score}/100`);
  }
  if (supplier.notes) {
    field(t("suppliers.form.notes"), supplier.notes);
  }
  y += 3;

  // ── KPIs ────────────────────────────────────────────────────
  if (metrics) {
    sectionTitle("KPIs");
    field(t("suppliers.detail.openNCs"), String(metrics.open_nc_count));
    field(t("suppliers.detail.testsTotal"), String(metrics.tests_total));
    field(t("suppliers.detail.testsNC"), String(metrics.tests_nonconform));
    field(t("suppliers.detail.docsExpiring"), String(metrics.docs_expiring_30d));
    field(t("suppliers.detail.docsExpired"), String(metrics.docs_expired));
    y += 3;
  }

  // ── Documents ───────────────────────────────────────────────
  if (docs.length > 0) {
    sectionTitle(t("suppliers.detail.tabs.documents", { defaultValue: "Documentos" }));
    docs.forEach(d => {
      checkY(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(`${t(`suppliers.docTypes.${d.doc_type}`, { defaultValue: d.doc_type })} — ${d.valid_to ? new Date(d.valid_to).toLocaleDateString() : "—"} — ${d.status}`, margin, y);
      y += 4.5;
    });
    y += 3;
  }

  // ── Materials ───────────────────────────────────────────────
  if (materials.length > 0) {
    sectionTitle(t("suppliers.detail.tabs.materials", { defaultValue: "Materiais" }));
    materials.forEach(m => {
      checkY(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30);
      const price = m.unit_price != null ? ` · ${m.unit_price} ${m.currency}` : "";
      doc.text(`${m.material_name}${m.is_primary ? " (Principal)" : ""}${price}`, margin, y);
      y += 4.5;
    });
    y += 3;
  }

  // ── NCs ─────────────────────────────────────────────────────
  if (ncs.length > 0) {
    sectionTitle(t("suppliers.detail.tabs.ncs", { defaultValue: "Não Conformidades" }));
    ncs.forEach(nc => {
      checkY(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30);
      doc.text(`${nc.code} — ${nc.title ?? "—"} — ${t(`nc.severity.${nc.severity}`, { defaultValue: nc.severity })} — ${t(`nc.status.${nc.status}`, { defaultValue: nc.status })}`, margin, y);
      y += 4.5;
    });
  }

  // ── Footer ──────────────────────────────────────────────────
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
  doc.save(`SUP_${projectCode}_${supplier.code ?? "FORN"}_${dateStr}.pdf`);
}
