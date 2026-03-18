/**
 * Meeting Actions Service
 * Extracts structured actions from ATA-Q meeting minutes (documents with doc_type='record'
 * and form_data containing ATA-Q fields) and creates corresponding deadline entries
 * via the technical_office_items table (which feeds vw_deadlines).
 */
import { supabase } from "@/integrations/supabase/client";

export interface MeetingAction {
  id: string;
  document_id: string;
  ata_number: string;
  meeting_date: string;
  action_text: string;
  responsible: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "done";
  linked_entity_id: string | null;
  linked_entity_type: string | null;
}

/**
 * Parse the "decisoes" field from ATA-Q form_data.
 * Expected format per line: "1. Decision text — Responsável: X — Prazo: dd/mm/yyyy"
 */
function parseDecisions(decisoesText: string): Array<{ text: string; responsible: string | null; due_date: string | null }> {
  if (!decisoesText) return [];

  return decisoesText.split("\n").filter(line => line.trim()).map(line => {
    const cleaned = line.replace(/^\d+\.\s*/, "").trim();

    // Extract responsible
    let responsible: string | null = null;
    const respMatch = cleaned.match(/[—\-]\s*(?:Responsável|Responsable|Resp\.?)\s*:\s*([^—\-]+)/i);
    if (respMatch) responsible = respMatch[1].trim();

    // Extract date
    let due_date: string | null = null;
    const dateMatch = cleaned.match(/[—\-]\s*(?:Prazo|Plazo|Data)\s*:\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    if (dateMatch) {
      const parts = dateMatch[1].split(/[\/\-]/);
      if (parts.length === 3) {
        const [d, m, y] = parts;
        const year = y.length === 2 ? `20${y}` : y;
        due_date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
    }

    // Clean text (remove the extracted parts)
    let text = cleaned
      .replace(/[—\-]\s*(?:Responsável|Responsable|Resp\.?)\s*:[^—\-]*/i, "")
      .replace(/[—\-]\s*(?:Prazo|Plazo|Data)\s*:\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/i, "")
      .trim()
      .replace(/[—\-]\s*$/, "")
      .trim();

    return { text: text || cleaned, responsible, due_date };
  }).filter(d => d.text.length > 2);
}

export const meetingActionsService = {
  /**
   * Get all ATA-Q documents for a project with their parsed actions.
   */
  async getAll(projectId: string): Promise<MeetingAction[]> {
    const { data: docs, error } = await (supabase as any)
      .from("documents")
      .select("id, form_data, title, created_at")
      .eq("project_id", projectId)
      .eq("doc_type", "record")
      .eq("is_deleted", false)
      .not("form_data", "is", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const actions: MeetingAction[] = [];

    for (const doc of (docs ?? [])) {
      const fd = doc.form_data as Record<string, string> | null;
      if (!fd) continue;

      // Only process ATA-Q documents (have numero_ata or data_reuniao fields)
      if (!fd.numero_ata && !fd.data_reuniao) continue;

      const ataNumber = fd.numero_ata ?? "";
      const meetingDate = fd.data_reuniao ?? doc.created_at?.split("T")[0] ?? "";
      const decisoesText = fd.decisoes ?? "";

      const parsed = parseDecisions(decisoesText);
      parsed.forEach((p, idx) => {
        actions.push({
          id: `${doc.id}-action-${idx}`,
          document_id: doc.id,
          ata_number: ataNumber,
          meeting_date: meetingDate,
          action_text: p.text,
          responsible: p.responsible,
          due_date: p.due_date,
          status: "pending",
          linked_entity_id: null,
          linked_entity_type: null,
        });
      });
    }

    return actions;
  },

  /**
   * Create a technical office item (deadline-trackable) from a meeting action.
   */
  async createDeadlineFromAction(
    projectId: string,
    action: MeetingAction,
  ): Promise<void> {
    const { error } = await (supabase as any)
      .from("technical_office_items")
      .insert({
        project_id: projectId,
        title: `[ATA] ${action.ata_number}: ${action.action_text.slice(0, 200)}`,
        item_type: "action",
        status: "open",
        priority: "medium",
        responsible: action.responsible,
        due_date: action.due_date,
        notes: `Ação extraída da Ata ${action.ata_number} (${action.meeting_date}). Documento: ${action.document_id}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

    if (error) throw error;
  },
};
