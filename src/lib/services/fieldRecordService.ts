import { supabase } from "@/integrations/supabase/client";
import { fullPdfHeader } from "./pdfProjectHeader";
import { resolveProjectLogoBase64 } from "./projectLogoResolver";

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
      .eq("is_deleted", false)
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
      .eq("is_deleted", false)
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

  async exportPdf(record: FieldRecord & { materials?: FieldRecordMaterial[]; checks?: FieldRecordCheck[] }, projectName: string, logoBase64?: string | null) {
    const w = window.open("", "_blank");
    if (!w) return;

    // Fallback: if logoBase64 wasn't provided by the caller (e.g. hook not ready),
    // fetch the active project's configured logo on-demand so the PDF always uses
    // the same brand image as the rest of the app.
    let resolvedLogo = logoBase64 ?? null;
    if (!resolvedLogo && record.project_id) {
      try { resolvedLogo = await resolveProjectLogoBase64(record.project_id); } catch { /* ignore */ }
    }

    const resultLabel: Record<string, string> = {
      conforme: "CONFORME",
      conforme_obs: "CONFORME c/ Observações",
      nao_conforme: "NÃO CONFORME",
      pendente: "PENDENTE",
    };

    const resultColor: Record<string, string> = {
      conforme: "#166534",
      conforme_obs: "#a16207",
      nao_conforme: "#dc2626",
      pendente: "#6b7280",
    };

    const checkResultIcon: Record<string, string> = { ok: "✓", nc: "✗", na: "N/A" };
    const checkResultColor: Record<string, string> = { ok: "#166534", nc: "#dc2626", na: "#6b7280" };

    const weatherIcon: Record<string, string> = {
      bom: "☀️", nublado: "☁️", chuva: "🌧️", chuva_forte: "⛈️", vento: "💨",
    };

    const pointBadge = (type: string) => {
      const colors: Record<string, string> = { rp: "#2563eb", wp: "#dc2626", hp: "#a16207" };
      const color = colors[type] ?? "#6b7280";
      return `<span style="display:inline-block;background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.06em">${type.toUpperCase()}</span>`;
    };

    const materialsHtml = (record.materials ?? []).length > 0
      ? `<h3>2. Materiais Utilizados</h3>
         <table><thead><tr><th>Material</th><th>FAV/PAME Ref.</th><th>Lote</th><th>Quantidade</th></tr></thead>
         <tbody>${(record.materials ?? []).map((m) => `<tr><td>${m.material_name}</td><td>${m.fav_pame_ref ?? "—"}</td><td>${m.lot_ref ?? "—"}</td><td>${m.quantity ?? "—"}</td></tr>`).join("")}</tbody></table>`
      : "";

    const checksHtml = (record.checks ?? []).length > 0
      ? `<h3>3. Verificações</h3>
         <table><thead><tr><th style="width:30px">#</th><th>Descrição</th><th>Critério</th><th>Método</th><th style="width:60px">Resultado</th><th>Valor Medido</th></tr></thead>
         <tbody>${(record.checks ?? []).map((c) => `<tr>
           <td>${c.item_no}</td>
           <td>${c.description}</td>
           <td>${c.criteria ?? "—"}</td>
           <td>${c.method ?? "—"}</td>
           <td style="text-align:center;font-weight:700;color:${checkResultColor[c.result] ?? "#333"}">${checkResultIcon[c.result] ?? c.result}</td>
           <td>${c.measured_value ?? "—"}</td>
         </tr>`).join("")}</tbody></table>`
      : "";

    const resColor = resultColor[record.result] ?? "#333";

    const headerHtml = fullPdfHeader(
      resolvedLogo,
      projectName,
      record.code,
      "0",
      new Date(record.inspection_date || Date.now()).toLocaleDateString("pt-PT"),
    );

    w.document.write(`<!DOCTYPE html><html><head><title>${record.code}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:14mm 12mm;font-size:11px;color:#1A1A1A}
        h2{margin:0 0 4px;font-size:16px}
        h3{margin:18px 0 6px;font-size:12px;border-bottom:1px solid #C4CBD4;padding-bottom:3px;text-transform:uppercase;letter-spacing:.08em;color:#192F48;font-weight:700}
        table{width:100%;border-collapse:collapse;margin-top:6px}
        th,td{border:1px solid #C4CBD4;padding:5px 8px;text-align:left;font-size:10px}
        th{background:#F1F3F5;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:.06em;color:#505A68}
        .result-box{margin-top:18px;padding:10px 16px;border:3px solid ${resColor};border-radius:6px;font-size:14px;font-weight:900;color:${resColor};text-align:center}
        .sig-row{display:flex;gap:40px;margin-top:50px}
        .sig-block{flex:1;text-align:center;font-size:10px}
        .sig-block .line{border-top:1px solid #333;margin-top:40px;padding-top:4px}
        .sig-block .role{font-weight:700;color:#505A68;margin-bottom:2px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
        .info-grid span{font-size:10px}
        .info-grid .label{font-weight:700;color:#505A68;text-transform:uppercase;font-size:8px;letter-spacing:.1em}
        .info-grid .value{font-size:11px;color:#1A1A1A}
        .photo-reg{margin-top:16px;font-size:10px;color:#505A68;border:1px solid #C4CBD4;padding:8px 12px;border-radius:4px}
        @page{size:A4 portrait;margin:14mm 12mm}
        @media print{.no-print{display:none!important}}
      </style>
    </head><body>
      ${headerHtml}

      <h3>1. Identificação</h3>
      <div class="info-grid">
        <div><span class="label">Data Inspecção</span><br/><span class="value">${record.inspection_date}</span></div>
        <div><span class="label">Tipo Ponto</span><br/>${pointBadge(record.point_type)}</div>
        <div><span class="label">Ref. PPI</span><br/><span class="value">${record.ppi_code ?? "—"}</span></div>
        <div><span class="label">Actividade</span><br/><span class="value">${record.activity}</span></div>
        <div><span class="label">PK / Localização</span><br/><span class="value">${record.location_pk ?? "—"}</span></div>
        <div><span class="label">Meteorologia</span><br/><span class="value">${weatherIcon[record.weather ?? ""] ?? ""} ${record.weather ?? "—"}</span></div>
        <div><span class="label">Técnico Qualidade (TQ)</span><br/><span class="value">${record.specialist_name ?? "—"}</span></div>
        <div><span class="label">Especialista / Encarregado</span><br/><span class="value">${record.specialist_name ?? "—"}</span></div>
      </div>

      ${materialsHtml}
      ${checksHtml}

      <div class="result-box">${resultLabel[record.result] ?? record.result}</div>
      ${record.observations ? `<p style="margin-top:12px;font-size:10px"><strong>Observações:</strong> ${record.observations}</p>` : ""}

      <div class="photo-reg">
        <strong>Registo Fotográfico:</strong>
        ${record.has_photos ? "Sim — n.º _____" : "N/A ☐"}
      </div>

      <div class="sig-row">
        <div class="sig-block">
          <div class="role">TQ — Técnico de Qualidade</div>
          <div>Nome: ______________________</div>
          <div>Data: ______________________</div>
          <div class="line">Assinatura</div>
        </div>
        <div class="sig-block">
          <div class="role">Resp. Especialidade / Encarregado</div>
          <div>Nome: ______________________</div>
          <div>Data: ______________________</div>
          <div class="line">Assinatura</div>
        </div>
      </div>

      <div style="margin-top:30px;padding-top:8px;border-top:1px solid #ccc;font-size:8px;color:#999;display:flex;justify-content:space-between">
        <span>Atlas QMS · ${projectName}</span>
        <span>${record.code}</span>
      </div>
    </body></html>`);
    w.document.close();
    w.print();
  },
};
