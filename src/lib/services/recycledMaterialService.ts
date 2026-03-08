import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types
const db = supabase as any;

export interface RecycledMaterial {
  id: string;
  project_id: string;
  reference_number: string;
  reference_type: "FAM" | "PAP" | "BAM" | "OUTRO";
  material_name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  composition: string | null;
  recycled_content_pct: number | null;
  serial_number: string | null;
  quantity_planned: number | null;
  quantity_used: number | null;
  unit: string | null;
  application_location: string | null;
  application_date: string | null;
  certificate_number: string | null;
  document_ref: string | null;
  status: "pending" | "submitted" | "approved" | "rejected";
  observations: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecycledMaterialInput {
  project_id: string;
  reference_number: string;
  reference_type: string;
  material_name: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  composition?: string | null;
  recycled_content_pct?: number | null;
  serial_number?: string | null;
  quantity_planned?: number | null;
  quantity_used?: number | null;
  unit?: string | null;
  application_location?: string | null;
  application_date?: string | null;
  certificate_number?: string | null;
  document_ref?: string | null;
  status?: string;
  observations?: string | null;
}

export interface RecycledMaterialDocument {
  id: string;
  recycled_material_id: string;
  document_type: string;
  document_name: string;
  document_url: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
}

export const recycledMaterialService = {
  async getByProject(projectId: string): Promise<RecycledMaterial[]> {
    const { data, error } = await db.from("recycled_materials")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RecycledMaterial[];
  },

  async getById(id: string): Promise<RecycledMaterial> {
    const { data, error } = await db.from("recycled_materials")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as RecycledMaterial;
  },

  async create(input: RecycledMaterialInput, userId: string): Promise<RecycledMaterial> {
    const { data, error } = await db.from("recycled_materials")
      .insert({ ...input, created_by: userId })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as RecycledMaterial;
  },

  async update(id: string, input: Partial<RecycledMaterialInput>): Promise<RecycledMaterial> {
    const { data, error } = await db.from("recycled_materials")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as RecycledMaterial;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await db.from("recycled_materials")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async getDocuments(recycledMaterialId: string): Promise<RecycledMaterialDocument[]> {
    const { data, error } = await db.from("recycled_material_documents")
      .select("*")
      .eq("recycled_material_id", recycledMaterialId)
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RecycledMaterialDocument[];
  },

  async nextReference(projectId: string, type: string): Promise<string> {
    const { data } = await db.from("recycled_materials")
      .select("reference_number")
      .eq("project_id", projectId)
      .like("reference_number", `${type}-%`);
    const count = (data as unknown[] | null)?.length ?? 0;
    return `${type}-${String(count + 1).padStart(3, "0")}`;
  },

  async getProjectStats(projectId: string): Promise<{ total: number; approved: number; pending: number; avgPct: number }> {
    const { data } = await untypedFrom("recycled_materials")
      .select("status, recycled_content_pct")
      .eq("project_id", projectId)
      .eq("is_deleted", false);
    const items = (data ?? []) as Array<{ status: string; recycled_content_pct: number | null }>;
    const approved = items.filter(i => i.status === "approved").length;
    const pending = items.filter(i => i.status === "pending").length;
    const pcts = items.filter(i => i.recycled_content_pct != null).map(i => Number(i.recycled_content_pct));
    const avgPct = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    return { total: items.length, approved, pending, avgPct: Math.round(avgPct * 10) / 10 };
  },
};
