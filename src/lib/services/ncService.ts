import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface NonConformity {
  id: string;
  project_id: string;
  reference: string | null;
  description: string;
  severity: string;
  status: string;
  responsible: string | null;
  due_date: string | null;
  root_cause: string | null;
  corrective_action: string | null;
  closure_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NCInput {
  project_id: string;
  description: string;
  severity: string;
  status?: string;
  reference?: string;
  responsible?: string;
  due_date?: string;
  root_cause?: string;
  corrective_action?: string;
  created_by: string;
}

export const ncService = {
  async getByProject(projectId: string): Promise<NonConformity[]> {
    const { data, error } = await supabase
      .from("non_conformities")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as NonConformity[];
  },

  async create(input: NCInput): Promise<NonConformity> {
    const { data, error } = await supabase
      .from("non_conformities")
      .insert({
        project_id: input.project_id,
        description: input.description,
        severity: input.severity,
        status: input.status ?? "open",
        reference: input.reference ?? null,
        responsible: input.responsible ?? null,
        due_date: input.due_date ?? null,
        root_cause: input.root_cause ?? null,
        corrective_action: input.corrective_action ?? null,
        created_by: input.created_by,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "non_conformities",
      entityId: (data as NonConformity).id,
      action: "INSERT",
      module: "non_conformities",
      description: `NC criada: ${input.description.slice(0, 80)}`,
      diff: { description: input.description, severity: input.severity, status: input.status ?? "open" },
    });
    return data as unknown as NonConformity;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<NCInput, "project_id" | "created_by">>,
    prevStatus?: string
  ): Promise<NonConformity> {
    // Auto-set closure_date when closing
    const payload: Record<string, unknown> = { ...updates };
    if (updates.status === "closed" && prevStatus !== "closed") {
      payload.closure_date = new Date().toISOString().split("T")[0];
    }
    if (updates.status && updates.status !== "closed") {
      payload.closure_date = null;
    }

    const { data, error } = await supabase
      .from("non_conformities")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    // Build description for status changes
    let description: string | undefined;
    if (updates.status && prevStatus && updates.status !== prevStatus) {
      description = `NC status: ${prevStatus} → ${updates.status}`;
    }

    await auditService.log({
      projectId,
      entity: "non_conformities",
      entityId: id,
      action: updates.status && prevStatus && updates.status !== prevStatus ? "status_change" : "UPDATE",
      module: "non_conformities",
      description,
      diff: updates as Record<string, unknown>,
    });
    return data as unknown as NonConformity;
  },

  async getOpenCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("non_conformities")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .neq("status", "closed");
    if (error) throw error;
    return count ?? 0;
  },
};
