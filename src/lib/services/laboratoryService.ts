import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface Laboratory {
  id: string;
  project_id: string;
  supplier_id: string;
  accreditation_body: string | null;
  accreditation_code: string | null;
  scope: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  suppliers?: { id: string; name: string; code: string | null; category: string | null } | null;
}

export interface LaboratoryInput {
  project_id: string;
  supplier_id: string;
  accreditation_body?: string;
  accreditation_code?: string;
  scope?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
}

const SELECT = `*, suppliers(id, name, code, category)` as const;

export const laboratoryService = {
  async getByProject(projectId: string): Promise<Laboratory[]> {
    const { data, error } = await (supabase as any)
      .from("laboratories")
      .select(SELECT)
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Laboratory[];
  },

  async getById(id: string): Promise<Laboratory> {
    const { data, error } = await (supabase as any)
      .from("laboratories")
      .select(SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: LaboratoryInput): Promise<Laboratory> {
    const { data, error } = await (supabase as any)
      .from("laboratories")
      .insert(input)
      .select(SELECT)
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "laboratories", entityId: data.id,
      action: "INSERT", module: "tests",
      diff: { supplier_id: input.supplier_id, accreditation_code: input.accreditation_code },
    });
    return data;
  },

  async update(id: string, projectId: string, updates: Partial<LaboratoryInput>): Promise<Laboratory> {
    const { data, error } = await (supabase as any)
      .from("laboratories")
      .update(updates)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    await auditService.log({
      projectId, entity: "laboratories", entityId: id,
      action: "UPDATE", module: "tests",
      diff: updates as Record<string, unknown>,
    });
    return data;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("laboratories")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "laboratories", entityId: id,
      action: "DELETE", module: "tests",
    });
  },

  /** Get test results linked to a lab supplier */
  async getLabStats(projectId: string, supplierId: string): Promise<{
    total: number; pass: number; fail: number; pending: number;
  }> {
    const { data, error } = await supabase
      .from("test_results")
      .select("status_workflow, result_status")
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId)
      .eq("is_deleted", false);
    if (error) throw error;
    const rows = data ?? [];
    return {
      total: rows.length,
      pass: rows.filter(r => r.result_status === "pass").length,
      fail: rows.filter(r => r.result_status === "fail").length,
      pending: rows.filter(r => ["draft","in_progress","submitted"].includes(r.status_workflow)).length,
    };
  },
};
