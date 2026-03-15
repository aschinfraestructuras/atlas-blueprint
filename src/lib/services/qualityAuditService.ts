/**
 * Quality Audit Service — manages dedicated audit records (quality_audits table)
 */
import { supabase } from "@/integrations/supabase/client";
import { projectInfoStripHtml } from "./pdfProjectHeader";

export interface QualityAudit {
  id: string;
  project_id: string;
  code: string;
  audit_type: "internal" | "external" | "surveillance" | "closing";
  status: "planned" | "in_progress" | "completed" | "cancelled";
  planned_date: string;
  completed_date: string | null;
  auditor_name: string | null;
  scope: string | null;
  findings: string | null;
  observations: string | null;
  nc_count: number;
  obs_count: number;
  report_ref: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityAuditInput {
  project_id: string;
  audit_type: string;
  planned_date: string;
  auditor_name?: string;
  scope?: string;
}

const ATLAS_LOGO_SVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#2F4F75"/><path d="M16 4L6 9v7c0 5.25 4.25 10.15 10 11.35C21.75 26.15 26 21.25 26 16V9L16 4z" fill="white" fill-opacity="0.9"/><path d="M13 16l2 2 4-4" stroke="#2F4F75" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const AUDIT_TYPE_LABELS: Record<string, string> = {
  internal: "Interna",
  external: "Externa",
  surveillance: "Vigilância",
  closing: "Encerramento",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planeada",
  in_progress: "Em Curso",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const qualityAuditService = {
  async create(input: QualityAuditInput): Promise<QualityAudit> {
    const { data: codeData, error: codeErr } = await (supabase as any).rpc(
      "fn_next_audit_code",
      { p_project_id: input.project_id }
    );
    if (codeErr) throw codeErr;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await (supabase as any)
      .from("quality_audits")
      .insert({
        project_id: input.project_id,
        code: codeData as string,
        audit_type: input.audit_type,
        planned_date: input.planned_date,
        auditor_name: input.auditor_name ?? null,
        scope: input.scope ?? null,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as QualityAudit;
  },

  async listByProject(projectId: string): Promise<QualityAudit[]> {
    const { data, error } = await (supabase as any)
      .from("quality_audits")
      .select("*")
      .eq("project_id", projectId)
      .neq("status", "cancelled")
      .order("planned_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as QualityAudit[];
  },

  async update(id: string, updates: Partial<QualityAudit>): Promise<QualityAudit> {
    const { data, error } = await (supabase as any)
      .from("quality_audits")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as QualityAudit;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("quality_audits")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  exportRaiPdf(audit: QualityAudit, projectName: string) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>RAI ${audit.code}</title>
<style>
@page { size: A4; margin: 18mm; }
body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; color: #1a1a1a; margin: 0; padding: 20px; }
.header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #2F4F75; padding-bottom: 12px; margin-bottom: 20px; }
.logo { flex-shrink: 0; }
.header-text h1 { font-size: 16px; margin: 0; color: #2F4F75; }
.header-text p { margin: 2px 0 0; font-size: 11px; color: #666; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.meta-item { padding: 8px 12px; background: #f8f9fa; border-radius: 4px; }
.meta-item label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; display: block; }
.meta-item span { font-size: 12px; font-weight: 600; }
.section { margin-bottom: 16px; }
.section h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #2F4F75; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 0 0 8px; }
.section p { white-space: pre-wrap; line-height: 1.6; }
.counts { display: flex; gap: 20px; margin: 16px 0; }
.count-box { padding: 12px 20px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
.count-box .num { font-size: 24px; font-weight: 700; }
.count-box .lbl { font-size: 9px; text-transform: uppercase; color: #888; }
.sig-block { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
.sig-item { text-align: center; }
.sig-item .line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 4px; }
.sig-item .role { font-size: 9px; text-transform: uppercase; color: #888; }
.footer { margin-top: 40px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
</style></head><body>
<div class="header">
  <div class="logo">${ATLAS_LOGO_SVG}</div>
  <div class="header-text">
    <h1>ATLAS QMS — Relatório de Auditoria Interna</h1>
    <p>${projectName}</p>
  </div>
</div>
${projectInfoStripHtml()}
<div class="meta-grid">
  <div class="meta-item"><label>Código</label><span>${audit.code}</span></div>
  <div class="meta-item"><label>Tipo</label><span>${AUDIT_TYPE_LABELS[audit.audit_type] ?? audit.audit_type}</span></div>
  <div class="meta-item"><label>Data Planeada</label><span>${new Date(audit.planned_date).toLocaleDateString("pt-PT")}</span></div>
  <div class="meta-item"><label>Estado</label><span>${STATUS_LABELS[audit.status] ?? audit.status}</span></div>
  <div class="meta-item"><label>Auditor</label><span>${audit.auditor_name ?? "—"}</span></div>
  ${audit.completed_date ? `<div class="meta-item"><label>Data Conclusão</label><span>${new Date(audit.completed_date).toLocaleDateString("pt-PT")}</span></div>` : ""}
</div>
${audit.scope ? `<div class="section"><h2>Âmbito</h2><p>${audit.scope}</p></div>` : ""}
<div class="counts">
  <div class="count-box"><div class="num" style="color:#DC2626">${audit.nc_count}</div><div class="lbl">Não Conformidades</div></div>
  <div class="count-box"><div class="num" style="color:#D97706">${audit.obs_count}</div><div class="lbl">Observações</div></div>
</div>
${audit.findings ? `<div class="section"><h2>Constatações</h2><p>${audit.findings}</p></div>` : ""}
${audit.observations ? `<div class="section"><h2>Observações</h2><p>${audit.observations}</p></div>` : ""}
${audit.report_ref ? `<div class="section"><h2>Referência do Relatório</h2><p>${audit.report_ref}</p></div>` : ""}
<div class="sig-block">
  <div class="sig-item"><div class="line"></div><div class="role">Auditor</div></div>
  <div class="sig-item"><div class="line"></div><div class="role">Director de Obra (DO)</div></div>
  <div class="sig-item"><div class="line"></div><div class="role">Resp. Qualidade (RQ)</div></div>
</div>
<div class="footer">Atlas QMS · PF17A · ACE ASCH Infraestructuras + Cimontubo</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  },
};
