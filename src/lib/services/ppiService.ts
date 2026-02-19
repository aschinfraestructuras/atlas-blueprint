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

// 'pending' = not yet reviewed (initial state from template clone)
// 'na'      = not applicable (user explicitly marks N/A)
// 'pass'/'fail' = reviewed outcome
export const PPI_ITEM_RESULTS = ["pending", "na", "pass", "fail"] as const;
export type PpiItemResult = typeof PPI_ITEM_RESULTS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PpiTemplate {
  id: string;
  project_id: string;
  code: string;
  disciplina: PpiDisciplina;
  /** Free-text label when disciplina === 'outros' */
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
  /** Free-text label when disciplina === 'outros' */
  disciplina_outro: string | null;
  opened_at: string;
  closed_at: string | null;
  inspector_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
}

export interface PpiInstanceFilters {
  status?: PpiInstanceStatus;
  disciplina?: PpiDisciplina;
  work_item_id?: string;
}

export interface UpdateInstanceItemInput {
  result: PpiItemResult;
  notes?: string | null;
  evidence_file_id?: string | null;
  checked_by?: string | null;
  checked_at?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const ppiService = {

  // ── Templates ──────────────────────────────────────────────────────────────

  /** List all templates for a project. By default only active ones. */
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

  /** Get a single template with its items. */
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

  /** Create a template (without items). */
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

  /** Add items to an existing template (batch). */
  async addTemplateItems(items: PpiTemplateItemInput[]): Promise<PpiTemplateItem[]> {
    if (items.length === 0) return [];
    const rows = items.map((it) => ({
      template_id:         it.template_id,
      item_no:             it.item_no,
      check_code:          it.check_code,
      label:               it.label,
      method:              it.method              ?? null,
      acceptance_criteria: it.acceptance_criteria ?? null,
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

  /** Update template metadata (not items). */
  async updateTemplate(
    templateId: string,
    projectId: string,
    updates: Partial<Pick<PpiTemplate, "title" | "description" | "disciplina" | "disciplina_outro" | "version" | "is_active">>
  ): Promise<PpiTemplate> {
    // Auto-clear disciplina_outro when disciplina changes away from 'outros'
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

  /** Soft-archive a template (sets is_active = false). Does NOT delete. */
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

  /**
   * List PPI instances for a project with optional filters.
   * Joins template to expose disciplina for filtering.
   */
  async listInstances(
    projectId: string,
    filters?: PpiInstanceFilters
  ): Promise<(PpiInstance & { template_disciplina: string | null; template_code: string | null })[]> {
    let q = supabase
      .from("ppi_instances")
      .select(`
        *,
        ppi_templates ( disciplina, code )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (filters?.status)       q = q.eq("status", filters.status);
    if (filters?.work_item_id) q = q.eq("work_item_id", filters.work_item_id);

    const { data, error } = await q;
    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      ...row,
      template_disciplina: row.ppi_templates?.disciplina ?? null,
      template_code:       row.ppi_templates?.code       ?? null,
      ppi_templates: undefined,
    }));
  },

  /** Get a single PPI instance with all its items. */
  async getInstance(
    instanceId: string
  ): Promise<PpiInstance & { items: PpiInstanceItem[] }> {
    const [{ data: inst, error: e1 }, { data: items, error: e2 }] = await Promise.all([
      supabase.from("ppi_instances").select("*").eq("id", instanceId).single(),
      supabase
        .from("ppi_instance_items")
        .select("*")
        .eq("instance_id", instanceId)
        .order("item_no", { ascending: true }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    return { ...(inst as PpiInstance), items: (items ?? []) as PpiInstanceItem[] };
  },


  /**
   * Create a PPI instance via the atomic DB function fn_create_ppi_instance.
   * - If template_id provided: items cloned with result='pending', order preserved
   * - If code is empty: auto-generated as PPI-{PROJECT_CODE}-{0001}
   * - Fully transactional: any failure rolls back the entire creation
   * - Guard: if instance already has items, no duplicate copy is made
   */
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
    });
    if (error) throw error;

    const row = (data as any[])[0];
    const instanceId   = row.instance_id    as string;
    const generatedCode = row.generated_code as string;
    const hadExisting  = row.had_existing_items as boolean;

    // Fetch the created instance + its items
    const { items, ...instance } = await this.getInstance(instanceId);

    await auditService.log({
      projectId:   input.project_id,
      entity:      "ppi_instances",
      entityId:    instanceId,
      action:      "INSERT",
      module:      "ppi",
      description: `PPI criado: ${generatedCode} a partir do template ${templateId}`,
      diff: {
        code:          generatedCode,
        work_item_id:  input.work_item_id,
        template_id:   templateId,
        items_created: row.items_created,
        had_existing:  hadExisting,
      },
    });

    return { ...instance, items, hadExistingItems: hadExisting };
  },

  /** Create a blank PPI instance (no template) via the atomic DB function. */
  async createBlankInstance(input: PpiInstanceInput): Promise<PpiInstance & { generatedCode: string }> {
    const { data, error } = await supabase.rpc("fn_create_ppi_instance", {
      p_project_id:       input.project_id,
      p_work_item_id:     input.work_item_id,
      p_template_id:      null,
      p_code:             input.code || null,
      p_inspector_id:     input.inspector_id    ?? null,
      p_created_by:       input.created_by      ?? null,
      p_disciplina_outro: input.disciplina_outro ?? null,
    });
    if (error) throw error;

    const row = (data as any[])[0];
    const instanceId    = row.instance_id    as string;
    const generatedCode = row.generated_code as string;

    // Fetch the created instance
    const { data: inst, error: fetchErr } = await supabase
      .from("ppi_instances")
      .select("*")
      .eq("id", instanceId)
      .single();
    if (fetchErr) throw fetchErr;

    await auditService.log({
      projectId:   input.project_id,
      entity:      "ppi_instances",
      entityId:    instanceId,
      action:      "INSERT",
      module:      "ppi",
      description: `PPI criado (em branco): ${generatedCode}`,
    });

    return { ...(inst as PpiInstance), generatedCode };
  },

  /**
   * Transition instance status.
   * Auto-sets closed_at when moving to 'approved' | 'rejected' | 'archived'.
   */
  async updateInstanceStatus(
    instanceId: string,
    projectId: string,
    fromStatus: PpiInstanceStatus,
    toStatus: PpiInstanceStatus
  ): Promise<PpiInstance> {
    const isTerminal = ["approved", "rejected", "archived"].includes(toStatus);
    const payload: Record<string, unknown> = {
      status: toStatus,
      closed_at: isTerminal ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("ppi_instances")
      .update(payload)
      .eq("id", instanceId)
      .select()
      .single();
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_instances",
      entityId: instanceId,
      action: "status_change",
      module: "ppi",
      description: `PPI status: ${fromStatus} → ${toStatus}`,
      diff: { from: fromStatus, to: toStatus },
    });

    return data as PpiInstance;
  },

  /** Update a single inspection item result. */
  async updateInstanceItemResult(
    itemId: string,
    instanceId: string,
    projectId: string,
    updates: UpdateInstanceItemInput
  ): Promise<PpiInstanceItem> {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      result:           updates.result,
      notes:            updates.notes            ?? null,
      evidence_file_id: updates.evidence_file_id ?? null,
      checked_by:       updates.checked_by       ?? user?.id ?? null,
      checked_at:       updates.checked_at       ?? new Date().toISOString(),
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
      description: `Item resultado: ${updates.result}`,
      diff: { instance_id: instanceId, result: updates.result },
    });

    return data as PpiInstanceItem;
  },

  /** Delete an instance (cascade deletes items via FK). */
  async deleteInstance(instanceId: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("ppi_instances")
      .delete()
      .eq("id", instanceId);
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "ppi_instances",
      entityId: instanceId,
      action: "DELETE",
      module: "ppi",
    });
  },

  // ── KPI helpers ────────────────────────────────────────────────────────────

  async getOpenCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("ppi_instances")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
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
