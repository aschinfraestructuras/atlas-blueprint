import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";
import type { Database } from "@/integrations/supabase/types";

// ── Supabase row types ───────────────────────────────────────────
type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
type SupplierUpdate = Database["public"]["Tables"]["suppliers"]["Update"];

// Helper to access tables not in generated types
const untypedFrom = (table: string) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

export interface Supplier {
  id: string;
  project_id: string;
  code: string | null;
  name: string;
  category: string | null;
  status: string;
  approval_status: string;
  qualification_status: string | null;
  qualification_score: number | null;
  nif_cif: string | null;
  country: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  contacts: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierInput {
  project_id: string;
  name: string;
  category?: string;
  category_outro?: string;
  nif_cif?: string;
  country?: string;
  address?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  approval_status?: string;
  qualification_status?: string;
  qualification_score?: number;
  created_by: string;
}

export interface SupplierDocument {
  id: string;
  project_id: string;
  supplier_id: string;
  document_id: string;
  doc_type: string;
  valid_from: string | null;
  valid_to: string | null;
  status: string;
  created_at: string;
}

export interface SupplierMaterial {
  id: string;
  project_id: string;
  supplier_id: string;
  material_name: string;
  is_primary: boolean;
  lead_time_days: number | null;
  unit_price: number | null;
  currency: string;
  created_at: string;
}

export interface SupplierKPI {
  project_id: string;
  suppliers_total: number;
  suppliers_active: number;
  suppliers_pending_qualification: number;
  suppliers_blocked: number;
  supplier_docs_expiring_30d: number;
  supplier_docs_expired: number;
  suppliers_with_open_nc: number;
  suppliers_with_nonconform_tests_30d: number;
}

export interface SupplierDetailMetrics {
  supplier_id: string;
  project_id: string;
  open_nc_count: number;
  tests_total: number;
  tests_nonconform: number;
  docs_expiring_30d: number;
  docs_expired: number;
  evals_total: number;
  latest_score: number | null;
  latest_eval_result: string | null;
}

export interface SupplierEvaluation {
  id: string;
  project_id: string;
  supplier_id: string;
  eval_date: string;
  criteria: Record<string, unknown>;
  score: number | null;
  result: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SupplierEvaluationInput {
  project_id: string;
  supplier_id: string;
  eval_date?: string;
  criteria?: Record<string, unknown>;
  score?: number;
  result?: string;
  notes?: string;
}

export const supplierService = {
  async getByProject(projectId: string, includeDeleted = false): Promise<Supplier[]> {
    let q = supabase
      .from("suppliers")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (!includeDeleted) q = q.eq("is_deleted", false);
    const { data, error } = await q;
    if (error) throw error;
    return data as unknown as Supplier[];
  },

  /** Server-side paginated query */
  async getByProjectPaginated(
    projectId: string,
    options: {
      from: number;
      to: number;
      status?: string;
      search?: string;
    },
  ): Promise<{ data: Supplier[]; count: number }> {
    let q = supabase
      .from("suppliers")
      .select("*", { count: "exact" })
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(options.from, options.to);

    if (options.status && options.status !== "all") q = q.eq("status", options.status);
    if (options.search) q = q.or(`name.ilike.%${options.search}%,code.ilike.%${options.search}%,contact_name.ilike.%${options.search}%`);

    const { data, error, count } = await q;
    if (error) throw error;
    return { data: (data ?? []) as unknown as Supplier[], count: count ?? 0 };
  },

  async getById(id: string): Promise<Supplier> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as Supplier;
  },

  async create(input: SupplierInput): Promise<Supplier> {
    const { data, error } = await supabase.rpc("fn_create_supplier", {
      p_project_id: input.project_id,
      p_name: input.name,
      p_tax_id: input.nif_cif ?? null,
      p_category: input.category ?? null,
      p_country: input.country ?? null,
      p_address: input.address ?? null,
      p_contact_name: input.contact_name ?? null,
      p_contact_email: input.contact_email ?? null,
      p_contact_phone: input.contact_phone ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;
    return data as unknown as Supplier;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<SupplierInput, "project_id" | "created_by">>): Promise<Supplier> {
    const payload: SupplierUpdate = {
      ...updates,
      nif_cif: updates.nif_cif,
      qualification_status: updates.qualification_status ?? updates.approval_status,
      approval_status: updates.approval_status,
    };
    const { data, error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "suppliers",
      entityId: id,
      action: "UPDATE",
      module: "suppliers",
      diff: updates as Record<string, unknown>,
    });
    return data as unknown as Supplier;
  },

  async archive(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("suppliers")
      .update({ status: "archived" })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "suppliers", entityId: id,
      action: "STATUS_CHANGE", module: "suppliers",
      diff: { to: "archived" },
    });
  },

