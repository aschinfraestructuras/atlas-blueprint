import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface TestDueItem {
  id: string;
  project_id: string;
  plan_rule_id: string;
  work_item_id: string | null;
  activity_id: string | null;
  due_reason: string;
  due_at_date: string | null;
  due_at_quantity: number | null;
  status: string;
  scheduled_for: string | null;
  assigned_lab_supplier_id: string | null;
  related_test_result_id: string | null;
  waived_reason: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Joins
  test_plan_rules?: {
    id: string;
    test_id: string;
    frequency_type: string;
    tests_catalog?: { id: string; name: string; code: string } | null;
  } | null;
  work_items?: { id: string; sector: string; disciplina: string } | null;
  planning_activities?: { id: string; description: string; zone: string | null } | null;
  suppliers?: { id: string; name: string } | null;
}

const DUE_SELECT = `
  *,
  test_plan_rules(id, test_id, frequency_type, tests_catalog(id, name, code)),
  work_items(id, sector, disciplina),
  planning_activities(id, description, zone),
  suppliers(id, name)
` as const;

export const testDueService = {
  async getByProject(projectId: string, filters?: {
    status?: string;
    work_item_id?: string;
    activity_id?: string;
    disciplina?: string;
  }): Promise<TestDueItem[]> {
    let q = (supabase as any)
      .from("test_due_items")
      .select(DUE_SELECT)
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (filters?.status) q = q.eq("status", filters.status);
    if (filters?.work_item_id) q = q.eq("work_item_id", filters.work_item_id);
    if (filters?.activity_id) q = q.eq("activity_id", filters.activity_id);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as TestDueItem[];
  },

  async generateDueTests(projectId: string): Promise<number> {
    const { data, error } = await supabase.rpc("fn_generate_due_tests", {
      p_project_id: projectId,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async schedule(id: string, projectId: string, date: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("test_due_items")
      .update({ status: "scheduled", scheduled_for: date })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "test_due_items", entityId: id,
      action: "STATUS_CHANGE", module: "tests",
      diff: { to: "scheduled", scheduled_for: date },
    });
  },

  async startTest(id: string, projectId: string): Promise<string> {
    // Get the due item to pre-fill the test result
    const { data: due, error: de } = await (supabase as any)
      .from("test_due_items")
      .select("*, test_plan_rules(test_id, default_lab_supplier_id)")
      .eq("id", id)
      .single();
    if (de) throw de;

    const rule = due.test_plan_rules;

    // Create draft test_result
    const { data: tr, error: te } = await supabase
      .from("test_results")
      .insert({
        project_id: projectId,
        test_id: rule.test_id,
        date: new Date().toISOString().split("T")[0],
        status: "draft",
        status_workflow: "draft",
        work_item_id: due.work_item_id ?? null,
        supplier_id: rule.default_lab_supplier_id ?? null,
        result_payload: {},
      } as any)
      .select("id")
      .single();
    if (te) throw te;

    // Link due → result
    await supabase.rpc("fn_link_due_to_result" as any, {
      p_due_id: id,
      p_test_result_id: tr!.id,
    });

    // Update status to in_progress
    await (supabase as any)
      .from("test_due_items")
      .update({ status: "in_progress" })
      .eq("id", id);

    return tr!.id;
  },

  async waive(id: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc("fn_waive_due_test" as any, {
      p_due_id: id,
      p_reason: reason,
    });
    if (error) throw error;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("test_due_items")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "test_due_items", entityId: id,
      action: "DELETE", module: "tests",
    });
  },
};
