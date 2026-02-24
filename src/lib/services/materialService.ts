import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ── Types ─────────────────────────────────────────────────────────
export interface Material {
  id: string;
  project_id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string | null;
  specification: string | null;
  unit: string | null;
  normative_refs: string | null;
  acceptance_criteria: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialInput {
  project_id: string;
  name: string;
  category: string;
  subcategory?: string;
  specification?: string;
  unit?: string;
  normative_refs?: string;
  acceptance_criteria?: string;
}

export interface MaterialDocument {
  id: string;
  project_id: string;
  material_id: string;
  document_id: string;
  doc_type: string;
  valid_to: string | null;
  created_at: string;
}

export interface MaterialKPI {
  project_id: string;
  materials_total: number;
  materials_active: number;
  materials_discontinued: number;
  materials_with_expired_docs: number;
  materials_with_open_nc: number;
  materials_with_nonconform_tests_30d: number;
}

export interface MaterialDetailMetrics {
  material_id: string;
  project_id: string;
  suppliers_count: number;
  docs_expired: number;
  docs_expiring_30d: number;
  tests_total: number;
  tests_nonconform: number;
  nc_open_count: number;
  work_items_count: number;
}

export interface WorkItemMaterial {
  id: string;
  project_id: string;
  work_item_id: string;
  material_id: string;
  supplier_id: string | null;
  lot_ref: string | null;
  quantity: number | null;
  unit: string | null;
  created_at: string;
}

// ── Service ───────────────────────────────────────────────────────
export const materialService = {
  async getByProject(projectId: string): Promise<Material[]> {
    const { data, error } = await supabase
      .from("materials" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Material[];
  },

  async getById(id: string): Promise<Material> {
    const { data, error } = await supabase
      .from("materials" as any)
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as Material;
  },

  async create(input: MaterialInput): Promise<Material> {
    const { data, error } = await supabase.rpc("fn_create_material" as any, {
      p_project_id: input.project_id,
      p_name: input.name,
      p_category: input.category,
      p_subcategory: input.subcategory ?? null,
      p_specification: input.specification ?? null,
      p_unit: input.unit ?? null,
      p_normative_refs: input.normative_refs ?? null,
      p_acceptance_criteria: input.acceptance_criteria ?? null,
    });
    if (error) throw error;
    return data as unknown as Material;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<MaterialInput, "project_id">>): Promise<Material> {
    const { data, error } = await supabase
      .from("materials" as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId, entity: "materials", entityId: id,
      action: "UPDATE", module: "materials",
      diff: updates as Record<string, unknown>,
    });
    return data as unknown as Material;
  },

  async archive(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("materials" as any)
      .update({ status: "archived" })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "materials", entityId: id,
      action: "STATUS_CHANGE", module: "materials",
      diff: { to: "archived" },
    });
  },

  async activate(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("materials" as any)
      .update({ status: "active" })
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "materials", entityId: id,
      action: "STATUS_CHANGE", module: "materials",
      diff: { to: "active" },
    });
  },

  // ── Material Documents ──────────────────────────────────────────
  async getDocuments(materialId: string): Promise<MaterialDocument[]> {
    const { data, error } = await supabase
      .from("material_documents" as any)
      .select("*")
      .eq("material_id", materialId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as MaterialDocument[];
  },

  async addDocument(input: { project_id: string; material_id: string; document_id: string; doc_type: string; valid_to?: string }): Promise<MaterialDocument> {
    const { data, error } = await supabase
      .from("material_documents" as any)
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as MaterialDocument;
  },

  async removeDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from("material_documents" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // ── Supplier-Material links ─────────────────────────────────────
  async getSupplierLinks(materialId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from("supplier_materials" as any)
      .select("*, suppliers:supplier_id(id, name, code, status)")
      .eq("material_id", materialId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as any[];
  },

  // ── Work Item Materials ─────────────────────────────────────────
  async getWorkItemLinks(materialId: string): Promise<WorkItemMaterial[]> {
    const { data, error } = await supabase
      .from("work_item_materials" as any)
      .select("*")
      .eq("material_id", materialId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as WorkItemMaterial[];
  },

  // ── KPIs ────────────────────────────────────────────────────────
  async getKPIs(projectId: string): Promise<MaterialKPI | null> {
    const { data, error } = await supabase
      .from("view_materials_kpi" as any)
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as any;
    return {
      project_id: d.project_id,
      materials_total: Number(d.materials_total) || 0,
      materials_active: Number(d.materials_active) || 0,
      materials_discontinued: Number(d.materials_discontinued) || 0,
      materials_with_expired_docs: Number(d.materials_with_expired_docs) || 0,
      materials_with_open_nc: Number(d.materials_with_open_nc) || 0,
      materials_with_nonconform_tests_30d: Number(d.materials_with_nonconform_tests_30d) || 0,
    };
  },

  async getDetailMetrics(materialId: string): Promise<MaterialDetailMetrics | null> {
    const { data, error } = await supabase
      .from("view_material_detail_metrics" as any)
      .select("*")
      .eq("material_id", materialId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const d = data as any;
    return {
      material_id: d.material_id,
      project_id: d.project_id,
      suppliers_count: Number(d.suppliers_count) || 0,
      docs_expired: Number(d.docs_expired) || 0,
      docs_expiring_30d: Number(d.docs_expiring_30d) || 0,
      tests_total: Number(d.tests_total) || 0,
      tests_nonconform: Number(d.tests_nonconform) || 0,
      nc_open_count: Number(d.nc_open_count) || 0,
      work_items_count: Number(d.work_items_count) || 0,
    };
  },
};
