import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface Plan {
  id: string;
  project_id: string;
  created_by: string;
  plan_type: string;   // PQO | PIE | PPI | ITP | MethodStatement | TestPlan | Schedule
  title: string;
  revision: string | null;
  status: string;      // draft | under_review | approved | superseded
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanInput {
  project_id: string;
  created_by: string;
  plan_type: string;
  title: string;
  revision?: string;
  status?: string;
  file_url?: string;
}

export const planService = {
  async getByProject(projectId: string): Promise<Plan[]> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Plan[];
  },

  async create(input: PlanInput): Promise<Plan> {
    const { data, error } = await supabase
      .from("plans")
      .insert({
        project_id: input.project_id,
        created_by: input.created_by,
        plan_type: input.plan_type,
        title: input.title,
        revision: input.revision ?? "0",
        status: input.status ?? "draft",
        file_url: input.file_url ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "plans",
      entityId: (data as Plan).id,
      action: "INSERT",
      module: "plans",
      diff: { plan_type: input.plan_type, title: input.title, status: input.status ?? "draft" },
    });
    return data as Plan;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<PlanInput, "project_id" | "created_by">>
  ): Promise<Plan> {
    const { data, error } = await supabase
      .from("plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "plans",
      entityId: id,
      action: "UPDATE",
      module: "plans",
      diff: updates as Record<string, unknown>,
    });
    return data as Plan;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "plans",
      entityId: id,
      action: "DELETE",
      module: "plans",
    });
  },
};
