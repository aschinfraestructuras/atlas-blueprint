import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Stable code enums (stored in DB) ────────────────────────────────────────

export const PPI_DISCIPLINAS = [
  "geral", "terras", "firmes", "betao",
  "estruturas", "drenagem", "ferrovia", "instalacoes", "outros",
] as const;

export type PpiDisciplina = typeof PPI_DISCIPLINAS[number];

export const PPI_INSTANCE_STATUSES = [
  "draft", "in_progress", "submitted", "approved", "rejected", "archived",
] as const;

export type PpiInstanceStatus = typeof PPI_INSTANCE_STATUSES[number];

export const PPI_ITEM_RESULTS = ["pending", "pass", "fail", "na"] as const;
export type PpiItemResult = typeof PPI_ITEM_RESULTS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PpiTemplate {
  id: string;
  project_id: string;
  code: string;
  disciplina: PpiDisciplina;
  disciplina_outro: string | null;
  title: string;
  description: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PpiTemplateItem {
  id: string;
  template_id: string;
  item_no: number;
  check_code: string;
  label: string;
  method: string | null;
  acceptance_criteria: string | null;
  inspection_point_type: string | null;
  required: boolean;
  evidence_required: boolean;
  sort_order: number;
}

export interface PpiInstance {
  id: string;
  project_id: string;
  work_item_id: string;
  template_id: string | null;
  code: string;
  status: PpiInstanceStatus;
  disciplina_outro: string | null;
  inspection_date: string | null;
  opened_at: string;
  closed_at: string | null;
  inspector_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // PRO fields
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  archived_at: string | null;
  archived_by: string | null;
  // soft delete
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface PpiInstanceItem {
  id: string;
  instance_id: string;
  item_no: number;
  check_code: string;
  label: string;
  result: PpiItemResult;
  notes: string | null;
  evidence_file_id: string | null;
  checked_by: string | null;
  checked_at: string | null;
  requires_nc: boolean;
  nc_id: string | null;
  // PRO snapshot fields
  evidence_required: boolean;
  method: string | null;
  acceptance_criteria: string | null;
  inspection_point_type: string | null;
  sort_order: number;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface PpiTemplateInput {
  project_id: string;
  code: string;
  disciplina: PpiDisciplina;
  disciplina_outro?: string | null;
  title: string;
  description?: string | null;
  version?: number;
  is_active?: boolean;
  created_by?: string | null;
}

export interface PpiTemplateItemInput {
  template_id: string;
  item_no: number;
  check_code: string;
  label: string;
  method?: string | null;
  acceptance_criteria?: string | null;
  inspection_point_type?: string | null;
  required?: boolean;
  evidence_required?: boolean;
  sort_order?: number;
}

export interface PpiInstanceInput {
  project_id: string;
  work_item_id: string;
  template_id?: string | null;
  code: string;
  disciplina_outro?: string | null;
  inspector_id?: string | null;
  created_by?: string | null;
  inspection_date?: string | null;
}

export interface PpiInstanceFilters {
  status?: PpiInstanceStatus;
  disciplina?: PpiDisciplina;
  work_item_id?: string;
  includeDeleted?: boolean;
}

export interface UpdateInstanceItemInput {
  result: PpiItemResult;
  notes?: string | null;
  evidence_file_id?: string | null;
  checked_by?: string | null;
  checked_at?: string | null;
}

export interface BulkItemUpdate {
  id: string;
  result: PpiItemResult;
  notes?: string | null;
}

// ─── KPI type ─────────────────────────────────────────────────────────────────

export interface PpiKpis {
  total: number;
  draft_count: number;
  in_progress_count: number;
  submitted_count: number;
  approved_count: number;
  rejected_count: number;
  archived_count: number;
  overdue_approval: number;
  items_pass: number;
  items_fail: number;
  items_pending: number;
  avg_cycle_days: number | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const ppiService = {

  // ── Templates ──────────────────────────────────────────────────────────────

  async listTemplates(
    projectId: string,
    opts?: { includeInactive?: boolean }
  ): Promise<PpiTemplate[]> {
    let q = supabase
      .from("ppi_templates")
      .select("*")
      .eq("project_id", projectId)
      .order("disciplina", { ascending: true })
      .order("code", { ascending: true });

    if (!opts?.includeInactive) {
      q = q.eq("is_active", true);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PpiTemplate[];
  },

  async getTemplate(templateId: string): Promise<PpiTemplate & { items: PpiTemplateItem[] }> {
    const [{ data: tmpl, error: e1 }, { data: items, error: e2 }] = await Promise.all([
      supabase.from("ppi_templates").select("*").eq("id", templateId).single(),
      supabase
        .from("ppi_template_items")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order", { ascending: true })
        .order("item_no", { ascending: true }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    return { ...(tmpl as PpiTemplate), items: (items ?? []) as PpiTemplateItem[] };
  },

  async createTemplate(input: PpiTemplateInput): Promise<PpiTemplate> {
    const { data, error } = await supabase
      .from("ppi_templates")
      .insert({
        project_id:      input.project_id,
        code:            input.code,
        disciplina:      input.disciplina,
        disciplina_outro: input.disciplina === "outros" ? (input.disciplina_outro ?? null) : null,
        title:           input.title,
        description:     input.description ?? null,
        version:         input.version     ?? 1,
        is_active:       input.is_active   ?? true,
        created_by:      input.created_by  ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId: input.project_id,
      entity: "ppi_templates",
      entityId: (data as PpiTemplate).id,
      action: "INSERT",
      module: "ppi",
      description: `Template PPI criado: ${input.code} — ${input.title}`,
      diff: { code: input.code, disciplina: input.disciplina, title: input.title },
    });

    return data as PpiTemplate;
  },

  async addTemplateItems(items: PpiTemplateItemInput[]): Promise<PpiTemplateItem[]> {
    if (items.length === 0) return [];
    const rows = items.map((it) => ({
      template_id:         it.template_id,
      item_no:             it.item_no,
      check_code:          it.check_code,
      label:               it.label,
      method:              it.method              ?? null,
      acceptance_criteria: it.acceptance_criteria ?? null,
      inspection_point_type: it.inspection_point_type ?? "na",
      required:            it.required            ?? true,
      evidence_required:   it.evidence_required   ?? false,
      sort_order:          it.sort_order          ?? it.item_no,
    }));
    const { data, error } = await supabase
      .from("ppi_template_items")
      .insert(rows)
      .select();
    if (error) throw error;
    return (data ?? []) as PpiTemplateItem[];
  },

  async updateTemplate(
    templateId: string,
    projectId: string,
    updates: Partial<Pick<PpiTemplate, "title" | "description" | "disciplina" | "disciplina_outro" | "version" | "is_active">>
  ): Promise<PpiTemplate> {
    const payload: typeof updates = {
      ...updates,
      disciplina_outro: updates.disciplina && updates.disciplina !== "outros"
        ? null
        : updates.disciplina_outro,
    };
    const { data, error } = await supabase
      .from("ppi_templates")
      .update(payload)
      .eq("id", templateId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_templates",
      entityId: templateId,
      action: "UPDATE",
      module: "ppi",
      diff: payload as Record<string, unknown>,
    });

    return data as PpiTemplate;
  },

  async archiveTemplate(templateId: string, projectId: string): Promise<PpiTemplate> {
    const { data, error } = await supabase
      .from("ppi_templates")
      .update({ is_active: false })
      .eq("id", templateId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_templates",
      entityId: templateId,
      action: "ARCHIVE",
      module: "ppi",
      description: "Template arquivado",
    });

    return data as PpiTemplate;
  },

  // ── Instances ──────────────────────────────────────────────────────────────

  async listInstances(
    projectId: string,
    filters?: PpiInstanceFilters
  ): Promise<(PpiInstance & { template_disciplina: string | null; template_code: string | null; hp_pending_count: number })[]> {
    let q = supabase
      .from("ppi_instances")
      .select(`
        *,
        ppi_templates ( disciplina, code )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (!filters?.includeDeleted) {
      q = q.eq("is_deleted", false);
    }

    if (filters?.status)       q = q.eq("status", filters.status);
    if (filters?.work_item_id) q = q.eq("work_item_id", filters.work_item_id);

    const { data, error } = await q;
    if (error) throw error;

    // Fetch HP pending counts for all instances
    const instanceIds = (data ?? []).map((r: any) => r.id);
    let hpCounts: Record<string, number> = {};
    
    if (instanceIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("ppi_instance_items")
        .select("instance_id, ipt_e, ipt_f, ipt_ip, result")
        .in("instance_id", instanceIds);
      
      // Count items where any ipt field is 'hp' and result is 'pending'
      (itemsData ?? []).forEach((item: any) => {
        const hasHp = item.ipt_e === "hp" || item.ipt_f === "hp" || item.ipt_ip === "hp";
        const isPending = item.result === "pending";
        if (hasHp && isPending) {
          hpCounts[item.instance_id] = (hpCounts[item.instance_id] || 0) + 1;
        }
      });
    }

    return ((data ?? []) as any[]).map((row) => ({
      ...row,
      template_disciplina: row.ppi_templates?.disciplina ?? null,
      template_code:       row.ppi_templates?.code       ?? null,
      hp_pending_count:    hpCounts[row.id] ?? 0,
      ppi_templates: undefined,
    }));
  },

  async getInstance(
    instanceId: string
  ): Promise<PpiInstance & { items: PpiInstanceItem[] }> {
    const [{ data: inst, error: e1 }, { data: items, error: e2 }] = await Promise.all([
      supabase.from("ppi_instances").select("*").eq("id", instanceId).single(),
      supabase
        .from("ppi_instance_items")
        .select("*")
        .eq("instance_id", instanceId)
        .order("sort_order", { ascending: true })
        .order("item_no", { ascending: true }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    return { ...(inst as PpiInstance), items: (items ?? []) as PpiInstanceItem[] };
  },

  async createInstanceFromTemplate(
    input: PpiInstanceInput,
    templateId: string
  ): Promise<PpiInstance & { items: PpiInstanceItem[]; hadExistingItems: boolean }> {
    const { data, error } = await supabase.rpc("fn_create_ppi_instance", {
      p_project_id:       input.project_id,
      p_work_item_id:     input.work_item_id,
      p_template_id:      templateId,
      p_code:             input.code || null,
      p_inspector_id:     input.inspector_id    ?? null,
      p_created_by:       input.created_by      ?? null,
      p_disciplina_outro: input.disciplina_outro ?? null,
      p_inspection_date:  input.inspection_date  ?? null,
    } as any);
    if (error) throw error;

    const row = (data as any[])[0];
    const instanceId    = row.instance_id    as string;
    const hadExisting   = row.had_existing_items as boolean;

    const { items, ...instance } = await this.getInstance(instanceId);

    return { ...instance, items, hadExistingItems: hadExisting };
  },

  async createBlankInstance(input: PpiInstanceInput): Promise<PpiInstance & { generatedCode: string }> {
    const { data, error } = await supabase.rpc("fn_create_ppi_instance", {
      p_project_id:       input.project_id,
      p_work_item_id:     input.work_item_id,
      p_template_id:      null,
      p_code:             input.code || null,
      p_inspector_id:     input.inspector_id    ?? null,
      p_created_by:       input.created_by      ?? null,
      p_disciplina_outro: input.disciplina_outro ?? null,
      p_inspection_date:  input.inspection_date  ?? null,
    } as any);
    if (error) throw error;

    const row           = (data as any[])[0];
    const instanceId    = row.instance_id    as string;
    const generatedCode = row.generated_code as string;

    const { data: inst, error: fetchErr } = await supabase
      .from("ppi_instances")
      .select("*")
      .eq("id", instanceId)
      .single();
    if (fetchErr) throw fetchErr;

    return { ...(inst as PpiInstance), generatedCode };
  },

  /**
   * Transition instance status via server-side validated DB function.
   * Now supports rejection reason via p_reason parameter.
   */
  async updateInstanceStatus(
    instanceId: string,
    projectId: string,
    fromStatus: PpiInstanceStatus,
    toStatus: PpiInstanceStatus,
    reason?: string
  ): Promise<PpiInstance> {
    const { data, error } = await supabase.rpc("fn_ppi_instance_transition" as any, {
      p_instance_id: instanceId,
      p_to_status:   toStatus,
      p_reason:      reason ?? null,
    });
    if (error) throw error;

    return (Array.isArray(data) ? data[0] : data) as PpiInstance;
  },

  async updateInstanceItemResult(
    itemId: string,
    instanceId: string,
    projectId: string,
    updates: UpdateInstanceItemInput
  ): Promise<PpiInstanceItem> {
    const { data: { user } } = await supabase.auth.getUser();
    const isFail = updates.result === "fail";
    const payload = {
      result:           updates.result,
      notes:            updates.notes            ?? null,
      evidence_file_id: updates.evidence_file_id ?? null,
      checked_by:       updates.checked_by       ?? user?.id ?? null,
      checked_at:       updates.checked_at       ?? new Date().toISOString(),
      requires_nc:      isFail,
    };

    const { data, error } = await supabase
      .from("ppi_instance_items")
      .update(payload)
      .eq("id", itemId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_instance_items",
      entityId: itemId,
      action: "UPDATE",
      module: "ppi",
      description: `Item resultado: ${updates.result}${isFail ? " (requer NC)" : ""}`,
      diff: { instance_id: instanceId, result: updates.result, requires_nc: isFail },
    });

    return data as PpiInstanceItem;
  },

  async bulkMarkAllOk(instanceId: string, projectId: string): Promise<number> {
    const { data, error } = await supabase.rpc("fn_ppi_bulk_mark_ok" as any, {
      p_instance_id: instanceId,
    });
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_instances",
      entityId: instanceId,
      action: "BULK_MARK_OK",
      module: "ppi",
      description: `${data} itens marcados como OK`,
    });

    return data as number;
  },

  async bulkSaveItems(
    instanceId: string,
    projectId: string,
    items: BulkItemUpdate[]
  ): Promise<number> {
    const { data, error } = await supabase.rpc("fn_ppi_bulk_save_items" as any, {
      p_instance_id: instanceId,
      p_items:       items,
    });
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_instances",
      entityId: instanceId,
      action: "BULK_SAVE",
      module: "ppi",
      description: `${items.length} itens guardados em bloco`,
    });

    return data as number;
  },

  async linkNcToItem(
    itemId: string,
    ncId: string,
    projectId: string
  ): Promise<PpiInstanceItem> {
    const { data, error } = await supabase
      .from("ppi_instance_items")
      .update({ nc_id: ncId, requires_nc: true })
      .eq("id", itemId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_instance_items",
      entityId: itemId,
      action: "LINK_NC",
      module: "ppi",
      diff: { nc_id: ncId },
    });

    return data as PpiInstanceItem;
  },

  async updateInspectionDate(
    instanceId: string,
    projectId: string,
    inspectionDate: string | null
  ): Promise<PpiInstance> {
    const { data, error } = await supabase
      .from("ppi_instances")
      .update({ inspection_date: inspectionDate })
      .eq("id", instanceId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_instances",
      entityId: instanceId,
      action: "UPDATE",
      module: "ppi",
      description: `Data de inspeção actualizada: ${inspectionDate ?? "—"}`,
      diff: { inspection_date: inspectionDate },
    });

    return data as PpiInstance;
  },

  async softDeleteInstance(instanceId: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("ppi_instances")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as any)
      .eq("id", instanceId);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "ppi_instances", entityId: instanceId,
      action: "DELETE", module: "ppi",
      description: "PPI eliminado (soft)",
    });
  },

  async restoreInstance(instanceId: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("ppi_instances")
      .update({ is_deleted: false, deleted_at: null, deleted_by: null } as any)
      .eq("id", instanceId);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "ppi_instances", entityId: instanceId,
      action: "UPDATE", module: "ppi",
      description: "PPI restaurado",
    });
  },

  // ── KPI ────────────────────────────────────────────────────────────────────

  async getKpis(projectId: string): Promise<PpiKpis | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("vw_ppi_kpis")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    return data as PpiKpis | null;
  },

  async getOpenCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("ppi_instances")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .in("status", ["draft", "in_progress", "submitted"]);
    if (error) throw error;
    return count ?? 0;
  },

  async getPendingApprovalCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("ppi_instances")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "submitted");
    if (error) throw error;
    return count ?? 0;
  },
};
