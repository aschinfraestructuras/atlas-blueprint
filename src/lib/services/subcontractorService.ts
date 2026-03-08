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
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  supplier_id: string | null;
  contract: string | null;
  documentation_status: string; // pending | valid | expired
  performance_score: number | null;
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
  contact_name?: string;
  contact_phone?: string;
  notes?: string;
  supplier_id?: string;
  contract?: string;
  documentation_status?: string;
  performance_score?: number;
}

export const subcontractorService = {
  async getByProject(projectId: string, includeDeleted = false): Promise<Subcontractor[]> {
    let q = supabase
      .from("subcontractors")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (!includeDeleted) q = q.eq("is_deleted", false);
    const { data, error } = await q;
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
        contact_name: input.contact_name ?? null,
        contact_phone: input.contact_phone ?? null,
        notes: input.notes ?? null,
        supplier_id: input.supplier_id ?? null,
        contract: input.contract ?? null,
        documentation_status: input.documentation_status ?? "pending",
        performance_score: input.performance_score ?? null,
      } as any)
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
      .update(updates as any)
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
      diff: updates,
    });
    return data as Subcontractor;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("subcontractors")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "subcontractors",
      entityId: id,
      action: "SOFT_DELETE",
      module: "subcontractors",
    });
  },

  async restore(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("subcontractors")
      .update({ is_deleted: false, deleted_at: null, deleted_by: null } as any)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "subcontractors",
      entityId: id,
      action: "RESTORE",
      module: "subcontractors",
    });
  },
};
