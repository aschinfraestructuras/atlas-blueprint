import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface Subcontractor {
  id: string;
  project_id: string;
  created_by: string;
  name: string;
  trade: string | null;
  status: string;          // active | suspended | concluded
  contact_email: string | null;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorInput {
  project_id: string;
  created_by: string;
  name: string;
  trade?: string;
  status?: string;
  contact_email?: string;
  supplier_id?: string;
}

export const subcontractorService = {
  async getByProject(projectId: string): Promise<Subcontractor[]> {
    const { data, error } = await supabase
      .from("subcontractors")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Subcontractor[];
  },

  async create(input: SubcontractorInput): Promise<Subcontractor> {
    const { data, error } = await supabase
      .from("subcontractors")
      .insert({
        project_id: input.project_id,
        created_by: input.created_by,
        name: input.name,
        trade: input.trade ?? null,
        status: input.status ?? "active",
        contact_email: input.contact_email ?? null,
        supplier_id: input.supplier_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "subcontractors",
      entityId: (data as Subcontractor).id,
      action: "INSERT",
      module: "subcontractors",
      diff: { name: input.name, trade: input.trade, status: input.status ?? "active" },
    });
    return data as Subcontractor;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<SubcontractorInput, "project_id" | "created_by">>
  ): Promise<Subcontractor> {
    const { data, error } = await supabase
      .from("subcontractors")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "subcontractors",
      entityId: id,
      action: "UPDATE",
      module: "subcontractors",
      diff: updates as Record<string, unknown>,
    });
    return data as Subcontractor;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("subcontractors")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "subcontractors",
      entityId: id,
      action: "DELETE",
      module: "subcontractors",
    });
  },
};
