import { supabase } from "@/integrations/supabase/client";
import { auditService } from "./auditService";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NonConformity {
  id: string;
  project_id: string;
  // Identificação
  code: string | null;
  reference: string | null;
  title: string | null;
  description: string;
  // Classificação
  severity: string;           // minor | major | critical  (+ legado: low/medium/high)
  category: string;           // qualidade | segurança | ambiente | producao | outros
  category_outro: string | null;
  origin: string;             // manual | ppi | test | document | audit
  // Estado e datas
  status: string;             // draft | open | in_progress | pending_verification | closed | archived
  detected_at: string | null;
  due_date: string | null;
  closure_date: string | null;
  // Responsáveis
  responsible: string | null;
  assigned_to: string | null;
  owner: string | null;
  approver: string | null;
  // CAPA
  correction: string | null;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  verification_method: string | null;
  verification_result: string | null;
  verified_by: string | null;
  verified_at: string | null;
  // Ligações opcionais
  work_item_id: string | null;
  ppi_instance_id: string | null;
  ppi_instance_item_id: string | null;
  test_result_id: string | null;
  document_id: string | null;
  supplier_id: string | null;
  subcontractor_id: string | null;
  // Legado (origin_entity_*)
  origin_entity_id: string | null;
  origin_entity_type: string | null;
  // Metadados
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NCCreateInput {
  project_id: string;
  title: string;
  description: string;
  severity?: string;
  category?: string;
  category_outro?: string;
  origin?: string;
  reference?: string;
  responsible?: string;
  assigned_to?: string;
  due_date?: string;
  detected_at?: string;
  work_item_id?: string;
  ppi_instance_id?: string;
  ppi_instance_item_id?: string;
  test_result_id?: string;
  document_id?: string;
  supplier_id?: string;
  subcontractor_id?: string;
}

export interface NCUpdateInput {
  title?: string;
  description?: string;
  severity?: string;
  category?: string;
  category_outro?: string;
  origin?: string;
  reference?: string;
  responsible?: string;
  assigned_to?: string;
  due_date?: string;
  detected_at?: string;
  // CAPA
  correction?: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  verification_method?: string;
  verification_result?: string;
  // Ligações
  work_item_id?: string;
  ppi_instance_id?: string;
  test_result_id?: string;
  document_id?: string;
  supplier_id?: string;
  subcontractor_id?: string;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────

export const ncService = {

  async getByProject(projectId: string, includeDeleted = false): Promise<NonConformity[]> {
    let q = supabase
      .from("non_conformities")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (!includeDeleted) q = q.eq("is_deleted", false);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as NonConformity[];
  },

  /** Server-side paginated query with filters */
  async getByProjectPaginated(
    projectId: string,
    options: {
      from: number;
      to: number;
      status?: string;
      severity?: string;
      search?: string;
    },
  ): Promise<{ data: NonConformity[]; count: number }> {
    let q = supabase
      .from("non_conformities")
      .select("*", { count: "exact" })
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(options.from, options.to);

    if (options.status && options.status !== "all") q = q.eq("status", options.status);
    if (options.severity && options.severity !== "all") q = q.eq("severity", options.severity);
    if (options.search) q = q.or(`title.ilike.%${options.search}%,code.ilike.%${options.search}%,description.ilike.%${options.search}%`);

    const { data, error, count } = await q;
    if (error) throw error;
    return { data: (data ?? []) as unknown as NonConformity[], count: count ?? 0 };
  },

  async getById(id: string): Promise<NonConformity | null> {
    const { data, error } = await supabase
      .from("non_conformities")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as NonConformity | null;
  },

  /** Cria NC via RPC (gera código automático NC-<PROJ>-<YYYY>-<SEQ>) */
  async create(input: NCCreateInput): Promise<NonConformity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("fn_create_nc", {
      p_project_id:           input.project_id,
      p_title:                input.title,
      p_description:          input.description,
      p_severity:             input.severity ?? "major",
      p_category:             input.category ?? "qualidade",
      p_category_outro:       input.category_outro ?? null,
      p_origin:               input.origin ?? "manual",
      p_reference:            input.reference ?? null,
      p_responsible:          input.responsible ?? null,
      p_assigned_to:          input.assigned_to ?? null,
      p_due_date:             input.due_date ?? null,
      p_detected_at:          input.detected_at ?? null,
      p_work_item_id:         input.work_item_id ?? null,
      p_ppi_instance_id:      input.ppi_instance_id ?? null,
      p_ppi_instance_item_id: input.ppi_instance_item_id ?? null,
      p_test_result_id:       input.test_result_id ?? null,
      p_document_id:          input.document_id ?? null,
      p_supplier_id:          input.supplier_id ?? null,
      p_subcontractor_id:     input.subcontractor_id ?? null,
    });
    if (error) throw error;
    return data as NonConformity;
  },

  /** Actualiza campos CAPA e metadados (sem transição de estado) */
  async update(
    id: string,
    projectId: string,
    updates: NCUpdateInput,
    prevStatus?: string
  ): Promise<NonConformity> {
    const payload: Record<string, unknown> = { ...updates };

    // Limpar strings vazias → null
    for (const key of Object.keys(payload)) {
      if (payload[key] === "") payload[key] = null;
    }

    const { data, error } = await supabase
      .from("non_conformities")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    let description: string | undefined;
    const up = updates as Record<string, unknown>;
    if (up.status && prevStatus && up.status !== prevStatus) {
      description = `NC status: ${prevStatus} → ${up.status}`;
    }

    await auditService.log({
      projectId,
      entity: "non_conformities",
      entityId: id,
      action: "UPDATE",
      module: "non_conformities",
      description,
      diff: updates as Record<string, unknown>,
    });
    return data as unknown as NonConformity;
  },

  /** Transição de estado validada via RPC */
  async updateStatus(id: string, toStatus: string): Promise<NonConformity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("fn_update_nc_status", {
      p_nc_id: id,
      p_to_status: toStatus,
    });
    if (error) throw error;
    return data as NonConformity;
  },

  /** Criar NC a partir de item PPI NOK */
  async createFromPpiItem(
    ppiInstanceItemId: string,
    opts?: { severity?: string; responsible?: string; due_date?: string }
  ): Promise<NonConformity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("fn_create_nc_from_ppi_item", {
      p_ppi_instance_item_id: ppiInstanceItemId,
      p_severity:   opts?.severity ?? "major",
      p_responsible: opts?.responsible ?? null,
      p_due_date:   opts?.due_date ?? null,
    });
    if (error) throw error;
    return data as NonConformity;
  },

  /** Criar NC a partir de ensaio fail */
  async createFromTest(
    testResultId: string,
    opts?: { severity?: string; responsible?: string; due_date?: string }
  ): Promise<NonConformity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("fn_create_nc_from_test", {
      p_test_result_id: testResultId,
      p_severity:   opts?.severity ?? "major",
      p_responsible: opts?.responsible ?? null,
      p_due_date:   opts?.due_date ?? null,
    });
    if (error) throw error;
    return data as NonConformity;
  },

  async getOpenCount(projectId: string): Promise<number> {
    const { count, error } = await supabase
      .from("non_conformities")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("is_deleted", false)
      .neq("status", "closed")
      .neq("status", "archived");
    if (error) throw error;
    return count ?? 0;
  },

  async softDelete(id: string, projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("non_conformities")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null } as any)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "non_conformities", entityId: id,
      action: "DELETE", module: "non_conformities",
      description: "NC eliminada (soft)",
    });
  },

  async restore(id: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from("non_conformities")
      .update({ is_deleted: false, deleted_at: null, deleted_by: null } as any)
      .eq("id", id);
    if (error) throw error;
    await auditService.log({
      projectId, entity: "non_conformities", entityId: id,
      action: "UPDATE", module: "non_conformities",
      description: "NC restaurada",
    });
  },
};
