/**
 * Traceability Matrix Service
 * Read-only queries that cross-reference existing data:
 * supplier → material → lot → test → PPI → work_item
 */
import { supabase } from "@/integrations/supabase/client";

export interface TraceabilityRow {
  // Material
  material_id: string;
  material_code: string;
  material_name: string;
  material_category: string;
  material_status: string;
  pame_status: string | null;
  // Supplier
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_code: string | null;
  // Lot
  lot_id: string | null;
  lot_code: string | null;
  lot_reception_date: string | null;
  lot_reception_status: string | null;
  lot_ce_marking: boolean | null;
  // Test
  test_result_id: string | null;
  test_code: string | null;
  test_date: string | null;
  test_status: string | null;
  test_pass_fail: string | null;
  // PPI
  ppi_instance_id: string | null;
  ppi_code: string | null;
  ppi_status: string | null;
  // Work Item
  work_item_id: string | null;
  work_item_code: string | null;
  work_item_name: string | null;
}

export const traceabilityService = {
  /**
   * Build a full traceability matrix for a project.
   * Uses multiple joins across existing tables — no new schema needed.
   */
  async getMatrix(projectId: string): Promise<TraceabilityRow[]> {
    const { data, error } = await (supabase as any)
      .from("vw_traceability_matrix")
      .select("*")
      .eq("project_id", projectId)
      .order("material_code");

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      material_id: r.material_id,
      material_code: r.material_code,
      material_name: r.material_name,
      material_category: r.material_category,
      material_status: r.material_status,
      pame_status: r.pame_status,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      supplier_code: r.supplier_code,
      lot_id: r.lot_id,
      lot_code: r.lot_code,
      lot_reception_date: r.reception_date,
      lot_reception_status: r.lot_status,
      lot_ce_marking: r.lot_ce,
      test_result_id: null,
      test_code: null,
      test_date: null,
      test_status: null,
      test_pass_fail: null,
      ppi_instance_id: r.ppi_id,
      ppi_code: r.ppi_code,
      ppi_status: r.ppi_status,
      work_item_id: r.work_item_id,
      work_item_code: [r.wi_sector, r.wi_parte, r.wi_elemento].filter(Boolean).join(" › "),
      work_item_name: r.wi_elemento ?? r.wi_parte ?? r.wi_sector ?? null,
    }));
  },
};
