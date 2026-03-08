import { supabase } from "@/integrations/supabase/client";

export interface DeadlineItem {
  id: string;
  project_id: string;
  source: "supplier_doc" | "material_doc" | "calibration" | "nc_due" | "rfi_due" | "tech_office_due" | "planning_due" | "ppi_pending" | "ppi_approval" | "quarantine_lot" | "subcontractor_doc";
  entity_id: string;
  entity_label: string;
  document_id: string | null;
  due_date: string;
  status: string;
  doc_type: string;
  assigned_to: string | null;
  severity: "critical" | "warning" | "info";
  days_remaining: number;
}

export const deadlineService = {
  async getAll(projectId: string, daysAhead = 90): Promise<DeadlineItem[]> {
    const { data, error } = await (supabase as any)
      .from("vw_deadlines")
      .select("*")
      .eq("project_id", projectId)
      .lte("days_remaining", daysAhead)
      .order("days_remaining", { ascending: true });

    if (error) throw error;
    return (data ?? []) as DeadlineItem[];
  },

  async getSummary(projectId: string, daysAhead = 90) {
    const all = await this.getAll(projectId, daysAhead);
    const overdue = all.filter(i => i.days_remaining < 0).length;
    const in7d = all.filter(i => i.days_remaining >= 0 && i.days_remaining <= 7).length;
    const in30d = all.filter(i => i.days_remaining >= 0 && i.days_remaining <= 30).length;
    return { total: all.length, overdue, in7d, in30d, items: all };
  },
};
