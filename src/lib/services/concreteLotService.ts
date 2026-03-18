import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConcreteLot {
  id: string;
  project_id: string;
  lot_code: string;
  element_desc: string;
  concrete_class: string;
  exc_class: string;
  volume_total_m3: number | null;
  date_start: string | null;
  date_end: string | null;
  element_code: string | null;
  fab_ref: string | null;
  work_item_id: string | null;
  ppi_instance_id: string | null;
  notes: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConcreteLotConformity {
  lot_id: string;
  project_id: string;
  lot_code: string;
  element_desc: string;
  concrete_class: string;
  exc_class: string;
  volume_total_m3: number | null;
  date_start: string | null;
  date_end: string | null;
  fck_mpa: number | null;
  freq_m3_per_sample: number;
  n_batches: number;
  n_tested_28d: number;
  mean_fc_28d: number | null;
  min_fc_28d: number | null;
  stddev_fc_28d: number | null;
  n_required_min: number | null;
  criterion_applied: string;
  na_m_result: "pass" | "fail" | "pending";
}

export interface CreateLotInput {
  project_id: string;
  element_desc: string;
  concrete_class?: string;
  exc_class?: string;
  volume_total_m3?: number | null;
  date_start?: string | null;
  date_end?: string | null;
  element_code?: string | null;
  fab_ref?: string | null;
  work_item_id?: string | null;
  ppi_instance_id?: string | null;
  notes?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const concreteLotService = {
  async create(input: CreateLotInput): Promise<ConcreteLot> {
    const { data: code } = await supabase.rpc("fn_next_concrete_lot_code", {
      p_project_id: input.project_id,
    });

    const { data, error } = await supabase
      .from("concrete_lots" as any)
      .insert({
        ...input,
        lot_code: code ?? "LOT-BET-ERR",
        concrete_class: input.concrete_class ?? "C25/30",
        exc_class: input.exc_class ?? "EXC2",
      })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async listConformity(projectId: string): Promise<ConcreteLotConformity[]> {
    const { data, error } = await supabase
      .from("view_concrete_lot_conformity" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("lot_code", { ascending: true });

    if (error) throw error;
    return (data ?? []) as any[];
  },

  async getById(id: string): Promise<ConcreteLot | null> {
    const { data, error } = await supabase
      .from("concrete_lots" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as any;
  },

  async update(id: string, updates: Partial<ConcreteLot>): Promise<void> {
    const { error } = await supabase
      .from("concrete_lots" as any)
      .update(updates as any)
      .eq("id", id);
    if (error) throw error;
  },

  async assignBatchToLot(batchId: string, lotId: string | null): Promise<void> {
    const { error } = await supabase
      .from("concrete_batches" as any)
      .update({ lot_id: lotId } as any)
      .eq("id", batchId);
    if (error) throw error;
  },

  async deleteLot(id: string): Promise<void> {
    // Soft delete
    const { error } = await supabase
      .from("concrete_lots" as any)
      .update({ is_deleted: true } as any)
      .eq("id", id);
    if (error) throw error;
  },

  async getUnassignedBatches(projectId: string): Promise<{ id: string; code: string; element_betonado: string; concrete_class: string; batch_date: string }[]> {
    const { data, error } = await supabase
      .from("concrete_batches" as any)
      .select("id, code, element_betonado, concrete_class, batch_date")
      .eq("project_id", projectId)
      .is("lot_id", null)
      .order("batch_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as any[];
  },

  async getBatchesByLot(lotId: string): Promise<{ id: string; code: string; element_betonado: string; batch_date: string }[]> {
    const { data, error } = await supabase
      .from("concrete_batches" as any)
      .select("id, code, element_betonado, batch_date")
      .eq("lot_id", lotId)
      .order("batch_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as any[];
  },
};
