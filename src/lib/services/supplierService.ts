import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

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
}

export const supplierService = {
  async getByProject(projectId: string): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Supplier[];
  },

  async getById(id: string): Promise<Supplier> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Supplier;
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
    return data as Supplier;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<SupplierInput, "project_id" | "created_by">>): Promise<Supplier> {
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        ...updates,
        nif_cif: updates.nif_cif,
        qualification_status: updates.qualification_status ?? updates.approval_status,
        approval_status: updates.approval_status,
      })
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
    return data as Supplier;
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

  // ── Supplier Documents ──────────────────────────────────────────
  async getDocuments(supplierId: string): Promise<SupplierDocument[]> {
    const { data, error } = await supabase
      .from("supplier_documents" as any)
      .select("*")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SupplierDocument[];
  },

  async addDocument(input: { project_id: string; supplier_id: string; document_id: string; doc_type: string; valid_from?: string; valid_to?: string }): Promise<SupplierDocument> {
    const { data, error } = await supabase
      .from("supplier_documents" as any)
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as SupplierDocument;
  },

  async removeDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from("supplier_documents" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // ── Supplier Materials ──────────────────────────────────────────
  async getMaterials(supplierId: string): Promise<SupplierMaterial[]> {
    const { data, error } = await supabase
      .from("supplier_materials" as any)
      .select("*")
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SupplierMaterial[];
  },

  async addMaterial(input: { project_id: string; supplier_id: string; material_name: string; is_primary?: boolean; lead_time_days?: number; unit_price?: number; currency?: string }): Promise<SupplierMaterial> {
    const { data, error } = await supabase
      .from("supplier_materials" as any)
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as SupplierMaterial;
  },

  async removeMaterial(id: string): Promise<void> {
    const { error } = await supabase
      .from("supplier_materials" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // ── KPIs ────────────────────────────────────────────────────────
  async getKPIs(projectId: string): Promise<SupplierKPI | null> {
    const { data, error } = await supabase
      .from("view_suppliers_kpi" as any)
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as any;
    return {
      project_id: d.project_id,
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
      .from("view_supplier_detail_metrics" as any)
      .select("*")
      .eq("supplier_id", supplierId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as any;
    return {
      supplier_id: d.supplier_id,
      project_id: d.project_id,
      open_nc_count: Number(d.open_nc_count) || 0,
      tests_total: Number(d.tests_total) || 0,
      tests_nonconform: Number(d.tests_nonconform) || 0,
      docs_expiring_30d: Number(d.docs_expiring_30d) || 0,
      docs_expired: Number(d.docs_expired) || 0,
    };
  },
};
