# ATLAS — System Blueprint: Visão Geral

> Gerado a partir do repositório e Supabase em 2026-02-23.

## 1. Propósito

O ATLAS é um **Sistema de Gestão da Qualidade (SGQ)** para construção civil, multi-projeto, multi-tenant e bilingue (PT-PT / ES).
Este documento descreve os módulos existentes e planeados, o seu estado de implementação e as convenções arquitecturais que garantem coerência.

---

## 2. Arquitectura de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                      ATLAS (SPA)                        │
│  React 18 · Vite · Tailwind · shadcn/ui · i18next       │
├─────────────────────────────────────────────────────────┤
│                   Supabase Backend                       │
│  Auth · PostgREST · RLS · Storage · Edge Functions       │
└─────────────────────────────────────────────────────────┘
```

**Isolamento**: tenant_id (organização) → project_id (obra) → project_members (RBAC).

---

## 3. Módulos — Estado Actual

| # | Módulo | Tabelas Supabase | UI Pages | Estado |
|---|--------|-----------------|----------|--------|
| CORE | Auth & RBAC | `profiles`, `user_roles`, `tenants`, `project_members`, `roles` | LoginPage, SettingsPage | ✅ Prod |
| CORE | Projectos | `projects` | ProjectsPage | ✅ Prod |
| CORE | Work Items | `work_items` | WorkItemsPage, WorkItemDetailPage | ✅ Prod |
| CORE | Audit Log | `audit_log` | AuditLogPage | ✅ Prod |
| M1 | Documentos | `documents`, `document_versions`, `document_files`, `document_links` | DocumentsPage, DocumentDetailPage | ✅ Prod |
| M2 | Ensaios | `tests_catalog`, `test_results` | TestsPage | ✅ Prod |
| M3 | PPI | `ppi_templates`, `ppi_template_items`, `ppi_instances`, `ppi_instance_items` | PPIPage, PPIDetailPage, PPITemplatesPage | ✅ Prod |
| M4 | Não-Conformidades | `non_conformities` | NonConformitiesPage, NCDetailPage | ✅ Prod |
| M5 | Fornecedores | `suppliers` | SuppliersPage | ✅ Prod |
| M6 | Subempreiteiros | `subcontractors` | SubcontractorsPage | ✅ Prod |
| M7 | Oficina Técnica | `technical_office_items` | TechnicalOfficePage | ✅ Prod |
| M8 | Planos | `plans` | PlansPage | ✅ Prod |
| M9 | Topografia | `survey_records` | SurveyPage | ✅ Prod |
| — | Anexos (transversal) | `attachments` | AttachmentsPanel (componente) | ✅ Prod |
| — | Dashboard / KPIs | — (queries agregadas) | DashboardPage | 🔶 Parcial |

---

## 4. Módulos Planeados (v2+)

| Módulo | Descrição | Tabelas previstas |
|--------|-----------|-------------------|
| Auditorias (M5-ext) | Plano anual, checklists, relatório, constatações → NC | `audits`, `audit_findings`, `audit_checklists` |
| Materiais & Aprovações | Aprovação de materiais, estudos de composição | `material_approvals`, `mix_designs` |
| Avaliação de Fornecedores | Avaliação periódica, scoring, histórico | `supplier_evaluations` |
| Dashboard Avançado | KPIs cruzados, gráficos, exportação | Views/RPCs |

---

## 5. Convenções Obrigatórias

### 5.1 Campos standard por tabela

| Campo | Tipo | Regra |
|-------|------|-------|
| `id` | `uuid PK` | `DEFAULT gen_random_uuid()` |
| `project_id` | `uuid FK → projects.id` | Obrigatório em todas as tabelas de negócio |
| `created_at` | `timestamptz` | `DEFAULT now()` |
| `updated_at` | `timestamptz` | `DEFAULT now()`, trigger `set_updated_at` |
| `created_by` | `uuid` | `auth.uid()` via RPC ou default |
| `status` | `text` | Quando aplicável, com state machine no backend |

### 5.2 RLS

- Toda tabela de negócio tem RLS habilitado.
- SELECT: `is_project_member(auth.uid(), project_id)`.
- INSERT: `is_project_member(auth.uid(), project_id)`.
- UPDATE: `is_project_member(auth.uid(), project_id)`.
- DELETE: `is_project_admin(auth.uid(), project_id)`.

### 5.3 Disciplina (padronização)

Código único partilhado por Work Items, PPI Templates, Documents, Tests Catalog:

```
geral | terraplenagem | pavimentacao | drenagem | estruturas | betao |
geotecnia | topografia | ambiente | seguranca | outro
```

Quando `disciplina = 'outro'`, usar campo `disciplina_outro` (text).
Labels são resolvidos por i18n (chaves `disciplines.*`).

### 5.4 State Machines

Definidas em `src/lib/stateMachines.ts` e replicadas nas DB functions:

- **NC**: draft → open → in_progress → pending_verification → closed → archived
- **Tests**: draft → in_progress → completed → approved → archived
- **PPI**: draft → in_progress → submitted → approved/rejected → archived
- **Documents**: draft → in_review → approved → obsolete → archived

### 5.5 Código Sequencial

Padrão: `<PREFIXO>-<PROJ_CODE>-<SEQ_LPAD4>` ou `<PREFIXO>-<PROJ>-<ANO>-<SEQ>`.

| Entidade | Formato | Exemplo |
|----------|---------|---------|
| Document | `DOC-<PROJ>-0001` | DOC-A1-0001 |
| Test Result | `ENS-<PROJ>-0001` | ENS-A1-0001 |
| NC | `NC-<PROJ>-<YYYY>-0001` | NC-A1-2026-0001 |
| PPI | `PPI-<PROJ>-0001` | PPI-A1-0001 |

### 5.6 Storage

Bucket principal: `qms-files` (privado).
Path: `{project_id}/{entity_type}/{entity_id}/{timestamp}_{filename}`.

### 5.7 i18n

- Ficheiros: `src/i18n/locales/pt.json`, `es.json`.
- Nunca mostrar chaves i18n na UI ou em PDFs.
- Padrão de chave: `module.section.key` (ex: `documents.status.draft`).
