import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";
import { documentService } from "./documentService";

export interface Plan {
  id: string;
  project_id: string;
  created_by: string;
  plan_type: string;
  title: string;
  revision: string | null;
  status: string;
  file_url: string | null;
  document_id: string | null;
  code: string | null;
  discipline: string | null;
  responsible: string | null;
  approval_date: string | null;
  doc_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanInput {
  project_id: string;
  created_by: string;
  plan_type: string;
  title: string;
  revision?: string;
  status?: string;
  file_url?: string;
  code?: string;
  discipline?: string;
  responsible?: string;
  approval_date?: string;
  doc_reference?: string;
  notes?: string;
}

export const PLAN_STATUSES = ["draft", "under_review", "approved", "obsolete", "archived"] as const;
export type PlanStatus = typeof PLAN_STATUSES[number];

export const PLAN_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:        ["under_review", "archived"],
  under_review: ["approved", "draft", "archived"],
  approved:     ["obsolete", "archived"],
  obsolete:     ["archived"],
  archived:     ["draft"],
};

const BUCKET = "qms-files";

export const planService = {
  async getByProject(projectId: string): Promise<Plan[]> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Plan[];
  },

  async getById(id: string): Promise<Plan> {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Plan;
  },

  async create(input: PlanInput): Promise<Plan> {
    const { data, error } = await supabase
      .from("plans")
      .insert({
        project_id: input.project_id,
        created_by: input.created_by,
        plan_type: input.plan_type,
        title: input.title,
        revision: input.revision ?? "0",
        status: input.status ?? "draft",
        file_url: input.file_url ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId: input.project_id,
      entity: "plans",
      entityId: (data as Plan).id,
      action: "INSERT",
      module: "plans",
      description: `Plan created: ${input.title} (${input.plan_type})`,
      diff: { plan_type: input.plan_type, title: input.title, status: input.status ?? "draft" },
    });
    return data as Plan;
  },

  async update(
    id: string,
    projectId: string,
    updates: Partial<Omit<PlanInput, "project_id" | "created_by">>
  ): Promise<Plan> {
    const { data, error } = await supabase
      .from("plans")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "plans",
      entityId: id,
      action: "UPDATE",
      module: "plans",
      description: `Plan updated`,
      diff: updates as Record<string, unknown>,
    });
    return data as Plan;
  },

  async changeStatus(id: string, projectId: string, fromStatus: string, toStatus: string): Promise<Plan> {
    const allowed = PLAN_STATUS_TRANSITIONS[fromStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new Error(`Transição inválida: ${fromStatus} → ${toStatus}`);
    }
    const { data, error } = await supabase
      .from("plans")
      .update({ status: toStatus })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "plans",
      entityId: id,
      action: "STATUS_CHANGE",
      module: "plans",
      description: `Plan status: ${fromStatus} → ${toStatus}`,
      diff: { from: fromStatus, to: toStatus },
    });
    return data as Plan;
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId,
      entity: "plans",
      entityId: id,
      action: "DELETE",
      module: "plans",
    });
  },

  /**
   * Ensure a linked document exists for this plan.
   * Creates one if plan.document_id is null, links it via document_links.
   */
  async ensureDocument(plan: Plan): Promise<string> {
    if (plan.document_id) return plan.document_id;

    // Create a formal document for this plan
    const doc = await documentService.create({
      project_id: plan.project_id,
      title: plan.title,
      doc_type: "plan",
      disciplina: "geral",
      revision: plan.revision ?? "0",
      status: "draft",
      created_by: plan.created_by,
    });

    // Link document to plan
    await supabase
      .from("plans")
      .update({ document_id: doc.id })
      .eq("id", plan.id);

    // Create document_link
    await documentService.addLink(doc.id, "plan", plan.id);

    await auditService.log({
      projectId: plan.project_id,
      entity: "plans",
      entityId: plan.id,
      action: "UPDATE",
      module: "plans",
      description: `Linked document ${doc.id} to plan`,
      diff: { document_id: doc.id },
    });

    return doc.id;
  },

  /**
   * Upload a file version for a plan, creating the document if needed.
   */
  async uploadFile(
    plan: Plan,
    file: File,
    changeDescription?: string
  ): Promise<void> {
    const documentId = await this.ensureDocument(plan);

    await documentService.uploadFile(
      file,
      plan.project_id,
      documentId,
      plan.created_by,
      changeDescription
    );

    await auditService.log({
      projectId: plan.project_id,
      entity: "plans",
      entityId: plan.id,
      action: "UPDATE",
      module: "plans",
      description: `New file version uploaded: ${file.name}`,
      diff: { file_name: file.name, document_id: documentId },
    });
  },

  /** Get versions from the linked document */
  async getVersions(plan: Plan) {
    if (!plan.document_id) return [];
    return documentService.getVersions(plan.document_id);
  },

  /** Get signed URL for download */
  async getSignedUrl(storagePath: string, projectId: string, planId: string): Promise<string> {
    return documentService.getSignedUrl(storagePath, projectId, planId);
  },
};
