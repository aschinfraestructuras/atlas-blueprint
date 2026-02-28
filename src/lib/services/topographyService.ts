import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopographyEquipment {
  id: string;
  project_id: string;
  code: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  responsible: string | null;
  status: string;
  current_location: string | null;
  calibration_valid_until: string | null;
  calibration_status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCalibration {
  id: string;
  equipment_id: string;
  project_id: string;
  certifying_entity: string;
  certificate_number: string | null;
  issue_date: string;
  valid_until: string;
  document_id: string | null;
  approved_by: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopographyRequest {
  id: string;
  project_id: string;
  work_item_id: string | null;
  zone: string | null;
  description: string;
  request_type: string;
  request_date: string;
  priority: string;
  responsible: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopographyControl {
  id: string;
  project_id: string;
  equipment_id: string;
  zone: string | null;
  element: string;
  tolerance: string | null;
  measured_value: string | null;
  deviation: string | null;
  result: string;
  execution_date: string;
  technician: string | null;
  ppi_id: string | null;
  test_id: string | null;
  nc_id: string | null;
  work_item_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Equipment Service ────────────────────────────────────────────────────────

export const topographyEquipmentService = {
  async getByProject(projectId: string): Promise<TopographyEquipment[]> {
    const { data, error } = await (supabase as any)
      .from("topography_equipment")
      .select("*")
      .eq("project_id", projectId)
      .order("code", { ascending: true });
    if (error) throw error;
    return data as TopographyEquipment[];
  },

  async getById(id: string): Promise<TopographyEquipment> {
    const { data, error } = await (supabase as any)
      .from("topography_equipment")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as TopographyEquipment;
  },

  async create(input: Partial<TopographyEquipment> & { project_id: string; code: string; equipment_type: string }): Promise<TopographyEquipment> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("topography_equipment")
      .insert({ ...input, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "topography_equipment",
      entityId: (data as TopographyEquipment).id,
      action: "INSERT",
      module: "topography",
      diff: { code: input.code, type: input.equipment_type },
    });
    return data as TopographyEquipment;
  },

  async update(id: string, projectId: string, updates: Partial<TopographyEquipment>): Promise<TopographyEquipment> {
    const { data, error } = await (supabase as any)
      .from("topography_equipment")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "topography_equipment",
      entityId: id,
      action: "UPDATE",
      module: "topography",
      diff: updates as Record<string, unknown>,
    });
    return data as TopographyEquipment;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await (supabase as any).from("topography_equipment").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "topography_equipment", entityId: id, action: "DELETE", module: "topography" });
  },
};

// ─── Calibration Service ──────────────────────────────────────────────────────

export const calibrationService = {
  async getByEquipment(equipmentId: string): Promise<EquipmentCalibration[]> {
    const { data, error } = await (supabase as any)
      .from("equipment_calibrations")
      .select("*")
      .eq("equipment_id", equipmentId)
      .order("valid_until", { ascending: false });
    if (error) throw error;
    return data as EquipmentCalibration[];
  },

  async getByProject(projectId: string): Promise<EquipmentCalibration[]> {
    const { data, error } = await (supabase as any)
      .from("equipment_calibrations")
      .select("*")
      .eq("project_id", projectId)
      .order("valid_until", { ascending: false });
    if (error) throw error;
    return data as EquipmentCalibration[];
  },

  async create(input: Partial<EquipmentCalibration> & { equipment_id: string; project_id: string; certifying_entity: string; valid_until: string }): Promise<EquipmentCalibration> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("equipment_calibrations")
      .insert({ ...input, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "equipment_calibrations",
      entityId: (data as EquipmentCalibration).id,
      action: "INSERT",
      module: "topography",
      description: `Calibração registada para equipamento`,
      diff: { equipment_id: input.equipment_id, valid_until: input.valid_until },
    });
    return data as EquipmentCalibration;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await (supabase as any).from("equipment_calibrations").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "equipment_calibrations", entityId: id, action: "DELETE", module: "topography" });
  },
};

// ─── Topography Requests Service ──────────────────────────────────────────────

export const topographyRequestService = {
  async getByProject(projectId: string): Promise<TopographyRequest[]> {
    const { data, error } = await (supabase as any)
      .from("topography_requests")
      .select("*")
      .eq("project_id", projectId)
      .order("request_date", { ascending: false });
    if (error) throw error;
    return data as TopographyRequest[];
  },

  async create(input: Partial<TopographyRequest> & { project_id: string; description: string }): Promise<TopographyRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("topography_requests")
      .insert({ ...input, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "topography_requests",
      entityId: (data as TopographyRequest).id,
      action: "INSERT",
      module: "topography",
      diff: { type: input.request_type, description: input.description },
    });
    return data as TopographyRequest;
  },

  async update(id: string, projectId: string, updates: Partial<TopographyRequest>): Promise<TopographyRequest> {
    const { data, error } = await (supabase as any)
      .from("topography_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "topography_requests",
      entityId: id,
      action: "UPDATE",
      module: "topography",
      diff: updates as Record<string, unknown>,
    });
    return data as TopographyRequest;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await (supabase as any).from("topography_requests").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "topography_requests", entityId: id, action: "DELETE", module: "topography" });
  },
};

// ─── Topography Controls Service ──────────────────────────────────────────────

export const topographyControlService = {
  async getByProject(projectId: string): Promise<TopographyControl[]> {
    const { data, error } = await (supabase as any)
      .from("topography_controls")
      .select("*")
      .eq("project_id", projectId)
      .order("execution_date", { ascending: false });
    if (error) throw error;
    return data as TopographyControl[];
  },

  async create(input: Partial<TopographyControl> & { project_id: string; equipment_id: string; element: string }): Promise<TopographyControl> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await (supabase as any)
      .from("topography_controls")
      .insert({ ...input, created_by: user?.id })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "topography_controls",
      entityId: (data as TopographyControl).id,
      action: "INSERT",
      module: "topography",
      diff: { element: input.element, equipment_id: input.equipment_id, result: input.result },
    });
    return data as TopographyControl;
  },

  async update(id: string, projectId: string, updates: Partial<TopographyControl>): Promise<TopographyControl> {
    const { data, error } = await (supabase as any)
      .from("topography_controls")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "topography_controls",
      entityId: id,
      action: "UPDATE",
      module: "topography",
      diff: updates as Record<string, unknown>,
    });
    return data as TopographyControl;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await (supabase as any).from("topography_controls").delete().eq("id", id);
    if (error) throw error;
    await auditService.log({ projectId, entity: "topography_controls", entityId: id, action: "DELETE", module: "topography" });
  },
};
