import { supabase } from "@/integrations/supabase/client";
import { documentService } from "./documentService";
import { auditService } from "./auditService";
import type { Document, DocumentStatus } from "./documentService";

// ── MAP/MAS Form Data stored in documents.form_data ──────────────
export interface MapMasFormData {
  material_id: string;
  supplier_id?: string;
  subcontractor_id?: string;
  work_item_id?: string;
  zone?: string;
  pk?: string;
  submission_type: "submissao" | "alternativa" | "mudanca_fonte" | "procedimento";
  normative_refs?: string;
  acceptance_criteria?: string;
  lot_ref?: string;
  observations?: string;
  deadline?: string;
  submitted_by?: string;
  reviewer_notes?: string;
  approver_notes?: string;
}

export interface MapMasDocument extends Document {
  form_data: MapMasFormData | null;
}

export const MAP_MAS_DOC_TYPE = "MAP/MAS";

export const mapMasService = {
  /** Get all MAP/MAS documents for a project */
  async getByProject(projectId: string, filters?: {
    status?: string;
    material_id?: string;
    supplier_id?: string;
    subcontractor_id?: string;
    work_item_id?: string;
  }): Promise<MapMasDocument[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("project_id", projectId)
      .eq("doc_type", MAP_MAS_DOC_TYPE)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) throw error;

    let results = (data ?? []) as unknown as MapMasDocument[];

    // Client-side filtering on form_data
    if (filters?.status && filters.status !== "all") {
      results = results.filter(d => d.status === filters.status);
    }
    if (filters?.material_id) {
      results = results.filter(d => (d.form_data as any)?.material_id === filters.material_id);
    }
    if (filters?.supplier_id) {
      results = results.filter(d => (d.form_data as any)?.supplier_id === filters.supplier_id);
    }
    if (filters?.subcontractor_id) {
      results = results.filter(d => (d.form_data as any)?.subcontractor_id === filters.subcontractor_id);
    }
    if (filters?.work_item_id) {
      results = results.filter(d => (d.form_data as any)?.work_item_id === filters.work_item_id);
    }
    return results;
  },

  /** Create MAP/MAS document */
  async create(projectId: string, title: string, formData: MapMasFormData): Promise<Document> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error("Not authenticated");

    // Create document via RPC
    const doc = await documentService.create({
      project_id: projectId,
      title,
      doc_type: MAP_MAS_DOC_TYPE,
      disciplina: "materiais",
      status: "draft",
      created_by: userId,
    });

    // Set form_data
    const { error: updateError } = await supabase
      .from("documents")
      .update({ form_data: formData as any })
      .eq("id", doc.id);
    if (updateError) throw updateError;

    // Create document_links for related entities
    const links: { type: string; id: string }[] = [];
    if (formData.material_id) links.push({ type: "material", id: formData.material_id });
    if (formData.supplier_id) links.push({ type: "supplier", id: formData.supplier_id });
    if (formData.subcontractor_id) links.push({ type: "subcontractor", id: formData.subcontractor_id });
    if (formData.work_item_id) links.push({ type: "work_item", id: formData.work_item_id });

    for (const link of links) {
      await documentService.addLink(doc.id, link.type, link.id).catch(() => null);
    }

    return { ...doc, form_data: formData } as unknown as Document;
  },

  /** Update MAP/MAS form_data (draft only) */
  async updateFormData(docId: string, projectId: string, formData: Partial<MapMasFormData>): Promise<void> {
    const doc = await documentService.getById(docId);
    if (doc.status !== "draft") throw new Error("Only draft documents can be edited");

    const merged = { ...(doc as any).form_data, ...formData };
    const { error } = await supabase
      .from("documents")
      .update({ form_data: merged as any })
      .eq("id", docId);
    if (error) throw error;

    await auditService.log({
      projectId,
      entity: "documents",
      entityId: docId,
      action: "UPDATE",
      module: "materials",
      description: "MAP/MAS form data updated",
      diff: formData as Record<string, unknown>,
    });
  },

  /** Submit MAP/MAS for review */
  async submit(docId: string, projectId: string): Promise<Document> {
    const result = await documentService.changeStatus(docId, projectId, "draft", "in_review");
    await auditService.log({
      projectId,
      entity: "documents",
      entityId: docId,
      action: "SUBMIT",
      module: "materials",
      description: "MAP/MAS submitted for review",
    });
    return result;
  },

  /** Approve MAP/MAS */
  async approve(docId: string, projectId: string, notes?: string): Promise<Document> {
    const result = await documentService.changeStatus(docId, projectId, "in_review", "approved");

    // Update approver notes if provided
    if (notes) {
      const doc = await documentService.getById(docId);
      const formData = { ...(doc as any).form_data, approver_notes: notes };
      await supabase.from("documents").update({ form_data: formData as any }).eq("id", docId);
    }

    await auditService.log({
      projectId,
      entity: "documents",
      entityId: docId,
      action: "APPROVE",
      module: "materials",
      description: "MAP/MAS approved",
      diff: notes ? { approver_notes: notes } : undefined,
    });

    // Link to material_documents if material_id exists
    const doc = await documentService.getById(docId);
    const fd = (doc as any).form_data as MapMasFormData | null;
    if (fd?.material_id) {
      await supabase
        .from("material_documents" as any)
        .insert({
          project_id: projectId,
          material_id: fd.material_id,
          document_id: docId,
          doc_type: "MAP/MAS",
        })
        .select()
        .maybeSingle(); // ignore if already linked
    }

    return result;
  },

  /** Reject MAP/MAS */
  async reject(docId: string, projectId: string, notes?: string): Promise<Document> {
    // Reject goes back to draft
    const result = await documentService.changeStatus(docId, projectId, "in_review", "draft");

    if (notes) {
      const doc = await documentService.getById(docId);
      const formData = { ...(doc as any).form_data, reviewer_notes: notes };
      await supabase.from("documents").update({ form_data: formData as any }).eq("id", docId);
    }

    await auditService.log({
      projectId,
      entity: "documents",
      entityId: docId,
      action: "REJECT",
      module: "materials",
      description: "MAP/MAS rejected",
      diff: notes ? { reviewer_notes: notes } : undefined,
    });

    return result;
  },

  /** Reopen a rejected MAP/MAS */
  async reopen(docId: string, projectId: string): Promise<Document> {
    const result = await documentService.changeStatus(docId, projectId, "draft", "in_review");
    await auditService.log({
      projectId,
      entity: "documents",
      entityId: docId,
      action: "REOPEN",
      module: "materials",
      description: "MAP/MAS reopened for review",
    });
    return result;
  },
};
