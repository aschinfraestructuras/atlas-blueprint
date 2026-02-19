/**
 * ppiDemoService — safe seed/demo data utilities for PPI.
 *
 * Creates 2 standard templates (PPI-EST-FOUND + PPI-DRN-PIPE) only if they
 * don't already exist for the project. Respects RLS (the caller must be
 * authenticated and a project member).
 *
 * Exported separately so it can be tree-shaken in production if desired.
 */

import { supabase } from "@/integrations/supabase/client";
import { ppiService, type PpiTemplateInput, type PpiTemplateItemInput } from "./ppiService";

// ─── Demo template definitions ─────────────────────────────────────────────

interface DemoTemplate {
  template: Omit<PpiTemplateInput, "project_id" | "created_by">;
  items: Omit<PpiTemplateItemInput, "template_id">[];
}

const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    template: {
      code:        "PPI-EST-FOUND",
      disciplina:  "estruturas",
      title:       "Inspeção de Fundações — Estruturas",
      description: "Verificação da conformidade das fundações antes do betão.",
      version:     1,
    },
    items: [
      {
        item_no:             1,
        check_code:          "VISUAL_EXCAV",
        label:               "Inspeção visual da escavação (cotas, largura, limpeza de fundo)",
        method:              "Visual",
        acceptance_criteria: "Sem água estagnada; fundo nivelado; sem material solto",
        required:            true,
        evidence_required:   true,
        sort_order:          1,
      },
      {
        item_no:             2,
        check_code:          "DIM_FOUND",
        label:               "Verificação dimensional da fundação (cotas e gabarit)",
        method:              "Medição com nível e fita",
        acceptance_criteria: "Tolerância ±30 mm em planta; ±10 mm em cota",
        required:            true,
        evidence_required:   false,
        sort_order:          2,
      },
      {
        item_no:             3,
        check_code:          "REBAR_PLACING",
        label:               "Colocação e posicionamento das armaduras",
        method:              "Medição e visual",
        acceptance_criteria: "Conforme desenho; espaçamentos e recobrimentos verificados",
        required:            true,
        evidence_required:   true,
        sort_order:          3,
      },
      {
        item_no:             4,
        check_code:          "REBAR_SPLICES",
        label:               "Emendas e amarrações das armaduras",
        method:              "Visual e medição",
        acceptance_criteria: "Comprimentos de emenda conformes com PE/RCCTE",
        required:            true,
        evidence_required:   false,
        sort_order:          4,
      },
      {
        item_no:             5,
        check_code:          "CONCRETE_RECEIPT",
        label:               "Receção do betão (guia de remessa, slump, temperatura)",
        method:              "Ensaio de abaixamento (EN 12350-2)",
        acceptance_criteria: "Slump conforme classe; temperatura < 30 °C",
        required:            true,
        evidence_required:   true,
        sort_order:          5,
      },
      {
        item_no:             6,
        check_code:          "CONCRETE_POUR",
        label:               "Betonagem — vibração e altura de queda",
        method:              "Visual",
        acceptance_criteria: "Altura de queda ≤ 1,5 m; vibrador a cada 0,5 m",
        required:            true,
        evidence_required:   false,
        sort_order:          6,
      },
      {
        item_no:             7,
        check_code:          "CURING",
        label:               "Cura do betão (método e duração)",
        method:              "Visual e registo",
        acceptance_criteria: "Cura húmida ≥ 7 dias ou membrana de cura aplicada",
        required:            true,
        evidence_required:   false,
        sort_order:          7,
      },
      {
        item_no:             8,
        check_code:          "AS_BUILT_FOUND",
        label:               "Tela final (as-built) das fundações",
        method:              "Levantamento topográfico",
        acceptance_criteria: "Tela assinada e carimbada pelo Topógrafo",
        required:            true,
        evidence_required:   true,
        sort_order:          8,
      },
    ],
  },
  {
    template: {
      code:        "PPI-DRN-PIPE",
      disciplina:  "drenagem",
      title:       "Inspeção de Conduta de Drenagem",
      description: "Verificação da instalação de condutas de drenagem longitudinal/transversal.",
      version:     1,
    },
    items: [
      {
        item_no:             1,
        check_code:          "BEDDING_PREP",
        label:               "Preparação do leito de assentamento (granulometria e espessura)",
        method:              "Visual e medição",
        acceptance_criteria: "Espessura mín. 100 mm; material britado limpo conforme especificação",
        required:            true,
        evidence_required:   false,
        sort_order:          1,
      },
      {
        item_no:             2,
        check_code:          "PIPE_SLOPE",
        label:               "Verificação de inclinação longitudinal da conduta",
        method:              "Nível de borbulha ou nivelador laser",
        acceptance_criteria: "Inclinação mín. 0,5 % conforme projeto",
        required:            true,
        evidence_required:   false,
        sort_order:          2,
      },
      {
        item_no:             3,
        check_code:          "JOINTS_SEALING",
        label:               "Inspeção das juntas (encaixe, vedação, alinhamento)",
        method:              "Visual",
        acceptance_criteria: "Juntas encaixadas; sem desalinhamento > 5 mm; vedação íntegra",
        required:            true,
        evidence_required:   true,
        sort_order:          3,
      },
      {
        item_no:             4,
        check_code:          "COMPACTION_BACKFILL",
        label:               "Compactação do material de aterro lateral e superior",
        method:              "Ensaio Proctor (EN 13286-2)",
        acceptance_criteria: "Grau compactação ≥ 95 % Proctor Modificado",
        required:            true,
        evidence_required:   true,
        sort_order:          4,
      },
      {
        item_no:             5,
        check_code:          "WATERTIGHTNESS",
        label:               "Ensaio de estanquidade do troço instalado",
        method:              "Ensaio de pressão (EN 1610)",
        acceptance_criteria: "Sem perda de pressão > 0,5 kPa em 15 min",
        required:            true,
        evidence_required:   true,
        sort_order:          5,
      },
      {
        item_no:             6,
        check_code:          "AS_BUILT_PIPE",
        label:               "Tela final (as-built) do traçado e cotas",
        method:              "Levantamento topográfico",
        acceptance_criteria: "Tela assinada pelo Topógrafo e entregue à Fiscalização",
        required:            true,
        evidence_required:   true,
        sort_order:          6,
      },
    ],
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const ppiDemoService = {
  /**
   * Seed the 2 demo PPI templates for `projectId`.
   * Skips any template whose code already exists (idempotent).
   * Returns { created: string[], skipped: string[] }.
   */
  async seedDemoTemplates(
    projectId: string,
    userId: string
  ): Promise<{ created: string[]; skipped: string[] }> {
    const created: string[] = [];
    const skipped: string[] = [];

    for (const def of DEMO_TEMPLATES) {
      // Check existence
      const { data: existing } = await supabase
        .from("ppi_templates")
        .select("id")
        .eq("project_id", projectId)
        .eq("code", def.template.code)
        .maybeSingle();

      if (existing) {
        skipped.push(def.template.code);
        continue;
      }

      // Create template
      const tmpl = await ppiService.createTemplate({
        ...def.template,
        project_id: projectId,
        created_by: userId,
      });

      // Create items
      if (def.items.length > 0) {
        await ppiService.addTemplateItems(
          def.items.map((it) => ({ ...it, template_id: tmpl.id }))
        );
      }

      created.push(def.template.code);
    }

    return { created, skipped };
  },

  /**
   * Create a demo PPI instance for `workItemId` using the first available
   * active template for the project. Returns the new instance id.
   */
  async seedDemoInstance(
    projectId: string,
    workItemId: string,
    userId: string
  ): Promise<{ instanceId: string; code: string }> {
    // Pick first active template
    const templates = await ppiService.listTemplates(projectId);
    if (templates.length === 0) {
      throw new Error("No active PPI templates found. Create demo templates first.");
    }
    const tpl = templates[0];

    // Build a unique code
    const { count } = await supabase
      .from("ppi_instances")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const code = `PPI-DEMO-${seq}`;

    const result = await ppiService.createInstanceFromTemplate(
      { project_id: projectId, work_item_id: workItemId, code, created_by: userId },
      tpl.id
    );

    return { instanceId: result.id, code };
  },
};