  async activate(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("suppliers")
      .update({ status: "active" })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "suppliers", entityId: id,
      action: "STATUS_CHANGE", module: "suppliers",
      diff: { to: "active" },
    });
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const payload: SupplierUpdate = { is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null };
    const { error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "suppliers", entityId: id,
      action: "DELETE", module: "suppliers",
      description: "Fornecedor eliminado (soft)",
    });
  },

  async restore(id: string, projectId: string): Promise<void> {
    const payload: SupplierUpdate = { is_deleted: false, deleted_at: null, deleted_by: null };
    const { error } = await supabase
      .from("suppliers")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "suppliers", entityId: id,
      action: "UPDATE", module: "suppliers",
      description: "Fornecedor restaurado",
    });
  },

  // ── Supplier Documents ──────────────────────────────────────────
  async getDocuments(supplierId: string): Promise<SupplierDocument[]> {
    const { data, error } = await untypedFrom("supplier_documents")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SupplierDocument[];
  },

  async addDocument(input: { project_id: string; supplier_id: string; document_id: string; doc_type: string; valid_from?: string; valid_to?: string }): Promise<SupplierDocument> {
    const { data, error } = await untypedFrom("supplier_documents")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as SupplierDocument;
  },

  async removeDocument(id: string): Promise<void> {
    const { error } = await untypedFrom("supplier_documents")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // ── Supplier Materials ──────────────────────────────────────────
  async getMaterials(supplierId: string): Promise<SupplierMaterial[]> {
    const { data, error } = await untypedFrom("supplier_materials")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SupplierMaterial[];
  },

  async addMaterial(input: { project_id: string; supplier_id: string; material_name: string; is_primary?: boolean; lead_time_days?: number; unit_price?: number; currency?: string }): Promise<SupplierMaterial> {
    const { data, error } = await untypedFrom("supplier_materials")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as SupplierMaterial;
  },

  async removeMaterial(id: string): Promise<void> {
    const { error } = await untypedFrom("supplier_materials")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // ── KPIs ────────────────────────────────────────────────────────
  async getKPIs(projectId: string): Promise<SupplierKPI | null> {
    const { data, error } = await untypedFrom("view_suppliers_kpi")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as Record<string, unknown>;
    return {
      project_id: d.project_id as string,
      suppliers_total: Number(d.suppliers_total) || 0,
      suppliers_active: Number(d.suppliers_active) || 0,
      suppliers_pending_qualification: Number(d.suppliers_pending_qualification) || 0,
      suppliers_blocked: Number(d.suppliers_blocked) || 0,
      supplier_docs_expiring_30d: Number(d.supplier_docs_expiring_30d) || 0,
      supplier_docs_expired: Number(d.supplier_docs_expired) || 0,
      suppliers_with_open_nc: Number(d.suppliers_with_open_nc) || 0,
      suppliers_with_nonconform_tests_30d: Number(d.suppliers_with_nonconform_tests_30d) || 0,
    };
  },

  async getDetailMetrics(supplierId: string): Promise<SupplierDetailMetrics | null> {
    const { data, error } = await supabase
      .from("view_supplier_detail_metrics")
      .select("*")
      .eq("supplier_id", supplierId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as Record<string, unknown>;
    return {
      supplier_id: d.supplier_id as string,
      project_id: d.project_id as string,
      open_nc_count: Number(d.nc_open_count) || 0,
      tests_total: Number(d.tests_total) || 0,
      tests_nonconform: Number(d.tests_nonconform) || 0,
      docs_expiring_30d: Number(d.docs_expiring_30d) || 0,
      docs_expired: Number(d.docs_expired) || 0,
      evals_total: Number(d.evals_total) || 0,
      latest_score: d.latest_score != null ? Number(d.latest_score) : null,
      latest_eval_result: (d.latest_eval_result as string) ?? null,
    };
  },

  // ── Evaluations ─────────────────────────────────────────────────
  async getEvaluations(supplierId: string): Promise<SupplierEvaluation[]> {
    const { data, error } = await untypedFrom("supplier_evaluations")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("eval_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SupplierEvaluation[];
  },

  async createEvaluation(input: SupplierEvaluationInput): Promise<SupplierEvaluation> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await untypedFrom("supplier_evaluations")
      .insert({ ...input, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    const result = data as unknown as SupplierEvaluation;
    await auditService.log({
      projectId: input.project_id, entity: "supplier_evaluations", entityId: result.id,
      action: "INSERT", module: "suppliers",
      diff: { score: input.score, result: input.result } as Record<string, unknown>,
    });
    return result;
  },
};
