/**
 * Document Templates
 * Pre-defined form schemas for common QMS document types.
 * Templates use bilingual labels (label_pt / label_es).
 */

import type { FormSchema } from "@/components/documents/DynamicFormRenderer";

export interface DocumentTemplate {
  id: string;
  code: string;
  title_pt: string;
  title_es: string;
  doc_type: string;
  disciplina: string;
  description_pt: string;
  description_es: string;
  form_schema: FormSchema;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "tpl-fp02",
    code: "FP02",
    title_pt: "FP02 — Compras e Subcontratação",
    title_es: "FP02 — Compras y Subcontratación",
    doc_type: "procedure",
    disciplina: "geral",
    description_pt: "Procedimento para gestão de compras e subcontratação de serviços",
    description_es: "Procedimiento para gestión de compras y subcontratación de servicios",
    form_schema: {
      title_pt: "Ficha de Procedimento — Compras e Subcontratação",
      title_es: "Ficha de Procedimiento — Compras y Subcontratación",
      fields: [
        { key: "objetivo", label_pt: "Objetivo", label_es: "Objetivo", type: "textarea", required: true, placeholder_pt: "Descreva o objetivo do procedimento…", placeholder_es: "Describa el objetivo del procedimiento…" },
        { key: "ambito", label_pt: "Âmbito de Aplicação", label_es: "Ámbito de Aplicación", type: "textarea", required: true },
        { key: "responsavel", label_pt: "Responsável", label_es: "Responsable", type: "text", required: true },
        { key: "criterios_selecao", label_pt: "Critérios de Seleção de Fornecedores", label_es: "Criterios de Selección de Proveedores", type: "textarea", required: true },
        { key: "processo_aprovacao", label_pt: "Processo de Aprovação", label_es: "Proceso de Aprobación", type: "textarea" },
        { key: "docs_necessarios", label_pt: "Documentação Necessária", label_es: "Documentación Necesaria", type: "textarea", placeholder_pt: "Liste os documentos exigidos…", placeholder_es: "Liste los documentos requeridos…" },
        { key: "controlo_recepcao", label_pt: "Controlo na Receção", label_es: "Control en Recepción", type: "textarea" },
        { key: "avaliacao_desempenho", label_pt: "Avaliação de Desempenho", label_es: "Evaluación de Desempeño", type: "select", options: ["Sim", "Não", "N/A"] },
        { key: "periodicidade_avaliacao", label_pt: "Periodicidade da Avaliação", label_es: "Periodicidad de la Evaluación", type: "select", options: ["Mensal", "Trimestral", "Semestral", "Anual"] },
        { key: "referencias_normativas", label_pt: "Referências Normativas", label_es: "Referencias Normativas", type: "textarea" },
        { key: "observacoes", label_pt: "Observações", label_es: "Observaciones", type: "textarea" },
      ],
    },
  },
  {
    id: "tpl-pg01",
    code: "PG01",
    title_pt: "PG01 — Controlo de Documentação",
    title_es: "PG01 — Control de Documentación",
    doc_type: "procedure",
    disciplina: "geral",
    description_pt: "Procedimento geral para controlo de documentação do SGQ",
    description_es: "Procedimiento general para control de documentación del SGC",
    form_schema: {
      title_pt: "Ficha de Procedimento — Controlo de Documentação",
      title_es: "Ficha de Procedimiento — Control de Documentación",
      fields: [
        { key: "objetivo", label_pt: "Objetivo", label_es: "Objetivo", type: "textarea", required: true },
        { key: "ambito", label_pt: "Âmbito de Aplicação", label_es: "Ámbito de Aplicación", type: "textarea", required: true },
        { key: "responsavel_elaboracao", label_pt: "Responsável pela Elaboração", label_es: "Responsable de Elaboración", type: "text", required: true },
        { key: "responsavel_aprovacao", label_pt: "Responsável pela Aprovação", label_es: "Responsable de Aprobación", type: "text", required: true },
        { key: "sistema_codificacao", label_pt: "Sistema de Codificação", label_es: "Sistema de Codificación", type: "textarea", placeholder_pt: "Descreva o sistema de codificação utilizado…", placeholder_es: "Describa el sistema de codificación utilizado…" },
        { key: "controlo_versoes", label_pt: "Controlo de Versões e Revisões", label_es: "Control de Versiones y Revisiones", type: "textarea" },
        { key: "distribuicao", label_pt: "Distribuição e Acesso", label_es: "Distribución y Acceso", type: "textarea" },
        { key: "arquivo_retencao", label_pt: "Arquivo e Retenção", label_es: "Archivo y Retención", type: "textarea" },
        { key: "docs_obsoletos", label_pt: "Gestão de Documentos Obsoletos", label_es: "Gestión de Documentos Obsoletos", type: "textarea" },
        { key: "registos_associados", label_pt: "Registos Associados", label_es: "Registros Asociados", type: "textarea" },
        { key: "observacoes", label_pt: "Observações", label_es: "Observaciones", type: "textarea" },
      ],
    },
  },
  {
    id: "tpl-qc-report",
    code: "REL-QC",
    title_pt: "Relatório Semanal/Mensal QC",
    title_es: "Informe Semanal/Mensual QC",
    doc_type: "report",
    disciplina: "geral",
    description_pt: "Relatório periódico de qualidade e controlo com KPIs",
    description_es: "Informe periódico de calidad y control con KPIs",
    form_schema: {
      title_pt: "Relatório de Qualidade — QC",
      title_es: "Informe de Calidad — QC",
      fields: [
        { key: "periodo_inicio", label_pt: "Data de Início do Período", label_es: "Fecha de Inicio del Período", type: "date", required: true },
        { key: "periodo_fim", label_pt: "Data de Fim do Período", label_es: "Fecha de Fin del Período", type: "date", required: true },
        { key: "tipo_relatorio", label_pt: "Tipo de Relatório", label_es: "Tipo de Informe", type: "select", options: ["Semanal", "Mensal", "Quinzenal"], required: true },
        { key: "resumo", label_pt: "Resumo do Período", label_es: "Resumen del Período", type: "textarea", required: true, placeholder_pt: "Resumo geral das atividades de qualidade…", placeholder_es: "Resumen general de las actividades de calidad…" },
        { key: "nc_abertas", label_pt: "NC Abertas no Período", label_es: "NC Abiertas en el Período", type: "number" },
        { key: "nc_fechadas", label_pt: "NC Fechadas no Período", label_es: "NC Cerradas en el Período", type: "number" },
        { key: "nc_total_abertas", label_pt: "Total NC em Aberto", label_es: "Total NC Abiertas", type: "number" },
        { key: "ensaios_realizados", label_pt: "Ensaios Realizados", label_es: "Ensayos Realizados", type: "number" },
        { key: "ensaios_conformes", label_pt: "Ensaios Conformes", label_es: "Ensayos Conformes", type: "number" },
        { key: "ensaios_nao_conformes", label_pt: "Ensaios Não Conformes", label_es: "Ensayos No Conformes", type: "number" },
        { key: "ppi_realizados", label_pt: "PPI Realizados", label_es: "PPI Realizados", type: "number" },
        { key: "ppi_conformes", label_pt: "PPI Conformes", label_es: "PPI Conformes", type: "number" },
        { key: "ppi_nao_conformes", label_pt: "PPI Não Conformes", label_es: "PPI No Conformes", type: "number" },
        { key: "docs_aprovados", label_pt: "Documentos Aprovados", label_es: "Documentos Aprobados", type: "number" },
        { key: "docs_em_revisao", label_pt: "Documentos em Revisão", label_es: "Documentos en Revisión", type: "number" },
        { key: "acoes_corretivas", label_pt: "Ações Corretivas em Curso", label_es: "Acciones Correctivas en Curso", type: "textarea" },
        { key: "riscos_identificados", label_pt: "Riscos Identificados", label_es: "Riesgos Identificados", type: "textarea" },
        { key: "observacoes", label_pt: "Observações e Próximos Passos", label_es: "Observaciones y Próximos Pasos", type: "textarea" },
        { key: "elaborado_por", label_pt: "Elaborado por", label_es: "Elaborado por", type: "text", required: true },
        { key: "verificado_por", label_pt: "Verificado por", label_es: "Verificado por", type: "text" },
      ],
    },
  },
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateByCode(code: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.code === code);
}
