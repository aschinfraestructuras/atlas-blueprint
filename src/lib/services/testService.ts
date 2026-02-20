import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Workflow statuses ─────────────────────────────────────────────────────────
export const TEST_RESULT_STATUSES = [
  "draft", "in_progress", "completed", "approved", "archived",
  "pending", "pass", "fail", "inconclusive",
] as const;
export type TestResultStatus = typeof TEST_RESULT_STATUSES[number];

export const TEST_RESULT_STATUS_WORKFLOW = ["draft", "in_progress", "completed", "approved", "archived"] as const;
export type TestResultWorkflowStatus = typeof TEST_RESULT_STATUS_WORKFLOW[number];

export const TEST_RESULT_STATUS_LABELS: Record<string, string> = {
  draft:        "tests.status.draft",
  in_progress:  "tests.status.in_progress",
  completed:    "tests.status.completed",
  approved:     "tests.status.approved",
  archived:     "tests.status.archived",
  pending:      "tests.status.pending",
  pass:         "tests.status.pass",
  fail:         "tests.status.fail",
  inconclusive: "tests.status.inconclusive",
};

export const TEST_DISCIPLINES = [
  "geral", "terras", "firmes", "betao", "estruturas", "drenagem",
  "ferrovia", "instalacoes", "outros",
] as const;
export type TestDiscipline = typeof TEST_DISCIPLINES[number];

