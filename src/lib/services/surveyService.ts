import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface SurveyRecord {
  id: string;
  project_id: string;
  created_by: string;
  area_or_pk: string;
  description: string | null;
  date: string;
  status: string;      // pending | validated | rejected
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyRecordInput {
  project_id: string;
  created_by: string;
  area_or_pk: string;
  description?: string;
  date?: string;
  status?: string;
  file_url?: string;
}

export const surveyService = {
  async getByProject(projectId: string): Promise<SurveyRecord[]> {
    const { data, error } = await supabase
      .from("survey_records")
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: false });
    if (error) throw error;
    return data as SurveyRecord[];
  },

  async create(input: SurveyRecordInput): Promise<SurveyRecord> {
    const { data, error } = await supabase
      .from("survey_records")
      .insert({
        project_id: input.project_id,
        created_by: input.created_by,
        area_or_pk: input.area_or_pk,
        description: input.description ?? null,
        date: input.date ?? new Date().toISOString().split("T")[0],
        status: input.status ?? "pending",
        file_url: input.file_url ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "survey_records",
      entityId: (data as SurveyRecord).id,
      action: "INSERT",
      module: "survey",
      diff: { area_or_pk: input.area_or_pk, date: input.date, status: input.status ?? "pending" },
    });
    return data as SurveyRecord;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<SurveyRecordInput, "project_id" | "created_by">>
  ): Promise<SurveyRecord> {
    const { data, error } = await supabase
      .from("survey_records")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "survey_records",
      entityId: id,
      action: "UPDATE",
      module: "survey",
      diff: updates as Record<string, unknown>,
    });
    return data as SurveyRecord;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("survey_records")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "survey_records",
      entityId: id,
      action: "DELETE",
      module: "survey",
    });
  },
};
