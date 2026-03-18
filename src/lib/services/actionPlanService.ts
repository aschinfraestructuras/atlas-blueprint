/**
 * Action Plan Service
 * Aggregates corrective/preventive actions from multiple sources:
 * - Non-Conformities (corrective_action, preventive_action)
 * - Meeting Actions (ATA-Q decisions)
 * - Quality Audits (findings → actions)
 */
import { supabase } from "@/integrations/supabase/client";

export type ActionOrigin = "nc" | "meeting" | "audit" | "ppi";
export type ActionStatus = "open" | "in_progress" | "closed" | "overdue";

export interface ActionPlanItem {
  id: string;
  origin: ActionOrigin;
  originCode: string;
  originId: string;
  description: string;
  type: "corrective" | "preventive" | "correction" | "action";
  responsible: string | null;
  dueDate: string | null;
  status: ActionStatus;
  createdAt: string;
  severity?: string;
  linkedEntityUrl: string;
}

export const actionPlanService = {
  async getByProject(projectId: string): Promise<ActionPlanItem[]> {
    const items: ActionPlanItem[] = [];
    const today = new Date().toISOString().slice(0, 10);

    // 1. Non-Conformities with CAPA
    const { data: ncs } = await supabase
      .from("non_conformities")
      .select("id, code, status, severity, corrective_action, preventive_action, correction, responsible, due_date, created_at, closure_date")
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .or("corrective_action.neq.,preventive_action.neq.,correction.neq.");

    for (const nc of ncs ?? []) {
      const ncCode = (nc as any).code ?? "NC";
      const ncStatus = (nc as any).status as string;
      const isClosed = ncStatus === "closed" || ncStatus === "archived";
      const isOverdue = !isClosed && (nc as any).due_date && (nc as any).due_date < today;

      if ((nc as any).corrective_action) {
        items.push({
          id: `nc-ca-${nc.id}`,
          origin: "nc",
          originCode: ncCode,
          originId: nc.id,
          description: (nc as any).corrective_action,
          type: "corrective",
          responsible: (nc as any).responsible,
          dueDate: (nc as any).due_date,
          status: isClosed ? "closed" : isOverdue ? "overdue" : ncStatus === "in_progress" ? "in_progress" : "open",
          createdAt: (nc as any).created_at,
          severity: (nc as any).severity,
          linkedEntityUrl: `/non-conformities/${nc.id}`,
        });
      }

      if ((nc as any).preventive_action) {
        items.push({
          id: `nc-pa-${nc.id}`,
          origin: "nc",
          originCode: ncCode,
          originId: nc.id,
          description: (nc as any).preventive_action,
          type: "preventive",
          responsible: (nc as any).responsible,
          dueDate: (nc as any).due_date,
          status: isClosed ? "closed" : isOverdue ? "overdue" : "open",
          createdAt: (nc as any).created_at,
          severity: (nc as any).severity,
          linkedEntityUrl: `/non-conformities/${nc.id}`,
        });
      }

      if ((nc as any).correction) {
        items.push({
          id: `nc-cr-${nc.id}`,
          origin: "nc",
          originCode: ncCode,
          originId: nc.id,
          description: (nc as any).correction,
          type: "correction",
          responsible: (nc as any).responsible,
          dueDate: (nc as any).due_date,
          status: isClosed ? "closed" : isOverdue ? "overdue" : "open",
          createdAt: (nc as any).created_at,
          severity: (nc as any).severity,
          linkedEntityUrl: `/non-conformities/${nc.id}`,
        });
      }
    }

    // 2. Quality Audits with findings
    const { data: audits } = await (supabase as any)
      .from("quality_audits")
      .select("id, code, status, findings, observations, planned_date, nc_count, obs_count, created_at")
      .eq("project_id", projectId)
      .neq("status", "cancelled")
      .not("findings", "is", null);

    for (const audit of audits ?? []) {
      if (audit.findings) {
        items.push({
          id: `aud-${audit.id}`,
          origin: "audit",
          originCode: audit.code ?? "AUD",
          originId: audit.id,
          description: audit.findings,
          type: "action",
          responsible: null,
          dueDate: null,
          status: audit.status === "completed" ? "closed" : "open",
          createdAt: audit.created_at,
          linkedEntityUrl: `/audits`,
        });
      }
    }

    // 3. Meeting actions from ATA-Q documents
    const { data: docs } = await (supabase as any)
      .from("documents")
      .select("id, form_data, title, created_at")
      .eq("project_id", projectId)
      .eq("doc_type", "record")
      .eq("is_deleted", false)
      .not("form_data", "is", null);

    for (const doc of docs ?? []) {
      const fd = doc.form_data as Record<string, string> | null;
      if (!fd || (!fd.numero_ata && !fd.data_reuniao)) continue;
      const ataNumber = fd.numero_ata ?? "";
      const decisoesText = fd.decisoes ?? "";
      if (!decisoesText.trim()) continue;

      const lines = decisoesText.split("\n").filter((l: string) => l.trim());
      lines.forEach((line: string, idx: number) => {
        const cleaned = line.replace(/^\d+\.\s*/, "").trim();
        if (cleaned.length < 3) return;

        let responsible: string | null = null;
        const respMatch = cleaned.match(/[—\-]\s*(?:Responsável|Resp\.?)\s*:\s*([^—\-]+)/i);
        if (respMatch) responsible = respMatch[1].trim();

        let dueDate: string | null = null;
        const dateMatch = cleaned.match(/[—\-]\s*(?:Prazo|Data)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
        if (dateMatch) {
          const parts = dateMatch[1].split(/[\/\-]/);
          if (parts.length === 3) {
            const [d, m, y] = parts;
            dueDate = `${y.length === 2 ? `20${y}` : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          }
        }

        const isOverdue = dueDate && dueDate < today;

        items.push({
          id: `ata-${doc.id}-${idx}`,
          origin: "meeting",
          originCode: `ATA ${ataNumber}`,
          originId: doc.id,
          description: cleaned.replace(/[—\-]\s*(?:Responsável|Resp\.?)\s*:[^—\-]*/i, "").replace(/[—\-]\s*(?:Prazo|Data)\s*:\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/i, "").trim(),
          type: "action",
          responsible,
          dueDate,
          status: isOverdue ? "overdue" : "open",
          createdAt: doc.created_at,
          linkedEntityUrl: `/documents/${doc.id}`,
        });
      });
    }

    // Sort: overdue first, then open, then by date
    const statusOrder: Record<string, number> = { overdue: 0, open: 1, in_progress: 2, closed: 3 };
    items.sort((a, b) => {
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return (b.dueDate ?? b.createdAt).localeCompare(a.dueDate ?? a.createdAt);
    });

    return items;
  },
};
