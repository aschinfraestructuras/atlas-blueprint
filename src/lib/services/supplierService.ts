import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface Supplier {
  id: string;
  project_id: string;
  name: string;
  category: string | null;
  status: string;
  approval_status: string;
  nif_cif: string | null;
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
  approval_status?: string;
  created_by: string;
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

  async create(input: SupplierInput): Promise<Supplier> {
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        project_id: input.project_id,
        name: input.name,
        category: input.category ?? null,
        nif_cif: input.nif_cif ?? null,
        approval_status: input.approval_status ?? "pending",
        created_by: input.created_by,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "suppliers",
      entityId: (data as Supplier).id,
      action: "INSERT",
      module: "suppliers",
      diff: { name: input.name, category: input.category, approval_status: input.approval_status ?? "pending" },
    });
    return data as Supplier;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<SupplierInput, "project_id" | "created_by">>): Promise<Supplier> {
    const { data, error } = await supabase
      .from("suppliers")
      .update(updates)
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
};
