# 07 — MVP PHASE PLAN

## Visão Geral das Fases

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
Blueprint    Core +      Ensaios     Enterprise   Dashboards
(atual)      Docs        + PPI + NC  Features     + Polish
```

---

## Phase 0 — Blueprint (ATUAL)
**Objetivo:** Documentação técnica completa e validada.

**Entregáveis:**
- [x] 01_SCOPE.md
- [x] 02_MODULES.md
- [x] 03_GLOSSARY.md
- [x] 04_ENTITY_MAP.md
- [x] 05_STATE_MACHINES.md
- [x] 06_RBAC_RLS.md
- [x] 07_MVP_PHASE_PLAN.md
- [x] 08_ACCEPTANCE_CRITERIA.md
- [ ] Ficheiro de traduções i18n (PT-PT, ES)

**Critério de saída:** Todos os documentos revistos e aprovados pelo stakeholder.

---

## Phase 1 — Core + Documentos
**Objetivo:** Infraestrutura base e módulo documental funcional.

**Entidades:**
- `organization`
- `project`
- `project_member`
- `document`
- `document_version`
- `attachment`

**Funcionalidades:**
1. Autenticação (email + password)
2. Criação de organização e convite de membros
3. CRUD de obras (projects)
4. RBAC completo com RLS
5. Módulo M1 — Documentos:
   - Upload, versionamento, workflow de aprovação
   - Pesquisa e filtros
6. Sistema i18n funcional (PT-PT, ES)
7. Layout base (sidebar, header, breadcrumbs)
8. Perfil de utilizador

**Tabelas BD:** organization, project, project_member, document, document_version, attachment  
**Edge Functions:** —  
**Estimativa:** 2-3 sprints

---

## Phase 2 — Ensaios + PPI + NC
**Objetivo:** Módulos core de qualidade de obra.

**Entidades novas:**
- `test_type`
- `test_sample`
- `test_result`
- `itp`
- `itp_checkpoint`
- `itp_record`
- `nonconformity`
- `corrective_action`

**Funcionalidades:**
1. M2 — Ensaios:
   - Catálogo de tipos de ensaio (seed com ensaios comuns)
   - Registo de amostras e resultados
   - Avaliação automática de conformidade
   - Geração de relatório PDF
2. M3 — PPI:
   - Criação de PPI com checkpoints
   - Registo de inspeções com fotos
   - Ligação a ensaios e NC
3. M4 — Não-Conformidades:
   - Registo, classificação, workflow completo
   - Ações corretivas/preventivas
   - Indicadores básicos

**Tabelas BD:** test_type, test_sample, test_result, itp, itp_checkpoint, itp_record, nonconformity, corrective_action  
**Edge Functions:** PDF generation  
**Estimativa:** 3-4 sprints

---

## Phase 3 — Enterprise Features
**Objetivo:** Módulos complementares para gestão global.

**Entidades novas:**
- `audit`
- `audit_finding`
- `supplier`
- `supplier_evaluation`
- `survey`
- `work_start_checklist`
- `material_approval`
- `mix_design`

**Funcionalidades:**
1. M5 — Auditorias (plano, execução, relatório, follow-up)
2. M6 — Fornecedores (cadastro, qualificação, avaliação)
3. M7 — Oficina Técnica (topografia)
4. M8 — Planeamento & Início de Trabalhos

**Estimativa:** 3-4 sprints

---

## Phase 4 — Dashboards, Relatórios & Polish
**Objetivo:** Visão consolidada e refinamento.

**Funcionalidades:**
1. Dashboard global (KPIs por obra)
2. Dashboard por obra
3. Relatórios configuráveis (PDF/Excel)
4. Notificações (in-app + email)
5. Auditoria de ações (audit log)
6. Otimização de performance
7. Testes E2E

**Estimativa:** 2-3 sprints

---

## Resumo

| Fase | Módulos | Entidades | Sprints |
|---|---|---|---|
| 0 | — | — | 1 |
| 1 | Core, M1 | 6 | 2-3 |
| 2 | M2, M3, M4 | 8 | 3-4 |
| 3 | M5, M6, M7, M8 | 8 | 3-4 |
| 4 | Dashboards | — | 2-3 |
| **Total** | | **22 entidades** | **11-15** |
