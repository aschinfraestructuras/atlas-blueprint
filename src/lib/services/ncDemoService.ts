/**
 * ncDemoService — seeds 10 demo non-conformities with different origins/statuses.
 * Idempotent: checks for existing demo codes before inserting.
 */

import { supabase } from "@/integrations/supabase/client";
import { ncService } from "./ncService";

interface DemoNC {
  title: string;
  description: string;
  severity: string;
  category: string;
  origin: string;
  status: string;
  responsible?: string;
  due_date?: string;
  reference?: string;
  correction?: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
}

const DEMO_NCS: DemoNC[] = [
  {
    title: "Betão com resistência inferior ao especificado",
    description: "Ensaio à compressão aos 28 dias revelou resistência de 22 MPa (C25/30 requerido). Amostra colhida na betonagem do pilar P4.",
    severity: "critical", category: "qualidade", origin: "test",
    status: "in_progress", responsible: "João Ferreira",
    reference: "ENS-OBR-0023",
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    root_cause: "Adição excessiva de água na betonagem. Relação A/C superior a 0,50.",
    correction: "Interdição imediata da área. Marcação do betão não conforme.",
    corrective_action: "Demolição e rebetonagem do pilar P4 com controlo rigoroso da relação A/C.",
    preventive_action: "Instalar medidor de abaixamento obrigatório em todas as betonagens. Formação da equipa.",
  },
  {
    title: "Inclinação de conduta de drenagem fora de tolerância",
    description: "Ponto PPI-DRN-PIPE verificação PIPE_SLOPE: inclinação medida 0,2% vs mínimo de 0,5% conforme projeto.",
    severity: "major", category: "qualidade", origin: "ppi",
    status: "open", responsible: "Ana Costa",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    reference: "PPI-OBR-0012",
  },
  {
    title: "Ausência de EPI em zona de trabalhos de escavação",
    description: "Subempreiteiro observado sem capacete e colete refletor durante trabalhos de escavação no Lote 2.",
    severity: "critical", category: "seguranca", origin: "audit",
    status: "closed", responsible: "Carlos Mendes",
    due_date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0],
    correction: "Paragem imediata da atividade e saída do trabalhador do estaleiro.",
    root_cause: "Falha de supervisão do subempreiteiro. Comunicação deficiente dos requisitos de segurança.",
    corrective_action: "Ação disciplinar ao subempreiteiro. Briefing de segurança obrigatório antes de cada turno.",
    preventive_action: "Implementar ponto de verificação de EPI na entrada do estaleiro.",
  },
  {
    title: "Documentação de cura do betão em falta",
    description: "Registo de cura do betão das fundações do Bloco A não foi apresentado conforme procedimento QP-03.",
    severity: "minor", category: "qualidade", origin: "document",
    status: "pending_verification", responsible: "Sofia Lopes",
    correction: "Documentação apresentada retroativamente com base em registos fotográficos.",
    root_cause: "Falha de comunicação entre técnico de campo e responsável documental.",
    corrective_action: "Checklist de entrega de documentação após cada betonagem.",
    preventive_action: "Automatizar alertas de submissão de documentação no sistema.",
  },
  {
    title: "Granulometria do agregado fora do fuso especificado",
    description: "Análise granulométrica do agregado grosso 5/25 mm: 18% de partículas retidas no peneiro 25 mm (máx. 10% permitido).",
    severity: "major", category: "qualidade", origin: "test",
    status: "open", responsible: "Rui Santos",
    due_date: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    reference: "ENS-OBR-0031",
  },
  {
    title: "Desvio de cotas de fundação",
    description: "Levantamento topográfico revela cota de fundação +8 cm acima do especificado em projeto de execução.",
    severity: "major", category: "qualidade", origin: "ppi",
    status: "in_progress", responsible: "Mariana Oliveira",
    reference: "PPI-EST-0008",
    root_cause: "Erro de leitura de cotas de piquetagem. Controlo topográfico insuficiente.",
    correction: "Marcação de exclusão da zona afetada. Contacto imediato com projetista.",
  },
  {
    title: "Produto de limpeza armazenado incorretamente",
    description: "Produtos químicos de limpeza armazenados sem separação de material inflamável. Risco ambiental identificado.",
    severity: "minor", category: "ambiente", origin: "audit",
    status: "closed", responsible: "Pedro Alves",
    correction: "Reorganização imediata do armazém com separação por classes de risco.",
    corrective_action: "Instalação de fichas de segurança (FDS) em local visível. Formação da equipa.",
  },
  {
    title: "Soldadura de tubagem sem inspetor certificado",
    description: "Trabalho de soldadura em tubagem de pressão executado por operador sem certificação EN ISO 9606.",
    severity: "critical", category: "qualidade", origin: "manual",
    status: "draft", responsible: "António Ribeiro",
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
  },
  {
    title: "Atraso na submissão de certificados de material",
    description: "Fornecedor não entregou certificados de conformidade CE do aço de armadura dentro do prazo (5 dias úteis após entrega).",
    severity: "minor", category: "qualidade", origin: "manual",
    status: "archived", responsible: "Inês Faria",
    correction: "Suspensão temporária da aplicação do material até receção dos certificados.",
  },
  {
    title: "Compactação de aterro abaixo do mínimo exigido",
    description: "Ensaio Proctor no troço km 2+500 a 2+700: grau de compactação 91% vs mínimo de 95% Proctor Modificado.",
    severity: "major", category: "producao", origin: "test",
    status: "pending_verification",
    responsible: "Bruno Carvalho",
    reference: "ENS-OBR-0041",
    due_date: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
    root_cause: "Teor em água do material demasiado elevado. Compactação iniciada prematuramente.",
    correction: "Paragem dos trabalhos no troço afetado. Escarificação e recompactação.",
    corrective_action: "Ensaio de humidade antes de qualquer operação de compactação.",
    preventive_action: "Definir protocolo de controlo de humidade com ensaios rápidos em obra.",
  },
];

