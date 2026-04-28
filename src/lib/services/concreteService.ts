import { supabase } from "@/integrations/supabase/client";
import { signatureBlockHtml } from "./signatureService";
import { ATLAS_PDF } from "@/lib/atlas-pdf-theme";
import { fullPdfHeader, projectInfoStripHtml } from "./pdfProjectHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConcreteBatch {
  id: string;
  project_id: string;
  code: string;
  work_item_id: string | null;
  ppi_instance_id: string | null;
  element_betonado: string;
  pk_location: string | null;
  batch_date: string;
  batch_time: string | null;
  supplier_id: string | null;
  delivery_note_ref: string | null;
  truck_plate: string | null;
  concrete_class: string;
  cement_type: string | null;
  max_aggregate: number | null;
  consistency_class: string | null;
  slump_mm: number | null;
  slump_pass: boolean | null;
  temp_concrete: number | null;
  temp_ambient: number | null;
  temp_pass: boolean | null;
  air_content: number | null;
  status: string;
  lab_name: string | null;
  technician_name: string | null;
  notes: string | null;
  exc_class: string | null;
  fab_ref: string | null;
  exposure_class: string | null;
  structural_element_mqt_code: string | null;
  lot_id: string | null;
  cement_class: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConcreteSpecimen {
  id: string;
  batch_id: string;
  project_id: string;
  specimen_no: number;
  mold_date: string;
  cure_days: number;
  test_date: string | null;
  lab_ref: string | null;
  dimension_mm: number;
  shape: string;
  break_load_kn: number | null;
  strength_mpa: number | null;
  pass_fail: string | null;
  fracture_type: string | null;
  notes: string | null;
  created_at: string;
}

export type ConcreteBatchWithCounts = ConcreteBatch & {
  specimen_count: number;
  specimens_tested: number;
  overall_result: string;
};

