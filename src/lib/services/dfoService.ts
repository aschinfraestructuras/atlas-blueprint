/**
 * DFO Service — Atlas QMS
 * Manages the Dossier Final de Obra structure.
 */

import { supabase } from "@/integrations/supabase/client";
import { printHtml, sharedCss, headerHtmlAsync, type ReportMeta, type ReportLabels } from "./reportService";
import { projectInfoStripHtml } from "./pdfProjectHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DfoVolume {
  id: string;
  project_id: string;
  volume_no: number;
  title: string;
  description: string | null;
  sort_order: number;
  items?: DfoItem[];
  item_count?: number;
  completed_count?: number;
}

export interface DfoItem {
  id: string;
  volume_id: string;
  project_id: string;
  code: string;
  title: string;
  document_type: string | null;
  status: "pending" | "in_progress" | "complete" | "not_applicable";
  linked_doc_id: string | null;
  notes: string | null;
  sort_order: number;
  linked_doc?: { code: string | null; title: string } | null;
}

// ─── DFO PF17A Seed Structure ─────────────────────────────────────────────────

const DFO_SEED: { volume_no: number; title: string; description: string; items: { code: string; title: string; document_type?: string }[] }[] = [
  {
    volume_no: 1, title: "Gestão e Qualidade", description: "Documentos do sistema de gestão da qualidade",
    items: [
      { code: "V1-01", title: "PQO — Plano de Qualidade da Obra (Rev.01)", document_type: "plan" },
      { code: "V1-02", title: "PE — Plano de Execução", document_type: "plan" },
      { code: "V1-03", title: "PAME — Plano de Aprovação de Materiais e Equipamentos", document_type: "plan" },
      { code: "V1-04", title: "PG-01 — Controlo de Documentos", document_type: "procedure" },
      { code: "V1-05", title: "PG-02 — Controlo de Registos", document_type: "procedure" },
      { code: "V1-06", title: "PG-03 — Gestão de Não Conformidades", document_type: "procedure" },
      { code: "V1-07", title: "PG-04 — Acções Correctivas e Preventivas", document_type: "procedure" },
      { code: "V1-08", title: "PG-05 — Avaliação de Fornecedores", document_type: "procedure" },
      { code: "V1-09", title: "PG-06 — Auditorias Internas", document_type: "procedure" },
      { code: "V1-10", title: "PPIs — Planos de Inspecção e Ensaio (01-12)", document_type: "plan" },
      { code: "V1-11", title: "RM-SGQ — Relatórios Mensais SGQ", document_type: "report" },
      { code: "V1-12", title: "PAI + RAIs — Programa e Relatórios de Auditorias", document_type: "report" },
      { code: "V1-13", title: "RFs — Registos de Formação", document_type: "record" },
    ],
  },
  {
    volume_no: 2, title: "Documentação Técnica", description: "Peças escritas, telas finais e relatórios técnicos",
    items: [
      { code: "V2-01", title: "Peças Escritas Aprovadas", document_type: "drawing" },
      { code: "V2-02", title: "Telas Finais Topográficas", document_type: "drawing" },
      { code: "V2-03", title: "Relatórios Geotécnicos", document_type: "report" },
      { code: "V2-04", title: "Relatório de Interoperabilidade", document_type: "report" },
    ],
  },
  {
    volume_no: 3, title: "Controlo de Qualidade", description: "Evidências de controlo: LMD, NCs, ensaios, GRs",
    items: [
      { code: "V3-01", title: "LMD — Lista Mestra de Documentos", document_type: "record" },
      { code: "V3-02", title: "LNC — Lista de Não Conformidades (RNCs encerradas)", document_type: "record" },
      { code: "V3-03", title: "BE-LAB — Boletins de Ensaio Laboratorial", document_type: "record" },
      { code: "V3-04", title: "BE-CAMPO — Boletins de Ensaio de Campo", document_type: "record" },
      { code: "V3-05", title: "ATA-Q — Actas de Reunião (HPs)", document_type: "record" },
      { code: "V3-06", title: "GRs — Grelhas de Registo de Campo", document_type: "record" },
    ],
  },
  {
    volume_no: 4, title: "Materiais e Equipamentos", description: "PAME, FAVs, fornecedores e calibrações",
    items: [
      { code: "V4-01", title: "PAME Aprovados — Fichas de Material", document_type: "record" },
      { code: "V4-02", title: "FAVs — Fichas de Aprovação de Variantes", document_type: "record" },
      { code: "V4-03", title: "LGR — Lista de Fornecedores Qualificados", document_type: "record" },
      { code: "V4-04", title: "LFQ — Lista de Avaliação de Fornecedores", document_type: "record" },
      { code: "V4-05", title: "REQ — Registo de Equipamentos com Histórico Calibrações", document_type: "record" },
    ],
  },
  {
    volume_no: 5, title: "Subcontratados", description: "Qualificações, seguros e fichas técnicas",
    items: [
      { code: "V5-01", title: "Qualificações de Subcontratados", document_type: "certificate" },
      { code: "V5-02", title: "Seguros e Apólices", document_type: "certificate" },
      { code: "V5-03", title: "Fichas Técnicas de Pessoal", document_type: "record" },
    ],
  },
  {
    volume_no: 6, title: "Correspondência", description: "RFIs, NOT-HPs e comunicações formais IP",
    items: [
      { code: "V6-01", title: "RFIs Encerrados", document_type: "record" },
      { code: "V6-02", title: "NOT-HPs Confirmados", document_type: "record" },
      { code: "V6-03", title: "Comunicações Formais IP", document_type: "record" },
    ],
  },
  {
    volume_no: 7, title: "Encerramento", description: "Recepção provisória, reservas e resolução",
    items: [
      { code: "V7-01", title: "Auto de Recepção Provisória", document_type: "record" },
      { code: "V7-02", title: "Listagem de Reservas", document_type: "record" },
      { code: "V7-03", title: "Plano de Resolução de Reservas", document_type: "plan" },
    ],
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const dfoService = {
  async initializeForProject(projectId: string): Promise<void> {
    // Check if volumes already exist
    const { data: existing } = await supabase
      .from("dfo_volumes" as any)
      .select("id")
      .eq("project_id", projectId)
      .limit(1);
    if (existing && existing.length > 0) return;

    for (const vol of DFO_SEED) {
      const { data: volData, error: volErr } = await supabase
        .from("dfo_volumes" as any)
        .insert({
          project_id: projectId,
          volume_no: vol.volume_no,
          title: vol.title,
          description: vol.description,
          sort_order: vol.volume_no,
        })
        .select()
        .single();
      if (volErr) throw volErr;

      const volumeId = (volData as any).id;
      if (vol.items.length > 0) {
        const { error: itemErr } = await supabase
          .from("dfo_items" as any)
          .insert(
            vol.items.map((item, idx) => ({
              volume_id: volumeId,
              project_id: projectId,
              code: item.code,
              title: item.title,
              document_type: item.document_type ?? null,
              status: "pending",
              sort_order: idx + 1,
            }))
          );
        if (itemErr) throw itemErr;
      }
    }
  },

  async getVolumes(projectId: string): Promise<DfoVolume[]> {
    const { data: volumes, error: vErr } = await supabase
      .from("dfo_volumes" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");
    if (vErr) throw vErr;

    const { data: items, error: iErr } = await supabase
      .from("dfo_items" as any)
      .select("*, documents(code, title)")
      .eq("project_id", projectId)
      .order("sort_order");
    if (iErr) throw iErr;

    const itemsByVol = new Map<string, DfoItem[]>();
    for (const item of (items ?? []) as any[]) {
      const volId = item.volume_id;
      if (!itemsByVol.has(volId)) itemsByVol.set(volId, []);
      itemsByVol.get(volId)!.push({
        ...item,
        linked_doc: item.documents ?? null,
        documents: undefined,
      });
    }

    return ((volumes ?? []) as any[]).map(v => {
      const volItems = itemsByVol.get(v.id) ?? [];
      const applicable = volItems.filter(i => i.status !== "not_applicable");
      return {
        ...v,
        items: volItems,
        item_count: volItems.length,
        completed_count: applicable.filter(i => i.status === "complete").length,
      };
    });
  },

  async updateItemStatus(id: string, status: string, notes?: string): Promise<void> {
    const update: Record<string, any> = { status };
    if (notes !== undefined) update.notes = notes;
    const { error } = await supabase.from("dfo_items" as any).update(update).eq("id", id);
    if (error) throw error;
  },

  async linkDocument(itemId: string, docId: string | null): Promise<void> {
    const { error } = await supabase
      .from("dfo_items" as any)
      .update({ linked_doc_id: docId })
      .eq("id", itemId);
    if (error) throw error;
  },

  async syncItemStatuses(projectId: string): Promise<void> {
    // Batch-query counts of completed entities
    const [ppiRes, rmsgqRes, ncRes, pameRes, hpRes, auditsRes] = await Promise.all([
      supabase.from("ppi_instances").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "approved").eq("is_deleted", false),
      supabase.from("monthly_quality_reports").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "submitted"),
      supabase.from("non_conformities").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "closed").eq("is_deleted", false),
      supabase.from("materials").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("pame_status", "approved").eq("is_deleted", false),
      supabase.from("hp_notifications").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "confirmed"),
      supabase.from("quality_audits").select("id", { count: "exact", head: true }).eq("project_id", projectId).eq("status", "completed"),
    ]);

    const ppiDone = ppiRes.count ?? 0;
    const rmsgqDone = rmsgqRes.count ?? 0;
    const ncDone = ncRes.count ?? 0;
    const pameDone = pameRes.count ?? 0;
    const hpDone = hpRes.count ?? 0;
    const auditsDone = auditsRes.count ?? 0;

    const { data: items } = await supabase
      .from("dfo_items" as any)
      .select("id, code, status")
      .eq("project_id", projectId);

    const updates: { id: string; status: string }[] = [];

    for (const item of (items ?? []) as any[]) {
      let newStatus: string | null = null;

      if (item.code.includes("PPI") && ppiDone > 0)
        newStatus = ppiDone >= 12 ? "complete" : "in_progress";
      if (item.code.includes("RM-SGQ") && rmsgqDone > 0)
        newStatus = "in_progress";
      if (item.code.includes("LNC") && ncDone > 0)
        newStatus = "in_progress";
      if (item.code.includes("PAME") && pameDone > 0)
        newStatus = "in_progress";
      if (item.code.includes("NOT-HP") && hpDone > 0)
        newStatus = "in_progress";
      if (item.code.includes("RAI") && auditsDone > 0)
        newStatus = auditsDone >= 4 ? "complete" : "in_progress";

      if (newStatus && item.status === "pending") {
        updates.push({ id: item.id, status: newStatus });
      }
    }

    if (updates.length > 0) {
      await Promise.all(
        updates.map(u =>
          supabase.from("dfo_items" as any).update({ status: u.status }).eq("id", u.id)
        )
      );
    }
  },

  async exportDfoIndex(volumes: DfoVolume[], meta: ReportMeta): Promise<void> {
    const labels: ReportLabels = {
      appName: "Atlas QMS",
      reportTitle: `DFO-${meta.projectCode}-001 — Dossier Final de Obra`,
      generatedOn: "Gerado em",
    };

    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-PT");
    const statusLabels: Record<string, string> = {
      pending: "PENDENTE", in_progress: "EM CURSO", complete: "COMPLETO", not_applicable: "N/A",
    };
    const statusColors: Record<string, string> = {
      pending: "#6b7280", in_progress: "#2563eb", complete: "#166534", not_applicable: "#999",
    };

    const header = await headerHtmlAsync(labels.reportTitle, labels, meta);

    // Volumes HTML
    let volumesHtml = "";
    let totalItems = 0;
    let totalComplete = 0;

    for (const vol of volumes) {
      const items = vol.items ?? [];
      const applicable = items.filter(i => i.status !== "not_applicable");
      const completed = applicable.filter(i => i.status === "complete").length;
      const pct = applicable.length > 0 ? Math.round((completed / applicable.length) * 100) : 0;
      totalItems += applicable.length;
      totalComplete += completed;

      volumesHtml += `
        <div style="margin-top:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2F4F75;padding-bottom:4px;margin-bottom:8px">
            <span style="font-size:13px;font-weight:800;color:#2F4F75">Vol. ${vol.volume_no} — ${vol.title}</span>
            <span style="font-size:10px;color:#6b7280">${completed}/${applicable.length} (${pct}%)</span>
          </div>
          ${vol.description ? `<p style="font-size:9px;color:#6b7280;margin-bottom:6px">${vol.description}</p>` : ""}
          <table class="atlas-table">
            <thead><tr><th>Código</th><th>Título</th><th>Estado</th><th>Documento</th><th>Notas</th></tr></thead>
            <tbody>
              ${items.map(item => `<tr>
                <td style="font-family:monospace;font-size:10px">${item.code}</td>
                <td>${item.title}</td>
                <td><span style="color:${statusColors[item.status] ?? "#333"};font-weight:700;font-size:9px">${statusLabels[item.status] ?? item.status}</span></td>
                <td style="font-size:9px">${item.linked_doc ? `${item.linked_doc.code ?? ""} — ${item.linked_doc.title}` : "—"}</td>
                <td style="font-size:9px;color:#6b7280">${item.notes ?? "—"}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    }

    // Summary
    const overallPct = totalItems > 0 ? Math.round((totalComplete / totalItems) * 100) : 0;
    const summaryHtml = `
      <div style="margin-top:24px;border-top:2px solid #2F4F75;padding-top:12px">
        <h3 style="font-size:13px;font-weight:800;color:#2F4F75;margin:0 0 8px">Resumo de Conclusão</h3>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1;height:20px;background:#e5e7eb;border-radius:10px;overflow:hidden">
            <div style="height:100%;width:${overallPct}%;background:${overallPct === 100 ? '#166534' : '#2F4F75'};border-radius:10px;transition:width .5s"></div>
          </div>
          <span style="font-size:14px;font-weight:900;color:#2F4F75">${overallPct}%</span>
        </div>
        <p style="font-size:10px;color:#6b7280;margin-top:4px">${totalComplete} de ${totalItems} itens aplicáveis completos</p>
      </div>`;

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>DFO — Atlas QMS</title>
<style>${sharedCss()}</style></head><body>
${header}
${projectInfoStripHtml(null)}
${volumesHtml}
${summaryHtml}
<div class="atlas-footer" style="margin-top:20px;padding-top:8px;border-top:1px solid #ccc;display:flex;justify-content:space-between;font-size:8px;color:#999">
  <span>Atlas QMS · ${meta.projectCode} · Gerado em ${fmtDate(new Date().toISOString())}</span>
  <span>DFO-${meta.projectCode}-001</span>
</div>
</body></html>`;

    printHtml(fullHtml, `DFO_${meta.projectCode}.pdf`);
  },
};
