import { supabase } from "@/integrations/supabase/client";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import { projectInfoStripHtml } from "./pdfProjectHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SoilSample {
  id: string;
  project_id: string;
  code: string;
  work_item_id: string | null;
  sample_ref: string;
  pk_location: string | null;
  depth_from: number | null;
  depth_to: number | null;
  sample_date: string;
  supplier_id: string | null;
  material_type: string | null;
  has_grading: boolean;
  grading_d10: number | null; grading_d30: number | null; grading_d60: number | null;
  grading_cu: number | null; grading_cc: number | null;
  grading_p0075: number | null; grading_p0425: number | null;
  grading_p2: number | null; grading_p10: number | null;
  grading_p20: number | null; grading_p50: number | null;
  has_atterberg: boolean;
  ll_pct: number | null; lp_pct: number | null; ip_pct: number | null;
  aashto_class: string | null;
  has_proctor: boolean;
  proctor_gamma_max: number | null; proctor_wopt: number | null;
  proctor_points: any[];
  has_cbr: boolean;
  cbr_95: number | null; cbr_98: number | null;
  cbr_expansion: number | null; cbr_criteria: number | null; cbr_pass: boolean | null;
  has_organic: boolean;
  organic_pct: number | null; organic_method: string | null;
  organic_limit: number | null; organic_pass: boolean | null;
  has_sulfates: boolean;
  sulfate_pct: number | null; chloride_pct: number | null;
  sulfate_limit: number | null; sulfate_pass: boolean | null;
  overall_result: string;
  extra_tests: any[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSoilInput {
  project_id: string;
  work_item_id?: string | null;
  sample_ref: string;
  pk_location?: string | null;
  depth_from?: number | null;
  depth_to?: number | null;
  sample_date?: string;
  supplier_id?: string | null;
  material_type?: string | null;
  [key: string]: any;
}

// ─── Classification ───────────────────────────────────────────────────────────

export function computeAashtoClass(sample: Partial<SoilSample>): string | null {
  const p200 = sample.grading_p0075;
  const ip = sample.ip_pct;
  const ll = sample.ll_pct;

  if (p200 == null) return null;

  if (p200 <= 35) {
    if (ip == null || ip <= 6) return "A-1";
    if (ip <= 10) return "A-2-4";
    if (ll != null && ll <= 40) return "A-2-6";
    return "A-2-7";
  }
  if (ll != null && ll <= 40) {
    if (ip != null && ip <= 10) return "A-4";
    return "A-6";
  }
  if (ip != null && ip <= 10) return "A-5";
  if (ip != null && ll != null && ip <= ll - 30) return "A-7-5";
  return "A-7-6";
}

export function computeOverallResult(sample: Partial<SoilSample>): "apto" | "conditional" | "inapto" | "pending" {
  const checks: (boolean | null | undefined)[] = [];

  if (sample.has_cbr && sample.cbr_pass != null) checks.push(sample.cbr_pass);
  if (sample.has_organic && sample.organic_pass != null) checks.push(sample.organic_pass);
  if (sample.has_sulfates && sample.sulfate_pass != null) checks.push(sample.sulfate_pass);

  if (checks.length === 0) return "pending";
  if (checks.every((c) => c === true)) return "apto";
  if (checks.some((c) => c === false)) return "inapto";
  return "conditional";
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const soilService = {
  async create(input: CreateSoilInput): Promise<SoilSample> {
    const { data: code } = await supabase.rpc("fn_next_soil_code", {
      p_project_id: input.project_id,
    });

    const { data, error } = await supabase
      .from("soil_samples" as any)
      .insert({ ...input, code: code ?? "SOLO-ERR" })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async listByProject(projectId: string): Promise<SoilSample[]> {
    const { data, error } = await supabase
      .from("soil_samples" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("sample_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as any[];
  },

  async listByWorkItem(workItemId: string): Promise<SoilSample[]> {
    const { data, error } = await supabase
      .from("soil_samples" as any)
      .select("*")
      .eq("work_item_id", workItemId)
      .order("sample_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as any[];
  },

  async listByPpi(ppiInstanceId: string): Promise<SoilSample[]> {
    // Soil samples don't have ppi_instance_id in the prompt spec,
    // but we can search via work_item_id link. Return empty for now.
    return [];
  },

  async getById(id: string): Promise<SoilSample | null> {
    const { data, error } = await supabase
      .from("soil_samples" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data as any;
  },

  async update(id: string, data: Partial<SoilSample>): Promise<void> {
    const update: Record<string, any> = { ...data };
    // Remove generated columns
    delete update.grading_cu;
    delete update.grading_cc;
    delete update.ip_pct;
    const { error } = await supabase.from("soil_samples" as any).update(update as any).eq("id", id);
    if (error) throw error;
  },

  async deleteSample(id: string): Promise<void> {
    const { error } = await supabase.from("soil_samples" as any).delete().eq("id", id);
    if (error) throw error;
  },

  async exportPdf(sample: SoilSample, projectName: string, logoBase64?: string | null, signatureSlots?: import('./signatureService').SignatureSlot[] | null): Promise<void> {
    const sigHtml = signatureSlots && signatureSlots.length > 0 ? signatureBlockHtml(signatureSlots) : '';
    const overall = computeOverallResult(sample);
    const resultLabel = overall === "apto" ? "APTO" : overall === "inapto" ? "INAPTO" : overall === "conditional" ? "CONDICIONAL" : "PENDENTE";
    const resultClass = overall === "apto" ? "pass" : overall === "pending" ? "pending" : "fail";

    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" style="height:45px;max-width:150px;object-fit:contain;" />`
      : "";

    let sections = "";

    if (sample.has_grading) {
      sections += `<h3>Granulometria</h3>
      <table>
        <tr><th>Peneiro</th><th>% Passa</th></tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">50 mm</td><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${sample.grading_p50 ?? "—"}</td></tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">20 mm</td><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${sample.grading_p20 ?? "—"}</td></tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">10 mm</td><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${sample.grading_p10 ?? "—"}</td></tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">2 mm</td><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${sample.grading_p2 ?? "—"}</td></tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">0.425 mm</td><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${sample.grading_p0425 ?? "—"}</td></tr>
        <tr><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">0.075 mm</td><td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${sample.grading_p0075 ?? "—"}</td></tr>
      </table>
      <p style="margin:4px 0;font-size:8pt;">Cu = ${sample.grading_cu ?? "—"} · Cc = ${sample.grading_cc ?? "—"}</p>`;
    }

    if (sample.has_atterberg) {
      sections += `<h3>Limites de Atterberg</h3>
      <dl class="info-grid">
        <dt>LL (%)</dt><dd>${sample.ll_pct ?? "—"}</dd>
        <dt>LP (%)</dt><dd>${sample.lp_pct ?? "—"}</dd>
        <dt>IP (%)</dt><dd>${sample.ip_pct ?? "—"}</dd>
        <dt>Classificação AASHTO</dt><dd>${sample.aashto_class ?? "—"}</dd>
      </dl>`;
    }

    if (sample.has_proctor) {
      sections += `<h3>Proctor Modificado</h3>
      <dl class="info-grid">
        <dt>γd máx (kN/m³)</dt><dd>${sample.proctor_gamma_max ?? "—"}</dd>
        <dt>w óptimo (%)</dt><dd>${sample.proctor_wopt ?? "—"}</dd>
      </dl>`;
    }

    if (sample.has_cbr) {
      sections += `<h3>CBR</h3>
      <dl class="info-grid">
        <dt>CBR 95%</dt><dd>${sample.cbr_95 ?? "—"}</dd>
        <dt>CBR 98%</dt><dd>${sample.cbr_98 ?? "—"}</dd>
        <dt>Expansão (%)</dt><dd>${sample.cbr_expansion ?? "—"}</dd>
        <dt>Critério</dt><dd>${sample.cbr_criteria ?? "—"}</dd>
        <dt>Resultado</dt><dd><span class="badge ${sample.cbr_pass ? "pass" : "fail"}">${sample.cbr_pass ? "OK" : "NOK"}</span></dd>
      </dl>`;
    }

    if (sample.has_organic) {
      sections += `<h3>Matéria Orgânica</h3>
      <dl class="info-grid">
        <dt>Teor (%)</dt><dd>${sample.organic_pct ?? "—"}</dd>
        <dt>Limite (%)</dt><dd>${sample.organic_limit ?? "—"}</dd>
        <dt>Resultado</dt><dd><span class="badge ${sample.organic_pass ? "pass" : "fail"}">${sample.organic_pass ? "OK" : "NOK"}</span></dd>
      </dl>`;
    }

    if (sample.has_sulfates) {
      sections += `<h3>Sulfatos e Sais Solúveis</h3>
      <dl class="info-grid">
        <dt>SO4 (%)</dt><dd>${sample.sulfate_pct ?? "—"}</dd>
        <dt>Cl (%)</dt><dd>${sample.chloride_pct ?? "—"}</dd>
        <dt>Limite SO4 (%)</dt><dd>${sample.sulfate_limit ?? "—"}</dd>
        <dt>Resultado</dt><dd><span class="badge ${sample.sulfate_pass ? "pass" : "fail"}">${sample.sulfate_pass ? "OK" : "NOK"}</span></dd>
      </dl>`;
    }

    const extras = Array.isArray(sample.extra_tests) ? sample.extra_tests : [];
    if (extras.length > 0) {
      const rows = extras.map((e: any) => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${e.name ?? "—"}</td>
          <td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${e.norm ?? "—"}</td>
          <td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${e.value ?? "—"} ${e.unit ?? ""}</td>
          <td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${e.criteria ?? "—"}</td>
          <td style="padding:4px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${e.pass_fail ?? "—"}</td>
        </tr>`).join("");
      sections += `<h3>Ensaios Adicionais</h3>
      <table><tr><th>Ensaio</th><th>Norma</th><th>Valor</th><th>Critério</th><th>Result.</th></tr>${rows}</table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sample.code}</title>
      <style>body{font-family:${ATLAS_PDF.fonts.base};font-size:${ATLAS_PDF.fonts.sizes.body}pt;color:${ATLAS_PDF.colors.ink};margin:20px;}
      h2{color:${ATLAS_PDF.colors.navy};font-size:${ATLAS_PDF.fonts.sizes.h1}pt;}
      h3{color:${ATLAS_PDF.colors.navym};font-size:${ATLAS_PDF.fonts.sizes.h2}pt;margin:14px 0 6px;}
      table{width:100%;border-collapse:collapse;}
      th{background:${ATLAS_PDF.colors.navy};color:${ATLAS_PDF.colors.white};padding:4px 8px;text-align:left;font-size:${ATLAS_PDF.fonts.sizes.small}pt;text-transform:uppercase;}
      .badge{display:inline-block;padding:2px 8px;border-radius:3px;font-weight:600;font-size:8pt;}
      .pass{background:${ATLAS_PDF.colors.ok_bg};color:${ATLAS_PDF.colors.ok_fg};}
      .fail{background:${ATLAS_PDF.colors.nc_bg};color:${ATLAS_PDF.colors.nc_fg};}
      .pending{background:${ATLAS_PDF.colors.warn_bg};color:${ATLAS_PDF.colors.warn_fg};}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:9pt;margin:8px 0;}
      .info-grid dt{color:${ATLAS_PDF.colors.muted};font-weight:600;text-transform:uppercase;font-size:7pt;}
      .sig-block{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;font-size:8pt;}
      .sig-line{border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:4px;margin-top:40px;}
      .pdf-header{display:flex;align-items:center;gap:16px;margin-bottom:4px;}
      @media print{body{margin:0;}}
      </style></head><body>
      <div class="pdf-header">
        ${logoHtml}
        <h2>ATLAS QMS — Caracterização de Solos</h2>
      </div>
      ${projectInfoStripHtml(null)}
      <h3>Identificação</h3>
      <dl class="info-grid">
        <dt>Código</dt><dd>${sample.code}</dd>
        <dt>Ref. Amostra</dt><dd>${sample.sample_ref}</dd>
        <dt>PK</dt><dd>${sample.pk_location ?? "—"}</dd>
        <dt>Profundidade</dt><dd>${sample.depth_from ?? "—"} a ${sample.depth_to ?? "—"} m</dd>
        <dt>Data</dt><dd>${sample.sample_date}</dd>
        <dt>Material</dt><dd>${sample.material_type ?? "—"}</dd>
      </dl>
      ${sections}
      <h3>Resultado Global</h3>
      <div style="text-align:center;margin:16px 0;">
        <span class="badge ${resultClass}" style="font-size:14pt;padding:8px 24px;">${resultLabel}</span>
      </div>
      <div class="sig-block">
        <div><div class="sig-line">Técnico Laboratório</div></div>
        <div><div class="sig-line">Técnico de Qualidade</div></div>
      </div>
      ${sigHtml}
      <div style="margin-top:24px;font-size:7pt;color:${ATLAS_PDF.colors.muted};text-align:center;">
        Atlas QMS · ${projectName} · ${sample.code}
      </div>
      </body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  },
};
