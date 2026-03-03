import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkItemStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface WorkItem {
  id: string;
  project_id: string;
  sector: string;
  disciplina: string;
  obra: string | null;
  lote: string | null;
  elemento: string | null;
  parte: string | null;
  pk_inicio: number | null;
  pk_fim: number | null;
  status: WorkItemStatus | string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Readiness engine fields
  has_open_nc: boolean;
  has_pending_ppi: boolean;
  has_pending_tests: boolean;
  readiness_status: 'ready' | 'blocked' | 'not_ready' | string;
}

export interface WorkItemInput {
  project_id: string;
  sector: string;
  disciplina?: string;
  obra?: string;
  lote?: string;
  elemento?: string;
  parte?: string;
  pk_inicio?: number | null;
  pk_fim?: number | null;
  status?: WorkItemStatus;
  created_by?: string;
}

/** Format pk_inicio + pk_fim as "15+250" */
export function formatPk(pkInicio: number | null, pkFim: number | null): string {
  if (pkInicio == null && pkFim == null) return "—";
  const start = pkInicio ?? 0;
  const end   = pkFim   ?? 0;
  const km    = Math.floor(start / 1000);
  const m     = Math.round(start % 1000);
  const km2   = Math.floor(end   / 1000);
  const m2    = Math.round(end   % 1000);
  if (pkFim == null) return `${km}+${String(m).padStart(3, "0")}`;
  return `${km}+${String(m).padStart(3, "0")} → ${km2}+${String(m2).padStart(3, "0")}`;
}

export const WORK_ITEM_STATUS_OPTIONS: { value: WorkItemStatus; label: string }[] = [
  { value: "planned",     label: "Previsto"    },
  { value: "in_progress", label: "Em Execução" },
  { value: "completed",   label: "Concluído"   },
  { value: "cancelled",   label: "Cancelado"   },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const workItemService = {
  async getByProject(projectId: string, includeDeleted = false): Promise<WorkItem[]> {
    let q = supabase
      .from("work_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (!includeDeleted) q = q.eq("is_deleted", false);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as WorkItem[];
  },

  async getById(id: string): Promise<WorkItem> {
    const { data, error } = await supabase
      .from("work_items")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as WorkItem;
  },

  async create(input: WorkItemInput): Promise<WorkItem> {
    const { data, error } = await supabase
      .from("work_items")
      .insert({
        project_id: input.project_id,
        sector:     input.sector,
        disciplina: input.disciplina ?? "geral",
        obra:       input.obra      ?? null,
        lote:       input.lote      ?? null,
        elemento:   input.elemento  ?? null,
        parte:      input.parte     ?? null,
        pk_inicio:  input.pk_inicio ?? null,
        pk_fim:     input.pk_fim    ?? null,
        status:     input.status    ?? "planned",
        created_by: input.created_by ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "work_items",
      entityId: (data as WorkItem).id,
      action: "INSERT",
      module: "work_items",
      description: `Work Item criado: ${input.sector} / ${input.disciplina ?? "geral"}`,
      diff: { sector: input.sector, disciplina: input.disciplina, status: input.status ?? "planned" },
    });
    return data as WorkItem;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<WorkItemInput, "project_id" | "created_by">>
  ): Promise<WorkItem> {
    const { data, error } = await supabase
      .from("work_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "work_items",
      entityId: id,
      action: "UPDATE",
      module: "work_items",
      diff: updates as Record<string, unknown>,
    });
    return data as WorkItem;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("work_items")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as any)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "work_items",
      entityId: id,
      action: "DELETE",
      module: "work_items",
      description: "Work Item eliminado (soft)",
    });
  },

  async restore(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("work_items")
      .update({ is_deleted: false, deleted_at: null, deleted_by: null } as any)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "work_items",
      entityId: id,
      action: "UPDATE",
      module: "work_items",
      description: "Work Item restaurado",
    });
  },

  // ── KPI helpers ────────────────────────────────────────────────────────────

  async getTotalCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("work_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (error) throw error;
    return count ?? 0;
  },

  async getOpenCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("work_items")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["planned", "in_progress"]);
    if (error) throw error;
    return count ?? 0;
  },

  /** IDs of work_items that have at least one open NC */
  async getWithOpenNC(projectId: string): Promise<number> {
    const { data, error } = await supabase
      .from("non_conformities")
      .select("work_item_id")
      .eq("project_id", projectId)
      .neq("status", "closed")
      .not("work_item_id", "is", null);
    if (error) throw error;
    const unique = new Set((data ?? []).map((r: any) => r.work_item_id));
    return unique.size;
  },
};
