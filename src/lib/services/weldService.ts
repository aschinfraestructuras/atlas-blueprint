import { supabase } from "@/integrations/supabase/client";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import { fullPdfHeader } from "./pdfProjectHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeldRecord {
  id: string;
  project_id: string;
  code: string;
  work_item_id: string | null;
  ppi_instance_id: string | null;
  weld_date: string;
  pk_location: string;
  rail_profile: string;
  track_side: string | null;
  weld_type: string;
  operator_name: string | null;
  operator_cert_ref: string | null;
  portion_brand: string | null;
  portion_lot: string | null;
  mold_type: string | null;
  preheat_temp_c: number | null;
  preheat_duration_min: number | null;
  preheat_pass: boolean | null;
  visual_pass: boolean | null;
  visual_notes: string | null;
  excess_material_ok: boolean | null;
  alignment_mm: number | null;
  alignment_criteria: number;
  alignment_pass: boolean | null;
  has_ut: boolean;
  ut_operator: string | null;
  ut_equipment_code: string | null;
  ut_calibration_date: string | null;
  ut_result: string | null;
  ut_defect_desc: string | null;
  has_hardness: boolean;
  hv_rail_left: number | null;
  hv_rail_right: number | null;
  hv_weld_center: number | null;
  hv_criteria_min: number;
  hv_criteria_max: number;
  hv_pass: boolean | null;
  overall_result: string;
  rejection_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // FS fields
  wps_ref: string | null;
  preheat_equipment: string | null;
  post_weld_checks: any[] | null;
  // FUS fields
  us_equipment_serial: string | null;
  us_frequency_mhz: number | null;
  us_norm_class: string | null;
  us_inspection_zones: any[] | null;
}

export type WeldInput = Omit<WeldRecord, "id" | "code" | "created_at" | "updated_at" | "overall_result" | "alignment_pass" | "hv_pass">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAlignmentPass(alignment_mm: number | null, criteria: number): boolean | null {
  if (alignment_mm == null) return null;
  return alignment_mm <= criteria;
}

function computeHvPass(left: number | null, right: number | null, center: number | null, min: number, max: number): boolean | null {
  const vals = [left, right, center].filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return vals.every(v => v >= min && v <= max);
}

export function computeOverallResult(r: Partial<WeldRecord>): string {
  const alignOk = r.alignment_mm != null ? (r.alignment_mm <= (r.alignment_criteria ?? 0.5)) : null;
  const hvOk = r.has_hardness ? computeHvPass(r.hv_rail_left ?? null, r.hv_rail_right ?? null, r.hv_weld_center ?? null, r.hv_criteria_min ?? 260, r.hv_criteria_max ?? 380) : null;
  const utOk = r.has_ut ? (r.ut_result === "aceite") : null;

  const checks = [
    r.visual_pass,
    alignOk,
    ...(r.has_ut ? [utOk] : []),
    ...(r.has_hardness ? [hvOk] : []),
  ];

  if (checks.some(c => c === null || c === undefined)) return "pending";
  if (checks.every(c => c === true)) return "pass";
  return "fail";
}

// ─── Service ──────────────────────────────────────────────────────────────────

async function getNextCode(projectId: string): Promise<string> {
  const { data, error } = await supabase.rpc("fn_next_weld_code", { p_project_id: projectId });
  if (error) throw error;
  return data as string;
}

