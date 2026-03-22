import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables not in generated types
const db = supabase as any;

export interface ExpiringItem {
  id: string;
  domain: "supplier" | "subcontractor" | "calibration" | "material" | "personnel";
  entity_name: string;
  entity_id: string;
  doc_title: string;
  doc_type: string;
  valid_to: string;
  days_remaining: number;
  status: "expired" | "expiring_7d" | "expiring_30d" | "expiring_60d" | "expiring_90d";
}

function classifyExpiration(validTo: string): ExpiringItem["status"] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vt = new Date(validTo);
  vt.setHours(0, 0, 0, 0);
  const diff = Math.ceil((vt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "expired";
  if (diff <= 7) return "expiring_7d";
  if (diff <= 30) return "expiring_30d";
  if (diff <= 60) return "expiring_60d";
  return "expiring_90d";
}

function daysRemaining(validTo: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vt = new Date(validTo);
  vt.setHours(0, 0, 0, 0);
  return Math.ceil((vt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface SupplierDocResult {
  id: string;
  doc_type: string;
  valid_to: string;
  supplier_id: string;
  suppliers: { name: string; is_deleted?: boolean } | null;
}

interface SubDocResult {
  id: string;
  doc_type: string;
  title: string;
  valid_to: string;
  subcontractor_id: string;
}

interface CalibrationResult {
  id: string;
  valid_until: string;
  equipment_id: string;
}

interface EquipmentResult {
  id: string;
  code: string;
  model: string;
}

interface MatDocResult {
  id: string;
  doc_type: string;
  valid_to: string;
  material_id: string;
  materials: { name: string; code: string } | null;
}

export const expirationService = {
  async getAll(projectId: string, maxDays = 90): Promise<ExpiringItem[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + maxDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const results: ExpiringItem[] = [];

    // 1. Supplier documents (exclude docs from deleted suppliers)
    const { data: supDocs } = await db.from("supplier_documents")
      .select("id, doc_type, valid_to, supplier_id, suppliers:supplier_id(name, is_deleted)")
      .eq("project_id", projectId)
      .not("valid_to", "is", null)
      .lte("valid_to", cutoffStr);

    ((supDocs ?? []) as unknown as SupplierDocResult[]).forEach((d) => {
      results.push({
        id: d.id,
        domain: "supplier",
        entity_name: d.suppliers?.name ?? "—",
        entity_id: d.supplier_id,
        doc_title: d.doc_type,
        doc_type: d.doc_type,
        valid_to: d.valid_to,
        days_remaining: daysRemaining(d.valid_to),
        status: classifyExpiration(d.valid_to),
      });
    });

    // 2. Subcontractor documents
    const { data: subDocs } = await supabase
      .from("subcontractor_documents")
      .select("id, doc_type, title, valid_to, subcontractor_id")
      .eq("project_id", projectId)
      .not("valid_to", "is", null)
      .lte("valid_to", cutoffStr);

    if (subDocs) {
      // Get subcontractor names
      const subIds = [...new Set(subDocs.map(d => d.subcontractor_id))];
      const { data: subs } = await supabase
        .from("subcontractors")
        .select("id, name")
        .in("id", subIds);
      const subMap = Object.fromEntries((subs ?? []).map(s => [s.id, s.name]));

      subDocs.forEach((d) => {
        results.push({
          id: d.id,
          domain: "subcontractor",
          entity_name: subMap[d.subcontractor_id] ?? "—",
          entity_id: d.subcontractor_id,
          doc_title: d.title,
          doc_type: d.doc_type,
          valid_to: d.valid_to!,
          days_remaining: daysRemaining(d.valid_to!),
          status: classifyExpiration(d.valid_to!),
        });
      });
    }

    // 3. Equipment calibrations
    const { data: cals } = await supabase
      .from("equipment_calibrations")
      .select("id, valid_until, equipment_id")
      .eq("project_id", projectId)
      .lte("valid_until", cutoffStr);

    if (cals) {
      const eqIds = [...new Set(cals.map(c => c.equipment_id))];
      const { data: eqs } = await db.from("topography_equipment")
        .select("id, code, model")
        .in("id", eqIds);
      const eqMap = Object.fromEntries(((eqs ?? []) as unknown as EquipmentResult[]).map(e => [e.id, `${e.code} — ${e.model}`]));

      cals.forEach((c) => {
        results.push({
          id: c.id,
          domain: "calibration",
          entity_name: eqMap[c.equipment_id] ?? "—",
          entity_id: c.equipment_id,
          doc_title: "Calibração",
          doc_type: "calibration",
          valid_to: c.valid_until,
          days_remaining: daysRemaining(c.valid_until),
          status: classifyExpiration(c.valid_until),
        });
      });
    }

    // 4. Material documents
    const { data: matDocs } = await db.from("material_documents")
      .select("id, doc_type, valid_to, material_id, materials:material_id(name, code)")
      .eq("project_id", projectId)
      .not("valid_to", "is", null)
      .lte("valid_to", cutoffStr);

    ((matDocs ?? []) as unknown as MatDocResult[]).forEach((d) => {
      results.push({
        id: d.id,
        domain: "material",
        entity_name: d.materials ? `${d.materials.code} — ${d.materials.name}` : "—",
        entity_id: d.material_id,
        doc_title: d.doc_type,
        doc_type: d.doc_type,
        valid_to: d.valid_to,
        days_remaining: daysRemaining(d.valid_to),
        status: classifyExpiration(d.valid_to),
      });
    });

    // Sort by days remaining (most urgent first)
    results.sort((a, b) => a.days_remaining - b.days_remaining);

    return results;
  },

  /** Summary counts by domain */
  async getSummary(projectId: string): Promise<Record<string, { expired: number; expiring: number }>> {
    const all = await this.getAll(projectId, 90);
    const summary: Record<string, { expired: number; expiring: number }> = {
      supplier: { expired: 0, expiring: 0 },
      subcontractor: { expired: 0, expiring: 0 },
      calibration: { expired: 0, expiring: 0 },
      material: { expired: 0, expiring: 0 },
      personnel: { expired: 0, expiring: 0 },
    };
    all.forEach(item => {
      if (item.status === "expired") summary[item.domain].expired++;
      else summary[item.domain].expiring++;
    });
    return summary;
  },
};
