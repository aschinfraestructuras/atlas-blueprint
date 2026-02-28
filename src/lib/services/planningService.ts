import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WbsNode {
  id: string;
  project_id: string;
  parent_id: string | null;
  wbs_code: string;
  description: string;
  zone: string | null;
  planned_start: string | null;
  planned_end: string | null;
  responsible: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WbsInput {
  project_id: string;
  parent_id?: string | null;
  wbs_code: string;
  description: string;
  zone?: string;
  planned_start?: string;
  planned_end?: string;
  responsible?: string;
  created_by?: string;
}

export interface Activity {
  id: string;
  project_id: string;
  wbs_id: string | null;
  work_item_id: string | null;
  subcontractor_id: string | null;
  zone: string | null;
  description: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  progress_pct: number;
  status: string;
  constraints_text: string | null;
  requires_topography: boolean;
  requires_tests: boolean;
  requires_ppi: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  wbs_code?: string;
  work_item_sector?: string;
  subcontractor_name?: string;
}

export interface ActivityInput {
  project_id: string;
  wbs_id?: string | null;
  work_item_id?: string | null;
  subcontractor_id?: string | null;
  zone?: string;
  description: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  progress_pct?: number;
  status?: string;
  constraints_text?: string;
  requires_topography?: boolean;
  requires_tests?: boolean;
  requires_ppi?: boolean;
  created_by?: string;
}

export interface CompletionCheck {
  can_complete: boolean;
  blocks: string[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const planningService = {
  // WBS
  async getWbs(projectId: string): Promise<WbsNode[]> {
    const { data, error } = await (supabase as any)
      .from("planning_wbs")
      .select("*")
      .eq("project_id", projectId)
      .order("wbs_code");
    if (error) throw error;
    return data as WbsNode[];
  },

  async createWbs(input: WbsInput): Promise<WbsNode> {
    const { data, error } = await (supabase as any)
      .from("planning_wbs")
      .insert({
        project_id: input.project_id,
        parent_id: input.parent_id ?? null,
        wbs_code: input.wbs_code,
        description: input.description,
        zone: input.zone || null,
        planned_start: input.planned_start || null,
        planned_end: input.planned_end || null,
        responsible: input.responsible || null,
        created_by: input.created_by || null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "planning_wbs",
      entityId: (data as WbsNode).id,
      action: "INSERT",
      module: "planning",
      diff: { wbs_code: input.wbs_code, description: input.description },
    });
    return data as WbsNode;
  },

  async updateWbs(id: string, projectId: string, updates: Partial<Omit<WbsInput, "project_id">>): Promise<WbsNode> {
    const { data, error } = await (supabase as any)
      .from("planning_wbs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "planning_wbs",
      entityId: id,
      action: "UPDATE",
      module: "planning",
      diff: updates as Record<string, unknown>,
    });
    return data as WbsNode;
  },

  async deleteWbs(id: string, projectId: string): Promise<void> {
    const { error } = await (supabase as any).from("planning_wbs").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "planning_wbs", entityId: id, action: "DELETE", module: "planning" });
  },

  // Activities
  async getActivities(projectId: string): Promise<Activity[]> {
    const { data, error } = await (supabase as any)
      .from("planning_activities")
      .select("*, planning_wbs(wbs_code), work_items(sector), subcontractors(name)")
      .eq("project_id", projectId)
      .order("planned_start", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data as any[]).map((row) => ({
      ...row,
      wbs_code: row.planning_wbs?.wbs_code ?? null,
      work_item_sector: row.work_items?.sector ?? null,
      subcontractor_name: row.subcontractors?.name ?? null,
    })) as Activity[];
  },

  async createActivity(input: ActivityInput): Promise<Activity> {
    const { data, error } = await (supabase as any)
      .from("planning_activities")
      .insert({
        project_id: input.project_id,
        wbs_id: input.wbs_id ?? null,
        work_item_id: input.work_item_id ?? null,
        subcontractor_id: input.subcontractor_id ?? null,
        zone: input.zone || null,
        description: input.description,
        planned_start: input.planned_start || null,
        planned_end: input.planned_end || null,
        actual_start: input.actual_start || null,
        actual_end: input.actual_end || null,
        progress_pct: input.progress_pct ?? 0,
        status: input.status ?? "planned",
        constraints_text: input.constraints_text || null,
        requires_topography: input.requires_topography ?? false,
        requires_tests: input.requires_tests ?? false,
        requires_ppi: input.requires_ppi ?? false,
        created_by: input.created_by || null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "planning_activities",
      entityId: (data as Activity).id,
      action: "INSERT",
      module: "planning",
      diff: { description: input.description, status: input.status ?? "planned" },
    });
    return data as Activity;
  },

  async updateActivity(
    id: string,
    projectId: string,
    updates: Partial<Omit<ActivityInput, "project_id">>
  ): Promise<Activity> {
    const { data, error } = await (supabase as any)
      .from("planning_activities")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "planning_activities",
      entityId: id,
      action: "UPDATE",
      module: "planning",
      diff: updates as Record<string, unknown>,
    });
    return data as Activity;
  },

  async deleteActivity(id: string, projectId: string): Promise<void> {
    const { error } = await (supabase as any).from("planning_activities").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "planning_activities", entityId: id, action: "DELETE", module: "planning" });
  },

  // Smart completion check
  async checkCompletion(activityId: string): Promise<CompletionCheck> {
    const { data, error } = await supabase.rpc("fn_check_activity_completion", {
      p_activity_id: activityId,
    });
    if (error) throw error;
    return data as unknown as CompletionCheck;
  },
};
