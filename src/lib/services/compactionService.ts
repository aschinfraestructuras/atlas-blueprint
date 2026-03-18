import { supabase } from "@/integrations/supabase/client";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import { projectInfoStripHtml } from "./pdfProjectHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompactionZone {
  id: string;
  project_id: string;
  code: string;
  work_item_id: string | null;
  ppi_instance_id: string | null;
  zone_description: string;
  pk_start: string | null;
  pk_end: string | null;
  layer_no: number | null;
  material_type: string | null;
  material_ref: string | null;
  test_date: string;
  proctor_gamma_max: number | null;
  proctor_wopt: number | null;
  compaction_criteria: number;
  ev2_criteria: number;
  ev2_ev1_criteria: number;
  overall_result: string;
  technician_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NuclearPoint {
  id: string;
  zone_id: string;
  project_id: string;
  point_no: number;
  pk_point: string | null;
  depth_cm: number | null;
  gamma_dry_measured: number;
  water_content: number | null;
  compaction_degree: number | null;
  eme_code: string | null;
  eme_calibration_date: string | null;
  pass_fail: string;
  notes: string | null;
  created_at: string;
}

export interface PlateTest {
  id: string;
  zone_id: string;
  project_id: string;
  point_no: number;
  pk_point: string | null;
  ev1_mpa: number | null;
  ev2_mpa: number | null;
  ev2_ev1_ratio: number | null;
  pass_fail: string;
  notes: string | null;
  created_at: string;
}

export type CompactionZoneWithCounts = CompactionZone & {
  nuclear_count: number;
  plate_count: number;
};