export const weldService = {
  async create(input: WeldInput) {
    const code = await getNextCode(input.project_id);
    const alignment_pass = computeAlignmentPass(input.alignment_mm ?? null, input.alignment_criteria ?? 0.5);
    const hv_pass = input.has_hardness
      ? computeHvPass(input.hv_rail_left ?? null, input.hv_rail_right ?? null, input.hv_weld_center ?? null, input.hv_criteria_min ?? 260, input.hv_criteria_max ?? 380)
      : null;
    const overall_result = computeOverallResult({ ...input, alignment_pass, hv_pass });

    const { data, error } = await supabase
      .from("weld_records")
      .insert({ ...input, code, alignment_pass, hv_pass, overall_result })
      .select()
      .single();
    if (error) throw error;
    return data as WeldRecord;
  },

  async listByProject(projectId: string) {
    const { data, error } = await supabase
      .from("weld_records")
      .select("*")
      .eq("project_id", projectId)
      .order("weld_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WeldRecord[];
  },

  async listByWorkItem(workItemId: string) {
    const { data, error } = await supabase
      .from("weld_records")
      .select("*")
      .eq("work_item_id", workItemId)
      .order("weld_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WeldRecord[];
  },

  async listByPpi(ppiInstanceId: string) {
    const { data, error } = await supabase
      .from("weld_records")
      .select("*")
      .eq("ppi_instance_id", ppiInstanceId)
      .order("weld_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as WeldRecord[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from("weld_records")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as WeldRecord;
  },

  async update(id: string, updates: Partial<WeldRecord>) {
    const current = await this.getById(id);
    const merged = { ...current, ...updates };
    const alignment_pass = computeAlignmentPass(merged.alignment_mm, merged.alignment_criteria ?? 0.5);
    const hv_pass = merged.has_hardness
      ? computeHvPass(merged.hv_rail_left, merged.hv_rail_right, merged.hv_weld_center, merged.hv_criteria_min ?? 260, merged.hv_criteria_max ?? 380)
      : null;
    const overall_result = computeOverallResult({ ...merged, alignment_pass, hv_pass });

    const { data, error } = await supabase
      .from("weld_records")
      .update({ ...updates, alignment_pass, hv_pass, overall_result, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as WeldRecord;
  },

  async remove(id: string) {
    const { error } = await supabase.from("weld_records").delete().eq("id", id);
    if (error) throw error;
  },

  async exportPdfWithSignatures(record: WeldRecord, projectName: string, logoBase64?: string | null, signatureSlots?: import("./signatureService").SignatureSlot[] | null) {
    const { signatureBlockHtml } = await import("./signatureService");
    this._exportPdfInternal(record, projectName, logoBase64, signatureSlots ? signatureBlockHtml(signatureSlots) : null);
  }

  exportPdf(record: WeldRecord, projectName: string, logoBase64?: string | null) {
    const passBadge = (v: boolean | null | undefined, passLabel = "OK", failLabel = "NC") =>
      v === true
        ? `<span style="color:${ATLAS_PDF.colors.ok_fg};font-weight:700">${passLabel}</span>`
        : v === false
          ? `<span style="color:${ATLAS_PDF.colors.nc_fg};font-weight:700">${failLabel}</span>`
          : `<span style="color:#999">—</span>`;

    const resultMap: Record<string, { label: string; color: string }> = {
      pass: { label: "ACEITE", color: ATLAS_PDF.colors.ok_fg },
      fail: { label: "REJEITADA", color: ATLAS_PDF.colors.nc_fg },
      repair_needed: { label: "REPARAÇÃO NECESSÁRIA", color: "#e67e22" },
      pending: { label: "PENDENTE", color: "#999" },
    };
    const res = resultMap[record.overall_result] ?? resultMap.pending;

    const today = new Date().toLocaleDateString("pt-PT");
    const header = fullPdfHeader(logoBase64 ?? null, projectName, record.code, "0", today);

    const html = `<html><head><style>
      body{font-family:Arial,sans-serif;font-size:11px;color:${ATLAS_PDF.colors.navy};margin:20px 30px}
      h2{font-size:14px;margin:18px 0 8px;border-bottom:2px solid ${ATLAS_PDF.colors.navym};padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:14px}
      th,td{border:1px solid #ccc;padding:5px 8px;text-align:left;font-size:10px}
      th{background:#f0f0f0;font-weight:700}
      .result-box{text-align:center;padding:16px;margin:20px 0;border:3px solid ${res.color};border-radius:8px}
      .result-box span{font-size:20px;font-weight:900;color:${res.color}}
      .sig-row{display:flex;justify-content:space-between;margin-top:40px}
      .sig-block{width:45%;text-align:center;border-top:1px solid #333;padding-top:6px;font-size:10px}
    </style></head><body>
      ${header}
      <h2>1. Identificação da Soldadura</h2>
      <table>
        <tr><th>Código</th><td>${record.code}</td><th>Data</th><td>${record.weld_date}</td></tr>
        <tr><th>PK</th><td>${record.pk_location}</td><th>Perfil</th><td>${record.rail_profile}</td></tr>
        <tr><th>Lado</th><td>${record.track_side ?? "—"}</td><th>Tipo</th><td>${record.weld_type}</td></tr>
        <tr><th>Operador</th><td>${record.operator_name ?? "—"}</td><th>Cert.</th><td>${record.operator_cert_ref ?? "—"}</td></tr>
      </table>
      <h2>2. Materiais</h2>
      <table>
        <tr><th>Marca porção</th><td>${record.portion_brand ?? "—"}</td><th>Lote</th><td>${record.portion_lot ?? "—"}</td></tr>
        <tr><th>Molde</th><td colspan="3">${record.mold_type ?? "—"}</td></tr>
      </table>
      <h2>3. Pré-aquecimento</h2>
      <table>
        <tr><th>Temperatura (°C)</th><td>${record.preheat_temp_c ?? "—"}</td><th>Duração (min)</th><td>${record.preheat_duration_min ?? "—"}</td><th>Resultado</th><td>${passBadge(record.preheat_pass)}</td></tr>
      </table>
      <h2>4. Inspecção Visual e Dimensional</h2>
      <table>
        <tr><th>Visual</th><td>${passBadge(record.visual_pass)}</td><th>Excesso material</th><td>${passBadge(record.excess_material_ok)}</td></tr>
        <tr><th>Desalinhamento (mm)</th><td>${record.alignment_mm ?? "—"}</td><th>Critério ≤</th><td>${record.alignment_criteria} mm</td><th>Resultado</th><td>${passBadge(record.alignment_pass)}</td></tr>
      </table>
      ${record.visual_notes ? `<p><em>Notas: ${record.visual_notes}</em></p>` : ""}
      ${record.has_ut ? `
      <h2>5. Ensaio Ultrassónico (UT)</h2>
      <table>
        <tr><th>Operador UT</th><td>${record.ut_operator ?? "—"}</td><th>Equipamento</th><td>${record.ut_equipment_code ?? "—"}</td></tr>
        <tr><th>Data calibração</th><td>${record.ut_calibration_date ?? "—"}</td><th>Resultado</th><td><strong>${(record.ut_result ?? "pendente").toUpperCase()}</strong></td></tr>
      </table>
      ${record.ut_defect_desc ? `<p><em>Defeito: ${record.ut_defect_desc}</em></p>` : ""}
      ` : ""}
      ${record.has_hardness ? `
      <h2>${record.has_ut ? "6" : "5"}. Dureza (HV)</h2>
      <table>
        <tr><th>HV Esq.</th><td>${record.hv_rail_left ?? "—"}</td><th>HV Centro</th><td>${record.hv_weld_center ?? "—"}</td><th>HV Dir.</th><td>${record.hv_rail_right ?? "—"}</td></tr>
        <tr><th>Critério</th><td colspan="3">${record.hv_criteria_min}–${record.hv_criteria_max} HV</td><th>Resultado</th><td>${passBadge(record.hv_pass)}</td></tr>
      </table>
      ` : ""}
      <div class="result-box"><span>${res.label}</span></div>
      <div class="sig-row">
        <div class="sig-block">Operador Soldador</div>
        <div class="sig-block">Técnico de Qualidade</div>
      </div>
      <div style="text-align:center;margin-top:30px;font-size:9px;color:#999">
        Atlas QMS · ${record.code} · EN 14730
      </div>
    </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  },
};
