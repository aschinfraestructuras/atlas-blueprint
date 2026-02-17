# 02 — MODULES

## Mapa de Módulos

```
ATLAS
├── CORE
│   ├── Autenticação & Autorização (RBAC)
│   ├── Gestão de Organizações
│   ├── Gestão de Obras (Projetos)
│   └── i18n (PT-PT / ES)
│
├── M1 — Documentos
│   ├── Repositório documental hierárquico
│   ├── Controlo de versões
│   ├── Workflow de aprovação
│   └── Distribuição controlada
│
├── M2 — Ensaios
│   ├── Catálogo de tipos de ensaio
│   ├── Registo de amostras
│   ├── Resultados e conformidade automática
│   ├── Ensaios de solo (Proctor, densidade in situ, CBR, granulometria, LA, equivalente de areia)
│   ├── Ensaios de pavimentação (Marshall, placas de carga, IRI)
│   ├── Ensaios de betão (compressão, abaixamento)
│   └── Relatórios de ensaio (PDF)
│
├── M3 — PPI (Plano de Pontos de Inspeção)
│   ├── Modelos de PPI por atividade
│   ├── Checklist de pontos de controlo
│   ├── Registo de inspeções (com fotos)
│   ├── Ligação a ensaios e NC
│   └── Assinaturas (empreiteiro / fiscalização)
│
├── M4 — Não-Conformidades (NC)
│   ├── Registo e classificação
│   ├── Análise de causas (5 Porquês / Ishikawa)
│   ├── Ações corretivas / preventivas (AC/AP)
│   ├── Seguimento e fecho
│   └── Indicadores (taxa de fecho, tempo médio)
│
├── M5 — Auditorias
│   ├── Plano anual de auditorias
│   ├── Checklists configuráveis
│   ├── Relatório de auditoria
│   ├── Constatações → NC (ligação direta)
│   └── Seguimento de ações
│
├── M6 — Fornecedores & Subempreiteiros
│   ├── Cadastro e qualificação
│   ├── Avaliação periódica
│   ├── Documentos associados (seguros, alvarás, certificados)
│   └── Histórico por obra
│
├── M7 — Oficina Técnica
│   ├── Topografia (levantamentos, implantações)
│   ├── Controlo geométrico
│   └── Fichas de trabalho
│
├── M8 — Planeamento & Início de Trabalhos
│   ├── Checklist de arranque de atividade
│   ├── Aprovação de materiais
│   ├── Estudos de composição (formulações)
│   └── Cronograma de qualidade
│
└── DASHBOARDS & RELATÓRIOS
    ├── KPIs de qualidade por obra
    ├── Resumo de NC abertas / fechadas
    ├── Estado dos PPI
    ├── Cobertura de ensaios
    └── Exportação (PDF, Excel)
```

## Dependências entre Módulos

| Módulo | Depende de |
|---|---|
| M1 Documentos | CORE |
| M2 Ensaios | CORE, M1 (relatórios anexos) |
| M3 PPI | CORE, M2 (ligação a ensaios), M4 (abertura de NC) |
| M4 NC | CORE, M1 (evidências) |
| M5 Auditorias | CORE, M4 (constatações → NC) |
| M6 Fornecedores | CORE, M1 (documentos) |
| M7 Oficina Técnica | CORE |
| M8 Planeamento | CORE, M2 (estudos), M6 (materiais) |
| Dashboards | Todos |
