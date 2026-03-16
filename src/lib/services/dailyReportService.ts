import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// ─── Supabase row types ───────────────────────────────────────────────────────
type DailyReportRow = Database["public"]["Tables"]["daily_reports"]["Row"];
type DailyReportInsert = Database["public"]["Tables"]["daily_reports"]["Insert"];
type DailyReportUpdate = Database["public"]["Tables"]["daily_reports"]["Update"];
type LabourInsert = Database["public"]["Tables"]["daily_report_labour"]["Insert"];
type EquipInsert = Database["public"]["Tables"]["daily_report_equipment"]["Insert"];
type MatInsert = Database["public"]["Tables"]["daily_report_materials"]["Insert"];
type RmmInsert = Database["public"]["Tables"]["daily_report_rmm"]["Insert"];
type WasteInsert = Database["public"]["Tables"]["daily_report_waste"]["Insert"];

// ─── Public Types ─────────────────────────────────────────────────────────────

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
  preliminary_storage: string | null;
  final_destination: string | null;
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
      .from("daily_reports")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("report_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DailyReport[];
  },

  async getById(id: string): Promise<DailyReport> {
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as DailyReport;
  },

  async create(input: DailyReportInput, userId: string): Promise<DailyReport> {
    const row: DailyReportInsert = { ...input, created_by: userId };
    const { data, error } = await supabase
      .from("daily_reports")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DailyReport;
  },

  async update(id: string, input: Partial<DailyReportInput> & Record<string, string | number | boolean | null | undefined>): Promise<DailyReport> {
    const payload: DailyReportUpdate = { ...input, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from("daily_reports")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as DailyReport;
  },

  async submit(id: string): Promise<void> {
    const payload: DailyReportUpdate = { status: "submitted", updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("daily_reports")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  },

  async validate(id: string): Promise<void> {
    const payload: DailyReportUpdate = { status: "validated", updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("daily_reports")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  },

  // ── Child table helpers ───────────────────────────────────────────────────
  async getLabour(reportId: string): Promise<LabourRow[]> {
    const { data, error } = await supabase
      .from("daily_report_labour")
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as LabourRow[];
  },
  async addLabour(row: Omit<LabourRow, "id" | "created_at">): Promise<LabourRow> {
    const input: LabourInsert = row;
    const { data, error } = await supabase.from("daily_report_labour").insert(input).select().single();
    if (error) throw error;
    return data as unknown as LabourRow;
  },
  async updateLabour(id: string, fields: Partial<Omit<LabourRow, "id" | "created_at" | "daily_report_id">>): Promise<void> {
    const { error } = await supabase.from("daily_report_labour").update(fields as any).eq("id", id);
    if (error) throw error;
  },
  async deleteLabour(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_labour").delete().eq("id", id);
    if (error) throw error;
  },

  async getEquipment(reportId: string): Promise<EquipmentRow[]> {
    const { data, error } = await supabase
      .from("daily_report_equipment")
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as EquipmentRow[];
  },
  async addEquipment(row: Omit<EquipmentRow, "id" | "created_at">): Promise<EquipmentRow> {
    const input: EquipInsert = row;
    const { data, error } = await supabase.from("daily_report_equipment").insert(input).select().single();
    if (error) throw error;
    return data as unknown as EquipmentRow;
  },
  async updateEquipment(id: string, fields: Partial<Omit<EquipmentRow, "id" | "created_at" | "daily_report_id">>): Promise<void> {
    const { error } = await supabase.from("daily_report_equipment").update(fields as any).eq("id", id);
    if (error) throw error;
  },
  async deleteEquipment(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_equipment").delete().eq("id", id);
    if (error) throw error;
  },

  async getMaterials(reportId: string): Promise<MaterialRow[]> {
    const { data, error } = await supabase
      .from("daily_report_materials")
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as MaterialRow[];
  },
  async addMaterial(row: Omit<MaterialRow, "id" | "created_at" | "material_id" | "pame_reference"> & { material_id?: string | null; pame_reference?: string | null }): Promise<MaterialRow> {
    const input: MatInsert = row;
    const { data, error } = await supabase.from("daily_report_materials").insert(input).select().single();
    if (error) throw error;
    return data as unknown as MaterialRow;
  },
  async updateMaterial(id: string, fields: Partial<Omit<MaterialRow, "id" | "created_at" | "daily_report_id">>): Promise<void> {
    const { error } = await supabase.from("daily_report_materials").update(fields as any).eq("id", id);
    if (error) throw error;
  },
  async deleteMaterial(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_materials").delete().eq("id", id);
    if (error) throw error;
  },

  async getRmm(reportId: string): Promise<RmmRow[]> {
    const { data, error } = await supabase
      .from("daily_report_rmm")
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as RmmRow[];
  },
  async addRmm(row: Omit<RmmRow, "id" | "created_at">): Promise<RmmRow> {
    const input: RmmInsert = row;
    const { data, error } = await supabase.from("daily_report_rmm").insert(input).select().single();
    if (error) throw error;
    return data as unknown as RmmRow;
  },
  async updateRmm(id: string, fields: Partial<Omit<RmmRow, "id" | "created_at" | "daily_report_id">>): Promise<void> {
    const { error } = await supabase.from("daily_report_rmm").update(fields as any).eq("id", id);
    if (error) throw error;
  },
  async deleteRmm(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_rmm").delete().eq("id", id);
    if (error) throw error;
  },

  async getWaste(reportId: string): Promise<WasteRow[]> {
    const { data, error } = await supabase
      .from("daily_report_waste")
      .select("*")
      .eq("daily_report_id", reportId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as WasteRow[];
  },
  async addWaste(row: Omit<WasteRow, "id" | "created_at">): Promise<WasteRow> {
    const input: WasteInsert = row;
    const { data, error } = await supabase.from("daily_report_waste").insert(input).select().single();
    if (error) throw error;
    return data as unknown as WasteRow;
  },
  async updateWaste(id: string, fields: Partial<Omit<WasteRow, "id" | "created_at" | "daily_report_id">>): Promise<void> {
    const { error } = await supabase.from("daily_report_waste").update(fields as any).eq("id", id);
    if (error) throw error;
  },
  async deleteWaste(id: string): Promise<void> {
    const { error } = await supabase.from("daily_report_waste").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Sequence helper ───────────────────────────────────────────────────────
  async nextReportNumber(projectId: string, date: string): Promise<string> {
    const { data } = await supabase
      .from("daily_reports")
      .select("report_number")
      .eq("project_id", projectId)
      .like("report_number", `DR-${date}-%`);
    const count = (data ?? []).length;
    return `DR-${date}-${String(count + 1).padStart(3, "0")}`;
  },
};