export const ncDemoService = {
  async seedDemoNCs(
    projectId: string
  ): Promise<{ created: number; skipped: number }> {
    // Check how many NCs with code pattern NC-*-DEMO-* already exist
    const { count } = await supabase
      .from("non_conformities")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .like("reference", "DEMO-%");

    if ((count ?? 0) >= DEMO_NCS.length) {
      return { created: 0, skipped: DEMO_NCS.length };
    }

    let created = 0;

    for (let i = 0; i < DEMO_NCS.length; i++) {
      const def = DEMO_NCS[i];
      const ref = `DEMO-${String(i + 1).padStart(2, "0")}`;

      // Check if already exists
      const { data: existing } = await supabase
        .from("non_conformities")
        .select("id")
        .eq("project_id", projectId)
        .eq("reference", ref)
        .maybeSingle();

      if (existing) continue;

      try {
        const nc = await ncService.create({
          project_id: projectId,
          title: def.title,
          description: def.description,
          severity: def.severity,
          category: def.category,
          origin: def.origin,
          reference: ref,
          responsible: def.responsible,
          due_date: def.due_date,
          detected_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().split("T")[0],
        });

        // Apply CAPA fields if present
        const capaFields: Record<string, string> = {};
        if (def.correction) capaFields.correction = def.correction;
        if (def.root_cause) capaFields.root_cause = def.root_cause;
        if (def.corrective_action) capaFields.corrective_action = def.corrective_action;
        if (def.preventive_action) capaFields.preventive_action = def.preventive_action;

        if (Object.keys(capaFields).length > 0) {
          await ncService.update(nc.id, projectId, capaFields);
        }

        // Transition to target status
        const transitions: string[] = [];
        const target = def.status;

        if (target === "open") transitions.push("open");
        else if (target === "in_progress") { transitions.push("open"); transitions.push("in_progress"); }
        else if (target === "pending_verification") { transitions.push("open"); transitions.push("in_progress"); transitions.push("pending_verification"); }
        else if (target === "closed") { transitions.push("open"); transitions.push("in_progress"); transitions.push("pending_verification"); transitions.push("closed"); }
        else if (target === "archived") { transitions.push("open"); transitions.push("archived"); }
        // draft = default, no transition needed

        for (const s of transitions) {
          try { await ncService.updateStatus(nc.id, s); } catch { /* skip invalid */ }
        }

        created++;
      } catch (err) {
        console.error("ncDemoService: failed to create NC", def.title, err);
      }
    }

    return { created, skipped: DEMO_NCS.length - created };
  },
};