export const PASS_FAIL_VALUES = ["pass", "fail", "inconclusive", "na"] as const;
export type PassFail = typeof PASS_FAIL_VALUES[number];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TestCatalogEntry {
  id: string;
  project_id: string;
  code: string;
  name: string;
  disciplina: string;
  disciplina_outro: string | null;
  material: string | null;
  material_outro: string | null;
  laboratorio: string | null;
  laboratorio_outro: string | null;
  standards: string[];
  standard: string | null; // legacy compat
  frequency: string | null;
  acceptance_criteria: string | null;
  description: string | null;
  unit: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestResult {
  id: string;
  project_id: string;
  test_id: string;
  code: string | null;
  status: string;
  pass_fail: string | null;
  sample_ref: string | null;
  location: string | null;
  pk_inicio: number | null;
  pk_fim: number | null;
  material: string | null;
  material_outro: string | null;
  report_number: string | null;
  notes: string | null;
  date: string;
  result: Record<string, unknown> | null;
  result_payload: Record<string, unknown> | null;
  supplier_id: string | null;
  subcontractor_id: string | null;
  work_item_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  tests_catalog?: Pick<TestCatalogEntry, "id" | "name" | "code" | "standard" | "disciplina" | "unit" | "acceptance_criteria"> | null;
  work_items?: { id: string; sector: string; disciplina: string } | null;
  suppliers?: { id: string; name: string } | null;
}

export interface TestResultInput {
  project_id: string;
  test_id: string;
  date: string;
  status?: string;
  sample_ref?: string;
  location?: string;
  pk_inicio?: number;
  pk_fim?: number;
  material?: string;
  material_outro?: string;
  report_number?: string;
  notes?: string;
  result_payload?: Record<string, unknown>;
  supplier_id?: string;
  subcontractor_id?: string;
  work_item_id?: string;
}

export interface TestCatalogInput {
  project_id: string;
  code: string;
  name: string;
  disciplina?: string;
  disciplina_outro?: string;
  material?: string;
  material_outro?: string;
  laboratorio?: string;
  laboratorio_outro?: string;
  standards?: string[];
  standard?: string;
  frequency?: string;
  acceptance_criteria?: string;
  description?: string;
  unit?: string;
}

const RESULT_SELECT = `
  *,
  tests_catalog(id, name, code, standard, disciplina, unit, acceptance_criteria),
  work_items(id, sector, disciplina),
  suppliers(id, name)
` as const;

// ─── Service ──────────────────────────────────────────────────────────────────

export const testService = {
  // ── Catalog ────────────────────────────────────────────────────────────────

  async getCatalogByProject(projectId: string, includeInactive = false): Promise<TestCatalogEntry[]> {
    let q = supabase
      .from("tests_catalog")
      .select("*")
      .eq("project_id", projectId)
      .order("disciplina")
      .order("name");
    if (!includeInactive) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, standards: r.standards ?? [] })) as TestCatalogEntry[];
  },

  async createCatalogEntry(entry: TestCatalogInput): Promise<TestCatalogEntry> {
    const { data, error } = await supabase
      .from("tests_catalog")
      .insert({ ...entry, standards: entry.standards ?? [] })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: entry.project_id,
      entity: "tests_catalog",
      entityId: (data as TestCatalogEntry).id,
      action: "INSERT",
      module: "tests",
      diff: { code: entry.code, name: entry.name },
    });
    return { ...data, standards: data.standards ?? [] } as TestCatalogEntry;
  },

  async updateCatalogEntry(id: string, projectId: string, updates: Partial<TestCatalogInput>): Promise<TestCatalogEntry> {
    const { data, error } = await supabase
      .from("tests_catalog")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "tests_catalog",
      entityId: id,
      action: "UPDATE",
      module: "tests",
      diff: updates as Record<string, unknown>,
    });
    return { ...data, standards: data.standards ?? [] } as TestCatalogEntry;
  },

  async archiveCatalogEntry(id: string, projectId: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from("tests_catalog")
      .update({ active })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "tests_catalog",
      entityId: id,
      action: "UPDATE",
      module: "tests",
      diff: { active },
    });
  },

  async cloneCatalogEntry(id: string, projectId: string): Promise<TestCatalogEntry> {
    const { data: src, error: se } = await supabase
      .from("tests_catalog")
      .select("*")
      .eq("id", id)
      .single();
    if (se) throw se;
    const clone: TestCatalogInput = {
      ...src,
      code: src.code + "-COPY",
      name: src.name + " (cópia)",
      project_id: projectId,
      standards: src.standards ?? [],
    };
    return testService.createCatalogEntry(clone);
  },

  // ── Results ────────────────────────────────────────────────────────────────

  async getByProject(projectId: string, filters?: {
    status?: string;
    disciplina?: string;
    work_item_id?: string;
    supplier_id?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<TestResult[]> {
    let q = supabase
      .from("test_results")
      .select(RESULT_SELECT)
      .eq("project_id", projectId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters?.status)       q = q.eq("status", filters.status);
    if (filters?.work_item_id) q = q.eq("work_item_id", filters.work_item_id);
    if (filters?.supplier_id)  q = q.eq("supplier_id", filters.supplier_id);
    if (filters?.dateFrom)     q = q.gte("date", filters.dateFrom);
    if (filters?.dateTo)       q = q.lte("date", filters.dateTo);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as TestResult[];
  },

  async getByWorkItem(workItemId: string): Promise<TestResult[]> {
    const { data, error } = await supabase
      .from("test_results")
      .select(RESULT_SELECT)
      .eq("work_item_id", workItemId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as TestResult[];
  },

  async getById(id: string): Promise<TestResult> {
    const { data, error } = await supabase
      .from("test_results")
      .select(RESULT_SELECT)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as TestResult;
  },

  async create(input: TestResultInput): Promise<TestResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {
      project_id:      input.project_id,
      test_id:         input.test_id,
      date:            input.date,
      status:          input.status ?? "draft",
      sample_ref:      input.sample_ref ?? null,
      location:        input.location ?? null,
      pk_inicio:       input.pk_inicio ?? null,
      pk_fim:          input.pk_fim ?? null,
      material:        input.material ?? null,
      material_outro:  input.material_outro ?? null,
      report_number:   input.report_number ?? null,
      notes:           input.notes ?? null,
      result_payload:  input.result_payload ?? {},
      supplier_id:     input.supplier_id ?? null,
      subcontractor_id:input.subcontractor_id ?? null,
      work_item_id:    input.work_item_id ?? null,
    };

    const { data, error } = await supabase
      .from("test_results")
      .insert(payload)
      .select(RESULT_SELECT)
      .single();
    if (error) throw error;

    await auditService.log({
      projectId: input.project_id,
      entity: "test_results",
      entityId: (data as unknown as TestResult).id,
      action: "INSERT",
      module: "tests",
      diff: { test_id: input.test_id, date: input.date, status: input.status ?? "draft" },
    });
    return data as unknown as TestResult;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<TestResultInput, "project_id">>): Promise<TestResult> {
    const { data, error } = await supabase
      .from("test_results")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updates as any)
      .eq("id", id)
      .select(RESULT_SELECT)
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
    return data as unknown as TestResult;
  },

  async updateStatus(id: string, toStatus: string): Promise<TestResult> {
    const { data, error } = await supabase.rpc("fn_update_test_status", {
      p_result_id: id,
      p_to_status: toStatus,
    });
    if (error) throw error;
    // Re-fetch with joins
    return testService.getById(id);
  },

  async getPendingCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("test_results")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["pending", "draft", "in_progress"]);
    if (error) throw error;
    return count ?? 0;
  },

  async getStatsForWorkItem(workItemId: string): Promise<{
    total: number; approved: number; failed: number; pending: number;
  }> {
    const { data, error } = await supabase
      .from("test_results")
      .select("status, pass_fail")
      .eq("work_item_id", workItemId);
    if (error) throw error;
    const rows = data ?? [];
    return {
      total:    rows.length,
      approved: rows.filter((r) => r.status === "approved" || r.pass_fail === "pass").length,
      failed:   rows.filter((r) => r.pass_fail === "fail").length,
      pending:  rows.filter((r) => ["draft", "in_progress", "pending"].includes(r.status)).length,
    };
  },
};
