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
    // Step 1: Get materials with supplier links
    const { data: materials, error: matErr } = await (supabase as any)
      .from("materials")
      .select("id, code, name, category, status, pame_status, is_deleted")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("code");

    if (matErr) throw matErr;
    if (!materials || materials.length === 0) return [];

    const materialIds = materials.map((m: any) => m.id);

    // Step 2: Parallel fetch related data
    const [lotsRes, testsRes, supplierLinksRes, workItemLinksRes] = await Promise.all([
      (supabase as any)
        .from("material_lots")
        .select("id, lot_code, reception_date, reception_status, ce_marking_ok, material_id, supplier_id, suppliers:supplier_id(id, name, code)")
        .in("material_id", materialIds)
        .eq("is_deleted", false)
        .order("reception_date", { ascending: false }),
      (supabase as any)
        .from("test_results")
        .select("id, code, date, status, pass_fail, material_id, work_item_id")
        .in("material_id", materialIds)
        .eq("is_deleted", false)
        .order("date", { ascending: false }),
      (supabase as any)
        .from("material_suppliers")
        .select("material_id, supplier_id, suppliers:supplier_id(id, name, code)")
        .in("material_id", materialIds),
      (supabase as any)
        .from("work_item_materials")
        .select("material_id, work_item_id, work_items:work_item_id(id, code, name)")
        .in("material_id", materialIds),
    ]);

    // Step 3: Get PPI instances that reference work items
    const workItemIds = [
      ...(testsRes.data ?? []).map((t: any) => t.work_item_id).filter(Boolean),
      ...(workItemLinksRes.data ?? []).map((w: any) => w.work_item_id).filter(Boolean),
    ];
    const uniqueWiIds = [...new Set(workItemIds)] as string[];

    let ppiMap: Record<string, { id: string; code: string; status: string }> = {};
    if (uniqueWiIds.length > 0) {
      const { data: ppis } = await (supabase as any)
        .from("ppi_instances")
        .select("id, code, status, work_item_id")
        .in("work_item_id", uniqueWiIds)
        .eq("project_id", projectId)
        .eq("is_deleted", false);

      (ppis ?? []).forEach((p: any) => {
        if (p.work_item_id && !ppiMap[p.work_item_id]) {
          ppiMap[p.work_item_id] = { id: p.id, code: p.code, status: p.status };
        }
      });
    }

    // Step 4: Build index maps
    const lotsByMat: Record<string, any[]> = {};
    (lotsRes.data ?? []).forEach((l: any) => {
      (lotsByMat[l.material_id] ??= []).push(l);
    });

    const testsByMat: Record<string, any[]> = {};
    (testsRes.data ?? []).forEach((t: any) => {
      if (t.material_id) (testsByMat[t.material_id] ??= []).push(t);
    });

    const suppliersByMat: Record<string, any> = {};
    (supplierLinksRes.data ?? []).forEach((s: any) => {
      if (!suppliersByMat[s.material_id]) suppliersByMat[s.material_id] = s.suppliers;
    });

    const wiByMat: Record<string, any> = {};
    (workItemLinksRes.data ?? []).forEach((w: any) => {
      if (!wiByMat[w.material_id]) wiByMat[w.material_id] = w.work_items;
    });

    // Step 5: Assemble rows — one row per material (with most recent lot/test)
    const rows: TraceabilityRow[] = materials.map((mat: any) => {
      const lots = lotsByMat[mat.id] ?? [];
      const tests = testsByMat[mat.id] ?? [];
      const supplier = lots[0]?.suppliers ?? suppliersByMat[mat.id] ?? null;
      const lot = lots[0] ?? null;
      const test = tests[0] ?? null;
      const wi = wiByMat[mat.id] ?? null;
      const wiId = test?.work_item_id ?? wi?.id ?? null;
      const ppi = wiId ? ppiMap[wiId] ?? null : null;

      return {
        material_id: mat.id,
        material_code: mat.code,
        material_name: mat.name,
        material_category: mat.category,
        material_status: mat.status,
        pame_status: mat.pame_status,
        supplier_id: supplier?.id ?? null,
        supplier_name: supplier?.name ?? null,
        supplier_code: supplier?.code ?? null,
        lot_id: lot?.id ?? null,
        lot_code: lot?.lot_code ?? null,
        lot_reception_date: lot?.reception_date ?? null,
        lot_reception_status: lot?.reception_status ?? null,
        lot_ce_marking: lot?.ce_marking_ok ?? null,
        test_result_id: test?.id ?? null,
        test_code: test?.code ?? null,
        test_date: test?.date ?? null,
        test_status: test?.status ?? null,
        test_pass_fail: test?.pass_fail ?? null,
        ppi_instance_id: ppi?.id ?? null,
        ppi_code: ppi?.code ?? null,
        ppi_status: ppi?.status ?? null,
        work_item_id: wi?.id ?? wiId,
        work_item_code: wi?.code ?? null,
        work_item_name: wi?.name ?? null,
      };
    });

    return rows;
  },
};
