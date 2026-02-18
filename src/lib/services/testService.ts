import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Status constants (must match DB check constraint) ────────────────────────

/** Values allowed by the `test_results_status_check` constraint */
export const TEST_RESULT_STATUSES = ["pending", "pass", "fail", "inconclusive"] as const;
export type TestResultStatus = typeof TEST_RESULT_STATUSES[number];

/** Human-readable labels for the test result status */
export const TEST_RESULT_STATUS_LABELS: Record<TestResultStatus, string> = {
  pending:     "tests.status.pending",
  pass:        "tests.status.pass",
  fail:        "tests.status.fail",
  inconclusive:"tests.status.inconclusive",
};

export interface TestResult {
  id: string;
  project_id: string;
  test_id: string;
  status: TestResultStatus | string;
  sample_ref: string | null;
  result: Record<string, unknown> | null;
  date: string;
  location: string | null;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
  tests_catalog?: {
    id: string;
    name: string;
    code: string;
    standard: string | null;
  };
}

export interface TestCatalogEntry {
  id: string;
  project_id: string;
  name: string;
  code: string;
  standard: string | null;
  acceptance_criteria: string | null;
  frequency: string | null;
  active: boolean;
}

export interface TestResultInput {
  project_id: string;
  test_id: string;
  date: string;
  status?: TestResultStatus;
  sample_ref?: string;
  location?: string;
  supplier_id?: string;
}

export const testService = {
  async getByProject(projectId: string): Promise<TestResult[]> {
    const { data, error } = await supabase
      .from("test_results")
      .select("*, tests_catalog(id, name, code, standard)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TestResult[];
  },

  async getCatalogByProject(projectId: string): Promise<TestCatalogEntry[]> {
    const { data, error } = await supabase
      .from("tests_catalog")
      .select("*")
      .eq("project_id", projectId)
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return (data ?? []) as TestCatalogEntry[];
  },

  async createCatalogEntry(entry: {
    project_id: string;
    name: string;
    code: string;
    standard?: string;
    acceptance_criteria?: string;
    frequency?: string;
  }): Promise<TestCatalogEntry> {
    const { data, error } = await supabase
      .from("tests_catalog")
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data as TestCatalogEntry;
  },

  async create(input: TestResultInput): Promise<TestResult> {
    const { data, error } = await supabase
      .from("test_results")
      .insert({
        project_id: input.project_id,
        test_id: input.test_id,
        date: input.date,
        status: input.status ?? "pending",
        sample_ref: input.sample_ref ?? null,
        location: input.location ?? null,
        supplier_id: input.supplier_id ?? null,
      })
      .select("*, tests_catalog(id, name, code, standard)")
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "test_results",
      entityId: (data as TestResult).id,
      action: "INSERT",
      module: "tests",
      diff: { test_id: input.test_id, date: input.date, status: input.status ?? "pending" },
    });
    return data as TestResult;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<TestResultInput, "project_id">>): Promise<TestResult> {
    const { data, error } = await supabase
      .from("test_results")
      .update(updates)
      .eq("id", id)
      .select("*, tests_catalog(id, name, code, standard)")
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "test_results",
      entityId: id,
      action: "UPDATE",
      module: "tests",
      diff: updates as Record<string, unknown>,
    });
    return data as TestResult;
  },

  async getPendingCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("test_results")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "pending");
    if (error) throw error;
    return count ?? 0;
  },
};
