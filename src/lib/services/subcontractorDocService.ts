import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

export interface SubcontractorDocument {
  id: string;
  project_id: string;
  subcontractor_id: string;
  doc_type: string;
  title: string;
  document_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorDocInput {
  project_id: string;
  subcontractor_id: string;
  doc_type: string;
  title: string;
  document_id?: string;
  valid_from?: string;
  valid_to?: string;
  status?: string;
}

const DOC_TYPES = [
  { value: "seguro", label: "Seguro" },
  { value: "alvara", label: "Alvará" },
  { value: "formacao", label: "Formação" },
  { value: "certificacao", label: "Certificação" },
  { value: "contrato", label: "Contrato" },
  { value: "other", label: "Outro" },
];

export { DOC_TYPES };

export const subcontractorDocService = {
  async getBySubcontractor(subcontractorId: string): Promise<SubcontractorDocument[]> {
    const { data, error } = await supabase
      .from("subcontractor_documents")
      .select("*")
      .eq("subcontractor_id", subcontractorId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as SubcontractorDocument[];
  },

  async create(input: SubcontractorDocInput): Promise<SubcontractorDocument> {
    const { data, error } = await supabase
      .from("subcontractor_documents")
      .insert({
        project_id: input.project_id,
        subcontractor_id: input.subcontractor_id,
        doc_type: input.doc_type,
        title: input.title,
        document_id: input.document_id ?? null,
        valid_from: input.valid_from ?? null,
        valid_to: input.valid_to ?? null,
        status: input.status ?? "valid",
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "subcontractor_documents",
      entityId: (data as unknown as SubcontractorDocument).id,
      action: "INSERT",
      module: "subcontractors",
      diff: { doc_type: input.doc_type, title: input.title },
    });
    return data as unknown as SubcontractorDocument;
  },

  async update(id: string, projectId: string, updates: Partial<Omit<SubcontractorDocInput, "project_id" | "subcontractor_id">>): Promise<SubcontractorDocument> {
    const { data, error } = await supabase
      .from("subcontractor_documents")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "subcontractor_documents",
      entityId: id,
      action: "UPDATE",
      module: "subcontractors",
      diff: updates as Record<string, unknown>,
    });
    return data as unknown as SubcontractorDocument;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("subcontractor_documents")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "subcontractor_documents",
      entityId: id,
      action: "DELETE",
      module: "subcontractors",
    });
  },
};