export interface CreateBatchInput {
  project_id: string;
  work_item_id?: string | null;
  ppi_instance_id?: string | null;
  element_betonado: string;
  pk_location?: string | null;
  batch_date?: string;
  batch_time?: string | null;
  supplier_id?: string | null;
  delivery_note_ref?: string | null;
  truck_plate?: string | null;
  concrete_class?: string;
  cement_type?: string | null;
  max_aggregate?: number | null;
  consistency_class?: string | null;
  slump_mm?: number | null;
  slump_pass?: boolean | null;
  temp_concrete?: number | null;
  temp_ambient?: number | null;
  temp_pass?: boolean | null;
  air_content?: number | null;
  lab_name?: string | null;
  technician_name?: string | null;
  notes?: string | null;
  exc_class?: string | null;
  fab_ref?: string | null;
  exposure_class?: string | null;
  structural_element_mqt_code?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFck(concreteClass: string): number {
  const m = concreteClass.match(/C(\d+)/);
  return m ? parseInt(m[1], 10) : 25;
}

/**
 * NP EN 13670 AN-PT, Quadro NA.M — Critérios de conformidade
 * Filtra apenas provetes com cure_days === 28.
 */
export function computeBatchResult(
  concreteClass: string,
  specimens: ConcreteSpecimen[],
): {
  overall: "pass" | "fail" | "pending";
  mean: number | null;
  min: number | null;
  stdDev: number | null;
  n: number;
  criterionApplied: string;
} {
  const tested = specimens.filter((s) => s.cure_days === 28 && s.strength_mpa != null);
  const n = tested.length;
  const fck = parseFck(concreteClass);

  if (n === 0) return { overall: "pending", mean: null, min: null, stdDev: null, n: 0, criterionApplied: "n=0 — sem ensaios 28d" };

  const values = tested.map((s) => s.strength_mpa!);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...values);
  const stdDev = n > 1 ? Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n) : 0;

  let pass: boolean;
  let criterionApplied: string;

  if (n === 1) {
    pass = min >= fck - 4;
    criterionApplied = "NA.M n=1: fc ≥ fck−4";
  } else if (n === 2) {
    pass = mean >= fck && min >= fck - 4;
    criterionApplied = "NA.M n=2: fcm ≥ fck E fc_i ≥ fck−4";
  } else if (n <= 4) {
    pass = mean >= fck + 1 && min >= fck - 4;
    criterionApplied = "NA.M n=3-4: fcm ≥ fck+1 E fc_i ≥ fck−4";
  } else {
    // NP EN 206 §8.3 Método A
    pass = mean >= fck + 1.48 * stdDev && min >= fck - 4;
    criterionApplied = `NP EN 206 §8.3 (n=${n}): fcm ≥ fck+1,48s E fc_i ≥ fck−4`;
  }

  return {
    overall: pass ? "pass" : "fail",
    mean: Math.round(mean * 100) / 100,
    min: Math.round(min * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    n,
    criterionApplied,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const concreteService = {
  async create(input: CreateBatchInput): Promise<ConcreteBatch> {
    const { data: code } = await supabase.rpc("fn_next_concrete_batch_code", {
      p_project_id: input.project_id,
    });

    const { data, error } = await supabase
      .from("concrete_batches" as any)
      .insert({ ...input, code: code ?? "BE-BET-ERR" })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async listByProject(projectId: string): Promise<ConcreteBatchWithCounts[]> {
    const { data: batches, error } = await supabase
      .from("concrete_batches" as any)
      .select("*")
      .eq("project_id", projectId)
      .order("batch_date", { ascending: false });

    if (error) throw error;
    if (!batches) return [];

    const ids = (batches as any[]).map((b: any) => b.id);
    if (ids.length === 0) return [];

    const { data: specimens } = await supabase
      .from("concrete_specimens" as any)
      .select("*")
      .in("batch_id", ids);

    const specimensByBatch = new Map<string, ConcreteSpecimen[]>();
    ((specimens ?? []) as any[]).forEach((s: any) => {
      const arr = specimensByBatch.get(s.batch_id) ?? [];
      arr.push(s);
      specimensByBatch.set(s.batch_id, arr);
    });

    return (batches as any[]).map((b: any) => {
      const specs = specimensByBatch.get(b.id) ?? [];
      const tested = specs.filter((s) => s.strength_mpa != null).length;
      const result = computeBatchResult(b.concrete_class, specs);
      return { ...b, specimen_count: specs.length, specimens_tested: tested, overall_result: result.overall };
    });
  },

  async listByWorkItem(workItemId: string): Promise<ConcreteBatchWithCounts[]> {
    const { data: batches, error } = await supabase
      .from("concrete_batches" as any)
      .select("*")
      .eq("work_item_id", workItemId)
      .order("batch_date", { ascending: false });

    if (error) throw error;
    if (!batches || (batches as any[]).length === 0) return [];

    const ids = (batches as any[]).map((b: any) => b.id);
    const { data: specimens } = await supabase
      .from("concrete_specimens" as any)
      .select("*")
      .in("batch_id", ids);

    const specimensByBatch = new Map<string, ConcreteSpecimen[]>();
    ((specimens ?? []) as any[]).forEach((s: any) => {
      const arr = specimensByBatch.get(s.batch_id) ?? [];
      arr.push(s);
      specimensByBatch.set(s.batch_id, arr);
    });

    return (batches as any[]).map((b: any) => {
      const specs = specimensByBatch.get(b.id) ?? [];
      const tested = specs.filter((s) => s.strength_mpa != null).length;
      const result = computeBatchResult(b.concrete_class, specs);
      return { ...b, specimen_count: specs.length, specimens_tested: tested, overall_result: result.overall };
    });
  },

  async listByPpi(ppiInstanceId: string): Promise<ConcreteBatchWithCounts[]> {
    const { data: batches, error } = await supabase
      .from("concrete_batches" as any)
      .select("*")
      .eq("ppi_instance_id", ppiInstanceId)
      .order("batch_date", { ascending: false });

    if (error) throw error;
    if (!batches || (batches as any[]).length === 0) return [];

    const ids = (batches as any[]).map((b: any) => b.id);
    const { data: specimens } = await supabase
      .from("concrete_specimens" as any)
      .select("*")
      .in("batch_id", ids);

    const specimensByBatch = new Map<string, ConcreteSpecimen[]>();
    ((specimens ?? []) as any[]).forEach((s: any) => {
      const arr = specimensByBatch.get(s.batch_id) ?? [];
      arr.push(s);
      specimensByBatch.set(s.batch_id, arr);
    });

    return (batches as any[]).map((b: any) => {
      const specs = specimensByBatch.get(b.id) ?? [];
      const tested = specs.filter((s) => s.strength_mpa != null).length;
      const result = computeBatchResult(b.concrete_class, specs);
      return { ...b, specimen_count: specs.length, specimens_tested: tested, overall_result: result.overall };
    });
  },

  async getById(id: string): Promise<{ batch: ConcreteBatch; specimens: ConcreteSpecimen[] } | null> {
    const { data: batch, error } = await supabase
      .from("concrete_batches" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !batch) return null;

    const { data: specimens } = await supabase
      .from("concrete_specimens" as any)
      .select("*")
      .eq("batch_id", id)
      .order("specimen_no");

    return { batch: batch as any, specimens: (specimens ?? []) as any[] };
  },

  async updateBatch(id: string, data: Partial<ConcreteBatch>): Promise<void> {
    const { error } = await supabase
      .from("concrete_batches" as any)
      .update(data as any)
      .eq("id", id);
    if (error) throw error;
  },

  async addSpecimen(
    batchId: string,
    projectId: string,
    specimen: Omit<ConcreteSpecimen, "id" | "batch_id" | "project_id" | "strength_mpa" | "created_at">,
  ): Promise<ConcreteSpecimen> {
    const { data, error } = await supabase
      .from("concrete_specimens" as any)
      .insert({ ...specimen, batch_id: batchId, project_id: projectId } as any)
      .select()
      .single();
    if (error) throw error;
    return data as any;
  },

  async updateSpecimen(id: string, data: Partial<ConcreteSpecimen>): Promise<void> {
    const update: Record<string, any> = { ...data };
    delete update.strength_mpa; // generated column
    const { error } = await supabase
      .from("concrete_specimens" as any)
      .update(update as any)
      .eq("id", id);
    if (error) throw error;
  },

  async deleteSpecimen(id: string): Promise<void> {
    const { error } = await supabase.from("concrete_specimens" as any).delete().eq("id", id);
    if (error) throw error;
  },

  async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase.from("concrete_batches" as any).delete().eq("id", id);
    if (error) throw error;
  },

  async exportPdf(batch: ConcreteBatch, specimens: ConcreteSpecimen[], projectName: string, logoBase64?: string | null, signatureSlots?: import('./signatureService').SignatureSlot[] | null): Promise<void> {
    const sigHtml = signatureSlots && signatureSlots.length > 0 ? signatureBlockHtml(signatureSlots) : '';
    const fck = parseFck(batch.concrete_class);
    const result = computeBatchResult(batch.concrete_class, specimens);
    const isPass = result.overall === "pass";

    const specRows = specimens
      .map(
        (s) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${s.specimen_no}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${s.mold_date}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${s.cure_days}d</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${s.test_date ?? "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${s.break_load_kn ?? "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};font-weight:600;">${s.strength_mpa ?? "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${s.fracture_type ?? "—"}</td>
      </tr>`,
      )
      .join("");

    const today = new Date().toLocaleDateString("pt-PT");
    const header = fullPdfHeader(logoBase64 ?? null, projectName, batch.code, "0", today);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${batch.code}</title>
      <style>body{font-family:${ATLAS_PDF.fonts.base};font-size:${ATLAS_PDF.fonts.sizes.body}pt;color:${ATLAS_PDF.colors.ink};margin:20px;}
      h2{color:${ATLAS_PDF.colors.navy};font-size:${ATLAS_PDF.fonts.sizes.h1}pt;margin:8px 0;}
      h3{color:${ATLAS_PDF.colors.navym};font-size:${ATLAS_PDF.fonts.sizes.h2}pt;margin:12px 0 6px;}
      table{width:100%;border-collapse:collapse;font-size:${ATLAS_PDF.fonts.sizes.body}pt;}
      th{background:${ATLAS_PDF.colors.navy};color:${ATLAS_PDF.colors.white};padding:6px 8px;text-align:left;font-size:${ATLAS_PDF.fonts.sizes.small}pt;text-transform:uppercase;}
      .badge{display:inline-block;padding:6px 16px;border-radius:4px;font-weight:700;font-size:10pt;}
      .pass{background:${ATLAS_PDF.colors.ok_bg};color:${ATLAS_PDF.colors.ok_fg};}
      .fail{background:${ATLAS_PDF.colors.nc_bg};color:${ATLAS_PDF.colors.nc_fg};}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:9pt;margin:8px 0;}
      .info-grid dt{color:${ATLAS_PDF.colors.muted};font-weight:600;text-transform:uppercase;font-size:7pt;}
      .sig-block{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;font-size:8pt;}
      .sig-line{border-top:1px solid ${ATLAS_PDF.colors.rule};padding-top:4px;margin-top:40px;}
      .criterion-text{font-size:7pt;color:${ATLAS_PDF.colors.muted};margin-top:6px;font-style:italic;}
      @media print{body{margin:0;}}
      </style></head><body>
      ${header}
      <h3>1. Identificação</h3>
      <dl class="info-grid">
        <dt>Código</dt><dd>${batch.code}</dd>
        <dt>Elemento</dt><dd>${batch.element_betonado}</dd>
        <dt>PK</dt><dd>${batch.pk_location ?? "—"}</dd>
        <dt>Data</dt><dd>${batch.batch_date}</dd>
        <dt>Central</dt><dd>${batch.lab_name ?? "—"}</dd>
        <dt>Guia Remessa</dt><dd>${batch.delivery_note_ref ?? "—"}</dd>
        <dt>Matrícula</dt><dd>${batch.truck_plate ?? "—"}</dd>
        <dt>Classe</dt><dd>${batch.concrete_class}</dd>
        <dt>Consistência</dt><dd>${batch.consistency_class ?? "—"}</dd>
        <dt>Classe Execução</dt><dd>${batch.exc_class ?? "—"}</dd>
        <dt>Classe Exposição</dt><dd>${batch.exposure_class ?? "—"}</dd>
        <dt>Ref. FAB</dt><dd>${batch.fab_ref ?? "—"}</dd>
        <dt>Código MQT</dt><dd>${batch.structural_element_mqt_code ?? "—"}</dd>
      </dl>
      <h3>2. Resultados Frescos</h3>
      <table>
        <tr><th>Parâmetro</th><th>Medido</th><th>Resultado</th></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">Abaixamento (mm)</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${batch.slump_mm ?? "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};"><span class="badge ${batch.slump_pass ? "pass" : "fail"}">${batch.slump_pass ? "OK" : "NOK"}</span></td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">Temp. Betão (°C)</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${batch.temp_concrete ?? "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};"><span class="badge ${batch.temp_pass ? "pass" : "fail"}">${batch.temp_pass ? "OK" : "NOK"}</span></td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">Temp. Ambiente (°C)</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">${batch.temp_ambient ?? "—"}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${ATLAS_PDF.colors.rule};">—</td></tr>
      </table>
      <h3>3. Provetes</h3>
      <table>
        <tr><th>#</th><th>Moldagem</th><th>Cura</th><th>Ensaio</th><th>Carga (kN)</th><th>fc (MPa)</th><th>Rotura</th></tr>
        ${specRows}
      </table>
      <h3>4. Análise Estatística</h3>
      <dl class="info-grid">
        <dt>fck especificado</dt><dd>${fck} MPa</dd>
        <dt>Média fc</dt><dd>${result.mean ?? "—"} MPa</dd>
        <dt>Mínimo fc</dt><dd>${result.min ?? "—"} MPa</dd>
        <dt>Desvio padrão</dt><dd>${result.stdDev ?? "—"} MPa</dd>
        <dt>Provetes 28d avaliados</dt><dd>${result.n}</dd>
      </dl>
      <p class="criterion-text">Critério aplicado: ${result.criterionApplied}</p>
      <h3>5. Resultado</h3>
      <div style="text-align:center;margin:16px 0;">
        <span class="badge ${isPass ? "pass" : "fail"}" style="font-size:14pt;">
          ${isPass ? "CONFORME" : result.overall === "pending" ? "PENDENTE" : "NÃO CONFORME"}
        </span>
      </div>
      ${sigHtml || '<div class="sig-block"><div><div class="sig-line">Técnico Laboratório</div></div><div><div class="sig-line">Técnico de Qualidade</div></div></div>'}
      <div style="margin-top:24px;font-size:7pt;color:${ATLAS_PDF.colors.muted};text-align:center;">
        Atlas QMS · ${projectName} · ${batch.code}
      </div>
      </body></html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  },
};
