import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestPlan {
  id: string;
  project_id: string;
  code: string;
  title: string;
  status: string;
  scope_disciplina: string | null;
  scope_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  rules_count?: number;
}

export interface TestPlanRule {
  id: string;
  plan_id: string;
  test_id: string;
  applies_to: string;
  disciplina: string | null;
  work_item_filter: Record<string, unknown>;
  activity_filter: Record<string, unknown>;
  frequency_type: string;
  frequency_value: number | null;
  frequency_unit: string | null;
  event_triggers: string[];
  default_lab_supplier_id: string | null;
  requires_report: boolean;
  requires_photos: boolean;
  requires_witness: boolean;
  acceptance_criteria_override: string | null;
  standards_override: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tests_catalog?: { id: string; name: string; code: string; disciplina: string } | null;
  suppliers?: { id: string; name: string } | null;
}

export interface TestPlanInput {
  project_id: string;
  code: string;
  title: string;
  status?: string;
  scope_disciplina?: string;
  scope_notes?: string;
}

export interface TestPlanRuleInput {
  plan_id: string;
  test_id: string;
  applies_to?: string;
  disciplina?: string;
  work_item_filter?: Record<string, unknown>;
  activity_filter?: Record<string, unknown>;
  frequency_type?: string;
  frequency_value?: number;
  frequency_unit?: string;
  event_triggers?: string[];
  default_lab_supplier_id?: string;
  requires_report?: boolean;
  requires_photos?: boolean;
  requires_witness?: boolean;
  acceptance_criteria_override?: string;
  standards_override?: string[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const testPlanService = {
  async getByProject(projectId: string): Promise<TestPlan[]> {
    const { data, error } = await (supabase as any)
      .from("test_plans")
      .select("*, test_plan_rules(id)")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
      ...p,
      rules_count: p.test_plan_rules?.length ?? 0,
      test_plan_rules: undefined,
    }));
  },

  async getById(id: string): Promise<TestPlan> {
    const { data, error } = await (supabase as any)
      .from("test_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: TestPlanInput): Promise<TestPlan> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("test_plans")
      .insert({ ...input, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "test_plans", entityId: data.id,
      action: "INSERT", module: "tests",
      diff: { code: input.code, title: input.title },
    });
    return data;
  },

  async update(id: string, projectId: string, updates: Partial<TestPlanInput>): Promise<TestPlan> {
    const { data, error } = await (supabase as any)
      .from("test_plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId, entity: "test_plans", entityId: id,
      action: "UPDATE", module: "tests",
      diff: updates as Record<string, unknown>,
    });
    return data;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("test_plans")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "test_plans", entityId: id,
      action: "DELETE", module: "tests",
    });
  },

  // ── Rules ──────────────────────────────────────────────────────────────────

  async getRules(planId: string): Promise<TestPlanRule[]> {
    const { data, error } = await (supabase as any)
      .from("test_plan_rules")
      .select("*, tests_catalog(id, name, code, disciplina), suppliers(id, name)")
      .eq("plan_id", planId)
      .order("created_at");
    if (error) throw error;
    return data ?? [];
  },

  async createRule(input: TestPlanRuleInput): Promise<TestPlanRule> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("test_plan_rules")
      .insert({ ...input, created_by: user?.id })
      .select("*, tests_catalog(id, name, code, disciplina), suppliers(id, name)")
      .single();
    if (error) throw error;
    return data;
  },

  async updateRule(id: string, updates: Partial<TestPlanRuleInput>): Promise<TestPlanRule> {
    const { data, error } = await (supabase as any)
      .from("test_plan_rules")
      .update(updates)
      .eq("id", id)
      .select("*, tests_catalog(id, name, code, disciplina), suppliers(id, name)")
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRule(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("test_plan_rules")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
