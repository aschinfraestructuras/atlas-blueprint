import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyReport {
  id: string;
  project_id: string;
  work_item_id: string | null;
  report_date: string;
  report_number: string;
  weather: string | null;
  temperature_min: number | null;
  temperature_max: number | null;
  observations: string | null;
  status: "draft" | "submitted" | "validated";
  signed_contractor: boolean;
  signed_supervisor: boolean;
  signed_ip: boolean;
  foreman_name: string | null;
  contractor_rep: string | null;
  supervisor_rep: string | null;
  ip_rep: string | null;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReportInput {
  project_id: string;
  work_item_id?: string | null;
  report_date: string;
  report_number: string;
  weather?: string | null;
  temperature_min?: number | null;
  temperature_max?: number | null;
  observations?: string | null;
  foreman_name?: string | null;
  contractor_rep?: string | null;
  supervisor_rep?: string | null;
  ip_rep?: string | null;
}

export interface LabourRow {
  id: string;
  daily_report_id: string;
  category: string;
  name: string | null;
  time_start: string | null;
  time_end: string | null;
  hours_worked: number | null;
  created_at: string;
}

export interface EquipmentRow {
  id: string;
  daily_report_id: string;
  designation: string;
  type: string | null;
  serial_number: string | null;
  sound_power_db: number | null;
  hours_worked: number | null;
  created_at: string;
}

export interface MaterialRow {
  id: string;
  daily_report_id: string;
  nomenclature: string;
  quantity: number | null;
  unit: string | null;
  lot_number: string | null;
  material_id: string | null;
  pame_reference: string | null;
  created_at: string;
}

export interface RmmRow {
  id: string;
  daily_report_id: string;
  internal_code: string | null;
  designation: string;
  created_at: string;
}

export interface WasteRow {
  id: string;
  daily_report_id: string;
  type: string;
  packaging_type: string | null;
  quantity: number | null;
  unit: string | null;
  preliminary_storage: string | null;
  final_destination: string | null;
  created_at: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const dailyReportService = {
  // ── Main reports ──────────────────────────────────────────────────────────
  async getByProject(projectId: string): Promise<DailyReport[]> {
    const { data, error } = await supabase
      .from("daily_reports" as any)
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("report_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DailyReport[];
  },

  async getById(id: string): Promise<DailyReport> {
    const { data, error } = await supabase
      .from("daily_reports" as any)
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as DailyReport;
  },

  async create(input: DailyReportInput, userId: string): Promise<DailyReport> {
    const { data, error } = await supabase
      .from("daily_reports" as any)
      .insert({ ...input, created_by: userId } as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DailyReport;
  },

  async update(id: string, input: Partial<DailyReportInput> & Record<string, any>): Promise<DailyReport> {
    const { data, error } = await supabase
      .from("daily_reports" as any)
      .update({ ...input, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DailyReport;
  },

  async submit(id: string): Promise<void> {
    const { error } = await supabase
      .from("daily_reports" as any)
      .update({ status: "submitted", updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) throw error;
  },

  async validate(id: string): Promise<void> {
    const { error } = await supabase
      .from("daily_reports" as any)
      .update({ status: "validated", updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) throw error;
  },

  // ── Child table helpers ───────────────────────────────────────────────────
  async getLabour(reportId: string): Promise<LabourRow[]> {
    const { data, error } = await supabase
      .from("daily_report_labour" as any)
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as LabourRow[];
  },
  async addLabour(row: Omit<LabourRow, "id" | "created_at">): Promise<LabourRow> {
    const { data, error } = await supabase.from("daily_report_labour" as any).insert(row as any).select().single();
    if (error) throw error;
    return data as unknown as LabourRow;
  },
  async deleteLabour(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_labour" as any).delete().eq("id", id);
    if (error) throw error;
  },

  async getEquipment(reportId: string): Promise<EquipmentRow[]> {
    const { data, error } = await supabase
      .from("daily_report_equipment" as any)
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as EquipmentRow[];
  },
  async addEquipment(row: Omit<EquipmentRow, "id" | "created_at">): Promise<EquipmentRow> {
    const { data, error } = await supabase.from("daily_report_equipment" as any).insert(row as any).select().single();
    if (error) throw error;
    return data as unknown as EquipmentRow;
  },
  async deleteEquipment(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_equipment" as any).delete().eq("id", id);
    if (error) throw error;
  },

  async getMaterials(reportId: string): Promise<MaterialRow[]> {
    const { data, error } = await supabase
      .from("daily_report_materials" as any)
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as MaterialRow[];
  },
  async addMaterial(row: Omit<MaterialRow, "id" | "created_at" | "material_id" | "pame_reference"> & { material_id?: string | null; pame_reference?: string | null }): Promise<MaterialRow> {
    const { data, error } = await supabase.from("daily_report_materials" as any).insert(row as any).select().single();
    if (error) throw error;
    return data as unknown as MaterialRow;
  },
  async deleteMaterial(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_materials" as any).delete().eq("id", id);
    if (error) throw error;
  },

  async getRmm(reportId: string): Promise<RmmRow[]> {
    const { data, error } = await supabase
      .from("daily_report_rmm" as any)
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as RmmRow[];
  },
  async addRmm(row: Omit<RmmRow, "id" | "created_at">): Promise<RmmRow> {
    const { data, error } = await supabase.from("daily_report_rmm" as any).insert(row as any).select().single();
    if (error) throw error;
    return data as unknown as RmmRow;
  },
  async deleteRmm(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_rmm" as any).delete().eq("id", id);
    if (error) throw error;
  },

  async getWaste(reportId: string): Promise<WasteRow[]> {
    const { data, error } = await supabase
      .from("daily_report_waste" as any)
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as WasteRow[];
  },
  async addWaste(row: Omit<WasteRow, "id" | "created_at">): Promise<WasteRow> {
    const { data, error } = await supabase.from("daily_report_waste" as any).insert(row as any).select().single();
    if (error) throw error;
    return data as unknown as WasteRow;
  },
  async deleteWaste(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_waste" as any).delete().eq("id", id);
    if (error) throw error;
  },

  // ── Sequence helper ───────────────────────────────────────────────────────
  async nextReportNumber(projectId: string, date: string): Promise<string> {
    const { data } = await supabase
      .from("daily_reports" as any)
      .select("report_number")
      .eq("project_id", projectId)
      .like("report_number", `DR-${date}-%` as any);
    const count = (data as any[] | null)?.length ?? 0;
    return `DR-${date}-${String(count + 1).padStart(3, "0")}`;
  },
};