export interface CreateZoneInput {
  project_id: string;
  work_item_id?: string | null;
  ppi_instance_id?: string | null;
  zone_description: string;
  pk_start?: string | null;
  pk_end?: string | null;
  layer_no?: number | null;
  material_type?: string | null;
  material_ref?: string | null;
  test_date?: string;
  proctor_gamma_max?: number | null;
  proctor_wopt?: number | null;
  compaction_criteria?: number;
  ev2_criteria?: number;
  ev2_ev1_criteria?: number;
  technician_name?: string | null;
  notes?: string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const compactionService = {
  async create(input: CreateZoneInput): Promise<CompactionZone> {
    const { data: code } = await supabase.rpc("fn_next_compaction_code", {
      p_project_id: input.project_id,
    });

    const { data, error } = await supabase
      .from("compaction_zones" as any)
      .insert({ ...input, code: code ?? "CMP-ERR" })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async listByProject(projectId: string): Promise<CompactionZoneWithCounts[]> {
    const { data: zones, error } = await supabase
      .from("compaction_zones" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("test_date", { ascending: false });

    if (error) throw error;
    if (!zones || (zones as any[]).length === 0) return [];

    const ids = (zones as any[]).map((z: any) => z.id);

    const [{ data: nuclear }, { data: plates }] = await Promise.all([
      supabase.from("compaction_nuclear_points" as any).select("zone_id").in("zone_id", ids),
      supabase.from("compaction_plate_tests" as any).select("zone_id").in("zone_id", ids),
    ]);

    const nuclearCounts = new Map<string, number>();
    ((nuclear ?? []) as any[]).forEach((n: any) => nuclearCounts.set(n.zone_id, (nuclearCounts.get(n.zone_id) ?? 0) + 1));

    const plateCounts = new Map<string, number>();
    ((plates ?? []) as any[]).forEach((p: any) => plateCounts.set(p.zone_id, (plateCounts.get(p.zone_id) ?? 0) + 1));

    return (zones as any[]).map((z: any) => ({
      ...z,
      nuclear_count: nuclearCounts.get(z.id) ?? 0,
      plate_count: plateCounts.get(z.id) ?? 0,
    }));
  },

  async listByWorkItem(workItemId: string): Promise<CompactionZoneWithCounts[]> {
    const { data: zones, error } = await supabase
      .from("compaction_zones" as any)
      .select("*")
      .eq("work_item_id", workItemId)
      .order("test_date", { ascending: false });

    if (error) throw error;
    return (zones ?? []).map((z: any) => ({ ...z, nuclear_count: 0, plate_count: 0 }));
  },

  async listByPpi(ppiInstanceId: string): Promise<CompactionZoneWithCounts[]> {
    const { data: zones, error } = await supabase
      .from("compaction_zones" as any)
      .select("*")
      .eq("ppi_instance_id", ppiInstanceId)
      .order("test_date", { ascending: false });

    if (error) throw error;
    return (zones ?? []).map((z: any) => ({ ...z, nuclear_count: 0, plate_count: 0 }));
  },

  async getById(id: string): Promise<{ zone: CompactionZone; nuclear: NuclearPoint[]; plates: PlateTest[] } | null> {
    const { data: zone, error } = await supabase
      .from("compaction_zones" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !zone) return null;

    const [{ data: nuclear }, { data: plates }] = await Promise.all([
      supabase.from("compaction_nuclear_points" as any).select("*").eq("zone_id", id).order("point_no"),
      supabase.from("compaction_plate_tests" as any).select("*").eq("zone_id", id).order("point_no"),
    ]);

    return { zone: zone as any, nuclear: (nuclear ?? []) as any[], plates: (plates ?? []) as any[] };
  },

  async updateZone(id: string, data: Partial<CompactionZone>): Promise<void> {
    const { error } = await supabase.from("compaction_zones" as any).update(data as any).eq("id", id);
    if (error) throw error;
  },

  async addNuclearPoint(
    zoneId: string,
    projectId: string,
    proctorGammaMax: number,
    criteria: number,
    data: Omit<NuclearPoint, "id" | "zone_id" | "project_id" | "compaction_degree" | "pass_fail" | "created_at">,
  ): Promise<NuclearPoint> {
    const degree = proctorGammaMax > 0
      ? Math.round((data.gamma_dry_measured / proctorGammaMax) * 100 * 100) / 100
      : null;
    const pass_fail = degree != null ? (degree >= criteria ? "pass" : "fail") : "pending";

    const { data: result, error } = await supabase
      .from("compaction_nuclear_points" as any)
      .insert({ ...data, zone_id: zoneId, project_id: projectId, compaction_degree: degree, pass_fail } as any)
      .select()
      .single();

    if (error) throw error;
    return result as any;
  },

  async addPlateTest(
    zoneId: string,
    projectId: string,
    ev2Criteria: number,
    ev2Ev1Criteria: number,
    data: Omit<PlateTest, "id" | "zone_id" | "project_id" | "ev2_ev1_ratio" | "pass_fail" | "created_at">,
  ): Promise<PlateTest> {
    const ratio = data.ev1_mpa && data.ev1_mpa > 0 && data.ev2_mpa != null
      ? Math.round((data.ev2_mpa / data.ev1_mpa) * 100) / 100
      : null;
    const ev2Pass = data.ev2_mpa != null ? data.ev2_mpa >= ev2Criteria : true;
    const ratioPass = ratio != null ? ratio <= ev2Ev1Criteria : true;
    const pass_fail = data.ev2_mpa != null ? (ev2Pass && ratioPass ? "pass" : "fail") : "pending";

    const { data: result, error } = await supabase
      .from("compaction_plate_tests" as any)
      .insert({ ...data, zone_id: zoneId, project_id: projectId, pass_fail } as any)
      .select()
      .single();

    if (error) throw error;
    return result as any;
  },

  computeZoneResult(nuclear: NuclearPoint[], plates: PlateTest[]): "pass" | "fail" | "pending" {
    const allPoints = [...nuclear, ...plates];
    if (allPoints.length === 0) return "pending";
    if (allPoints.some((p) => p.pass_fail === "pending")) return "pending";
    return allPoints.every((p) => p.pass_fail === "pass") ? "pass" : "fail";
  },

  async deleteZone(id: string): Promise<void> {
    const { error } = await supabase.from("compaction_zones" as any).delete().eq("id", id);
    if (error) throw error;
  },

  exportPdf(zone: CompactionZone, nuclear: NuclearPoint[], plates: PlateTest[], projectName: string, logoBase64?: string | null): void {
    const overall = compactionService.computeZoneResult(nuclear, plates);
    const isPass = overall === "pass";

    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" style="height:45px;max-width:150px;object-fit:contain;" />`
      : "";

    const nuclearRows = nuclear.map((n) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${n.point_no}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${n.pk_point ?? "—"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${n.gamma_dry_measured}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${n.water_content ?? "—"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};font-weight:600;">${n.compaction_degree ?? "—"}%</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">≥ ${zone.compaction_criteria}%</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};"><span class="badge ${n.pass_fail === "pass" ? "pass" : "fail"}">${n.pass_fail === "pass" ? "OK" : "NOK"}</span></td>
      </tr>`).join("");

    const plateRows = plates.map((p) => `
      <tr>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${p.point_no}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${p.pk_point ?? "—"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${p.ev1_mpa ?? "—"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${p.ev2_mpa ?? "—"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};font-weight:600;">${p.ev2_ev1_ratio ?? "—"}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">≤ ${zone.ev2_ev1_criteria}</td>
        <td style="padding:5px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};"><span class="badge ${p.pass_fail === "pass" ? "pass" : "fail"}">${p.pass_fail === "pass" ? "OK" : "NOK"}</span></td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${zone.code}</title>
      <style>body{font-family:${ATLAS_PDF.fonts.base};font-size:${ATLAS_PDF.fonts.sizes.body}pt;color:${ATLAS_PDF.colors.ink};margin:20px;}
      h2{color:${ATLAS_PDF.colors.navy};font-size:${ATLAS_PDF.fonts.sizes.h1}pt;}
      h3{color:${ATLAS_PDF.colors.navym};font-size:${ATLAS_PDF.fonts.sizes.h2}pt;margin:12px 0 6px;}
      table{width:100%;border-collapse:collapse;}
      th{background:${ATLAS_PDF.colors.navy};color:${ATLAS_PDF.colors.white};padding:5px 8px;text-align:left;font-size:${ATLAS_PDF.fonts.sizes.small}pt;text-transform:uppercase;}
      .badge{display:inline-block;padding:2px 8px;border-radius:3px;font-weight:600;font-size:8pt;}
      .pass{background:${ATLAS_PDF.colors.ok_bg};color:${ATLAS_PDF.colors.ok_fg};}
      .fail{background:${ATLAS_PDF.colors.nc_bg};color:${ATLAS_PDF.colors.nc_fg};}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:9pt;margin:8px 0;}
      .info-grid dt{color:${ATLAS_PDF.colors.muted};font-weight:600;text-transform:uppercase;font-size:7pt;}
      .sig-block{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;font-size:8pt;}
      .sig-line{border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:4px;margin-top:40px;}
      .pdf-header{display:flex;align-items:center;gap:16px;margin-bottom:4px;}
      @media print{body{margin:0;}}
      </style></head><body>
      <div class="pdf-header">
        ${logoHtml}
        <h2>ATLAS QMS — Controlo de Compactação</h2>
      </div>
      ${projectInfoStripHtml()}
      <h3>1. Identificação da Zona</h3>
      <dl class="info-grid">
        <dt>Código</dt><dd>${zone.code}</dd>
        <dt>Descrição</dt><dd>${zone.zone_description}</dd>
        <dt>PK</dt><dd>${zone.pk_start ?? "—"} a ${zone.pk_end ?? "—"}</dd>
        <dt>Camada</dt><dd>${zone.layer_no ?? "—"}</dd>
        <dt>Material</dt><dd>${zone.material_type ?? "—"}</dd>
        <dt>Ref. PAME</dt><dd>${zone.material_ref ?? "—"}</dd>
        <dt>γd máx (kN/m³)</dt><dd>${zone.proctor_gamma_max ?? "—"}</dd>
        <dt>w óptimo (%)</dt><dd>${zone.proctor_wopt ?? "—"}</dd>
        <dt>Data</dt><dd>${zone.test_date}</dd>
      </dl>
      ${nuclear.length > 0 ? `<h3>2. Pontos Nucleares</h3>
      <table><tr><th>Pto</th><th>PK</th><th>γd (kN/m³)</th><th>w%</th><th>GC%</th><th>Critério</th><th>Result.</th></tr>
      ${nuclearRows}</table>` : ""}
      ${plates.length > 0 ? `<h3>3. Ensaios de Placa</h3>
      <table><tr><th>Pto</th><th>PK</th><th>Ev1</th><th>Ev2</th><th>Ev2/Ev1</th><th>Critério</th><th>Result.</th></tr>
      ${plateRows}</table>` : ""}
      <h3>Resultado Global</h3>
      <div style="text-align:center;margin:16px 0;">
        <span class="badge ${isPass ? "pass" : "fail"}" style="font-size:14pt;padding:8px 24px;">
          ${isPass ? "CONFORME" : overall === "pending" ? "PENDENTE" : "NÃO CONFORME"}
        </span>
      </div>
      <div class="sig-block">
        <div><div class="sig-line">Técnico</div></div>
        <div><div class="sig-line">Técnico de Qualidade</div></div>
      </div>
      <div style="margin-top:24px;font-size:7pt;color:${ATLAS_PDF.colors.muted};text-align:center;">
        Atlas QMS · ${projectName} · ${zone.code}
      </div>
      </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  },
};
