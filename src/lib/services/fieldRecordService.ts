import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export const POINT_TYPES = ["rp", "wp"] as const;
export type PointType = typeof POINT_TYPES[number];

export const WEATHER_OPTIONS = ["bom", "nublado", "chuva", "chuva_forte", "vento"] as const;
export type Weather = typeof WEATHER_OPTIONS[number];

export const GR_RESULTS = ["conforme", "conforme_obs", "nao_conforme", "pendente"] as const;
export type GrResult = typeof GR_RESULTS[number];

export const CHECK_RESULTS = ["ok", "nc", "na"] as const;
export type CheckResult = typeof CHECK_RESULTS[number];

export interface FieldRecord {
  id: string;
  project_id: string;
  code: string;
  ppi_instance_id: string | null;
  point_type: PointType;
  activity: string;
  location_pk: string | null;
  inspection_date: string;
  weather: Weather | null;
  inspector_id: string | null;
  specialist_name: string | null;
  result: GrResult;
  has_photos: boolean;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  ppi_code?: string | null;
}

export interface FieldRecordMaterial {
  id: string;
  record_id: string;
  material_name: string;
  fav_pame_ref: string | null;
  lot_ref: string | null;
  quantity: string | null;
}

export interface FieldRecordCheck {
  id: string;
  record_id: string;
  item_no: number;
  description: string;
  criteria: string | null;
  method: string | null;
  result: CheckResult;
  measured_value: string | null;
}

export interface FieldRecordInput {
  project_id: string;
  ppi_instance_id?: string | null;
  point_type: PointType;
  activity: string;
  location_pk?: string | null;
  inspection_date?: string;
  weather?: Weather | null;
  inspector_id?: string | null;
  specialist_name?: string | null;
  result?: GrResult;
  has_photos?: boolean;
  observations?: string | null;
  created_by?: string | null;
  materials?: Omit<FieldRecordMaterial, "id" | "record_id">[];
  checks?: Omit<FieldRecordCheck, "id" | "record_id">[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const fieldRecordService = {
  async create(input: FieldRecordInput): Promise<FieldRecord> {
    // Generate code
    const { data: codeData } = await supabase.rpc("fn_next_gr_code" as any, {
      p_project_id: input.project_id,
    });
    const code = (codeData as string) ?? `GR-${Date.now()}`;

    const { data, error } = await supabase
      .from("field_records" as any)
      .insert({
        project_id: input.project_id,
        code,
        ppi_instance_id: input.ppi_instance_id ?? null,
        point_type: input.point_type,
        activity: input.activity,
        location_pk: input.location_pk ?? null,
        inspection_date: input.inspection_date ?? new Date().toISOString().split("T")[0],
        weather: input.weather ?? "bom",
        inspector_id: input.inspector_id ?? null,
        specialist_name: input.specialist_name ?? null,
        result: input.result ?? "pendente",
        has_photos: input.has_photos ?? false,
        observations: input.observations ?? null,
        created_by: input.created_by ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    const record = data as unknown as FieldRecord;

    // Insert materials
    if (input.materials && input.materials.length > 0) {
      const { error: matErr } = await supabase
        .from("field_record_materials" as any)
        .insert(input.materials.map((m) => ({ ...m, record_id: record.id })));
      if (matErr) throw matErr;
    }

    // Insert checks
    if (input.checks && input.checks.length > 0) {
      const { error: chkErr } = await supabase
        .from("field_record_checks" as any)
        .insert(input.checks.map((c) => ({ ...c, record_id: record.id })));
      if (chkErr) throw chkErr;
    }

    return record;
  },

  async listByProject(projectId: string): Promise<FieldRecord[]> {
    const { data, error } = await supabase
      .from("field_records" as any)
      .select("*, ppi_instances(code)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as any[]).map((r) => ({
      ...r,
      ppi_code: r.ppi_instances?.code ?? null,
      ppi_instances: undefined,
    }));
  },

  async listByInstance(instanceId: string): Promise<FieldRecord[]> {
    const { data, error } = await supabase
      .from("field_records" as any)
      .select("*")
      .eq("ppi_instance_id", instanceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as FieldRecord[];
  },

  async getById(id: string): Promise<FieldRecord & { materials: FieldRecordMaterial[]; checks: FieldRecordCheck[] }> {
    const [{ data: rec, error: e1 }, { data: mats, error: e2 }, { data: chks, error: e3 }] = await Promise.all([
      supabase.from("field_records" as any).select("*").eq("id", id).single(),
      supabase.from("field_record_materials" as any).select("*").eq("record_id", id),
      supabase.from("field_record_checks" as any).select("*").eq("record_id", id).order("item_no"),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    return {
      ...(rec as unknown as FieldRecord),
      materials: (mats ?? []) as unknown as FieldRecordMaterial[],
      checks: (chks ?? []) as unknown as FieldRecordCheck[],
    };
  },

  exportPdf(record: FieldRecord & { materials?: FieldRecordMaterial[]; checks?: FieldRecordCheck[] }, projectName: string) {
    const w = window.open("", "_blank");
    if (!w) return;

    const resultLabel: Record<string, string> = {
      conforme: "CONFORME",
      conforme_obs: "CONFORME c/ Observações",
      nao_conforme: "NÃO CONFORME",
      pendente: "PENDENTE",
    };

    const checkResultLabel: Record<string, string> = { ok: "OK", nc: "NC", na: "N/A" };

    const materialsHtml = (record.materials ?? []).length > 0
      ? `<h3>2. Materiais Utilizados</h3>
         <table><thead><tr><th>Material</th><th>FAV/PAME</th><th>Lote</th><th>Qtd</th></tr></thead>
         <tbody>${(record.materials ?? []).map((m) => `<tr><td>${m.material_name}</td><td>${m.fav_pame_ref ?? "—"}</td><td>${m.lot_ref ?? "—"}</td><td>${m.quantity ?? "—"}</td></tr>`).join("")}</tbody></table>`
      : "";

    const checksHtml = (record.checks ?? []).length > 0
      ? `<h3>3. Verificações</h3>
         <table><thead><tr><th>#</th><th>Descrição</th><th>Critério</th><th>Método</th><th>Resultado</th><th>Valor</th></tr></thead>
         <tbody>${(record.checks ?? []).map((c) => `<tr><td>${c.item_no}</td><td>${c.description}</td><td>${c.criteria ?? "—"}</td><td>${c.method ?? "—"}</td><td>${checkResultLabel[c.result] ?? c.result}</td><td>${c.measured_value ?? "—"}</td></tr>`).join("")}</tbody></table>`
      : "";

    w.document.write(`<!DOCTYPE html><html><head><title>${record.code}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:30px;font-size:11px}
        h2{margin:0 0 4px;font-size:16px}
        h3{margin:18px 0 6px;font-size:12px;border-bottom:1px solid #ccc;padding-bottom:3px}
        table{width:100%;border-collapse:collapse;margin-top:6px}
        th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:10px}
        th{background:#f5f5f5;font-weight:600}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:12px}
        .result-box{margin-top:16px;padding:8px 12px;border:2px solid #333;font-size:13px;font-weight:700}
        .sig-row{display:flex;gap:40px;margin-top:40px}
        .sig-block{flex:1;border-top:1px solid #333;padding-top:4px;text-align:center;font-size:10px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px}
        .info-grid span{font-size:10px}
        .info-grid .label{font-weight:600;color:#555}
      </style>
    </head><body>
      <div class="header">
        <div><h2>ATLAS QMS</h2><p style="color:#777;margin:0">${projectName}</p></div>
        <div style="text-align:right"><h2 style="font-size:14px">${record.code}</h2><p style="margin:0;color:#777">Grelha de Registo</p></div>
      </div>
      <h3>1. Identificação</h3>
      <div class="info-grid">
        <span class="label">Data:</span><span>${record.inspection_date}</span>
        <span class="label">Tipo Ponto:</span><span>${record.point_type.toUpperCase()}</span>
        <span class="label">Actividade:</span><span>${record.activity}</span>
        <span class="label">PK:</span><span>${record.location_pk ?? "—"}</span>
        <span class="label">Meteorologia:</span><span>${record.weather ?? "—"}</span>
        <span class="label">Especialista:</span><span>${record.specialist_name ?? "—"}</span>
      </div>
      ${materialsHtml}
      ${checksHtml}
      <div class="result-box">Resultado: ${resultLabel[record.result] ?? record.result}</div>
      ${record.observations ? `<p style="margin-top:12px"><strong>Observações:</strong> ${record.observations}</p>` : ""}
      <div class="sig-row">
        <div class="sig-block">TQ — Técnico de Qualidade</div>
        <div class="sig-block">Especialista / Encarregado</div>
      </div>
    </body></html>`);
    w.document.close();
    w.print();
  },
};
