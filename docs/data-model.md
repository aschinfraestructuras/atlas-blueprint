# ATLAS — Data Model: Inventário Completo

> Gerado a partir do schema Supabase em 2026-02-23.

---

## 1. Tabelas de Infraestrutura

### 1.1 `tenants`

**Objectivo**: Organizações / empresas (multi-tenancy).

| Campo | Tipo | Nullable | Default | Nota |
|-------|------|----------|---------|------|
| `id` | uuid PK | N | `gen_random_uuid()` | |
| `name` | text | N | — | Nome da organização |
| `tax_id` | text | S | — | NIF / CIF |
| `country` | text | S | `'PT'` | PT, ES |
| `created_at` | timestamptz | N | `now()` | |
| `updated_at` | timestamptz | N | `now()` | |

**RLS**: Super admin (ALL), utilizador vê próprio tenant.

---

### 1.2 `profiles`

**Objectivo**: Dados de perfil do utilizador (extensão de `auth.users`).

| Campo | Tipo | Nullable | Default | Nota |
|-------|------|----------|---------|------|
| `id` | uuid PK | N | `gen_random_uuid()` | |
| `user_id` | uuid UNIQUE | N | — | ref. `auth.users` (sem FK directa) |
| `full_name` | text | S | — | |
| `email` | text | S | — | |
| `phone` | text | S | — | |
| `avatar_url` | text | S | — | |
| `tenant_id` | uuid FK → `tenants.id` | S | — | |
| `created_at` | timestamptz | N | `now()` | |
| `updated_at` | timestamptz | N | `now()` | |

**Trigger**: `handle_new_user()` cria perfil no registo auth.

---

### 1.3 `user_roles`

**Objectivo**: Roles globais (super_admin, tenant_admin, project_manager, quality_manager, technician, viewer).

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `user_id` | uuid | N | — |
| `role` | enum `app_role` | N | — |
| `created_at` | timestamptz | N | `now()` |

---

### 1.4 `roles`

**Objectivo**: Lookup de roles de projecto.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `code` | text PK | N | — |
| `name` | text | N | — |

Valores: `admin`, `quality_manager`, `quality_tech`, `site_manager`, `lab_tech`, `surveyor`, `inspector`, `viewer`.

---

### 1.5 `projects`

**Objectivo**: Obras / projectos.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `tenant_id` | uuid FK → `tenants.id` | S | — |
| `code` | text | N | — |
| `name` | text | N | — |
| `status` | text | N | `'active'` |
| `client` | text | S | — |
| `location` | text | S | — |
| `start_date` | date | S | — |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

**Trigger**: `fn_add_creator_as_project_admin()` adiciona criador como admin.

---

### 1.6 `project_members`

**Objectivo**: Associação utilizador ↔ projecto com role.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `project_id` | uuid FK → `projects.id` | N | — |
| `user_id` | uuid | N | — |
| `role` | text FK → `roles.code` | N | — |
| `created_at` | timestamptz | N | `now()` |

**PK Composta**: `(project_id, user_id)`.

---

### 1.7 `audit_log`

**Objectivo**: Registo de auditoria para todas as operações.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | bigint PK (serial) | N | auto |
| `project_id` | uuid FK → `projects.id` | S | — |
| `user_id` | uuid | S | — |
| `entity` | text | N | — |
| `entity_id` | uuid | S | — |
| `action` | text | N | — |
| `module` | text | S | — |
| `description` | text | S | — |
| `diff` | jsonb | S | — |
| `performed_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |

---

## 2. Tabelas de Negócio

### 2.1 `work_items`

**Objectivo**: Frentes de trabalho / actividades com estacionamento linear.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `sector` | text | N | — |
| `disciplina` | text | N | `'geral'` |
| `disciplina_outro` | text | S | — |
| `obra` | text | S | — |
| `parte` | text | S | — |
| `lote` | text | S | — |
| `elemento` | text | S | — |
| `pk_inicio` | numeric | S | — |
| `pk_fim` | numeric | S | — |
| `status` | text | N | `'planned'` |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.2 `documents`

**Objectivo**: Repositório documental com versionamento e formulários dinâmicos.

| Campo | Tipo | Nullable | Default | Nota |
|-------|------|----------|---------|------|
| `id` | uuid PK | N | `gen_random_uuid()` | |
| `project_id` | uuid FK → `projects.id` | N | — | |
| `code` | text | S | — | Auto-gerado: `DOC-<PROJ>-NNNN` |
| `title` | text | N | — | |
| `doc_type` | text | N | — | |
| `type_outro` | text | S | — | |
| `disciplina` | text | N | `'geral'` | |
| `disciplina_outro` | text | S | — | |
| `status` | text | N | `'draft'` | draft → in_review → approved → obsolete → archived |
| `version` | text | N | `'1.0'` | |
| `revision` | text | S | — | |
| `tags` | text[] | S | `'{}'` | |
| `form_schema` | jsonb | S | — | JSON Schema para formulários dinâmicos |
| `form_data` | jsonb | S | — | Payload do formulário preenchido |
| `file_path` | text | S | — | Path no storage (versão actual) |
| `file_name` | text | S | — | |
| `file_size` | bigint | S | — | |
| `file_url` | text | S | — | |
| `mime_type` | text | S | — | |
| `current_version_id` | uuid FK → `document_versions.id` | S | — | |
| `is_deleted` | boolean | N | `false` | Soft delete |
| `issued_at` | date | S | — | |
| `approved_by` | uuid | S | — | |
| `approved_at` | timestamptz | S | — | |
| `created_by` | uuid | N | — | |
| `updated_by` | uuid | S | — | |
| `created_at` | timestamptz | N | `now()` | |
| `updated_at` | timestamptz | N | `now()` | |

---

### 2.3 `document_versions`

**Objectivo**: Histórico de versões de documentos.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `document_id` | uuid FK → `documents.id` | N | — |
| `version_number` | integer | N | `1` |
| `file_path` | text | N | — |
| `file_name` | text | S | — |
| `file_size` | bigint | S | — |
| `mime_type` | text | S | — |
| `change_description` | text | S | — |
| `is_current` | boolean | N | `true` |
| `uploaded_by` | uuid | N | — |
| `uploaded_at` | timestamptz | N | `now()` |

---

### 2.4 `document_files`

**Objectivo**: Ficheiros associados a documentos (multi-ficheiro).

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `document_id` | uuid FK → `documents.id` | N | — |
| `storage_bucket` | text | N | `'qms-files'` |
| `storage_path` | text | N | — |
| `file_name` | text | N | — |
| `mime_type` | text | S | — |
| `size` | bigint | S | — |
| `sha256` | text | S | — |
| `uploaded_by` | uuid | N | — |
| `created_at` | timestamptz | N | `now()` |

---

### 2.5 `document_links`

**Objectivo**: Ligações N–N entre documentos e qualquer entidade.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `document_id` | uuid FK → `documents.id` | N | — |
| `linked_entity_type` | text | N | — |
| `linked_entity_id` | uuid | N | — |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |

`linked_entity_type` ∈ `{ work_items, ppi_instances, test_results, non_conformities, suppliers, subcontractors }`.

---

### 2.6 `tests_catalog`

**Objectivo**: Catálogo de tipos de ensaio por projecto.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `code` | text | N | — |
| `name` | text | N | — |
| `standard` | text | S | — |
| `standards` | text[] | S | `'{}'` |
| `disciplina` | text | N | `'geral'` |
| `disciplina_outro` | text | S | — |
| `material` | text | S | — |
| `material_outro` | text | S | — |
| `laboratorio` | text | S | — |
| `laboratorio_outro` | text | S | — |
| `frequency` | text | S | — |
| `acceptance_criteria` | text | S | — |
| `unit` | text | S | — |
| `description` | text | S | — |
| `active` | boolean | N | `true` |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.7 `test_results`

**Objectivo**: Resultados individuais de ensaios.

| Campo | Tipo | Nullable | Default | Nota |
|-------|------|----------|---------|------|
| `id` | uuid PK | N | `gen_random_uuid()` | |
| `project_id` | uuid FK → `projects.id` | N | — | |
| `test_id` | uuid FK → `tests_catalog.id` | N | — | Tipo de ensaio |
| `code` | text | S | — | Auto: `ENS-<PROJ>-NNNN` |
| `date` | date | N | `CURRENT_DATE` | |
| `status` | text | N | `'pending'` | State machine |
| `pass_fail` | text | S | — | |
| `sample_ref` | text | S | — | |
| `location` | text | S | — | |
| `pk_inicio` | numeric | S | — | |
| `pk_fim` | numeric | S | — | |
| `material` | text | S | — | |
| `material_outro` | text | S | — | |
| `report_number` | text | S | — | |
| `notes` | text | S | — | |
| `result` | jsonb | S | `'{}'` | Legacy |
| `result_payload` | jsonb | S | `'{}'` | Dados do resultado |
| `supplier_id` | uuid FK → `suppliers.id` | S | — | |
| `subcontractor_id` | uuid FK → `subcontractors.id` | S | — | |
| `work_item_id` | uuid FK → `work_items.id` | S | — | |
| `created_by` | uuid | S | — | |
| `updated_by` | uuid | S | — | |
| `reviewed_by` | uuid | S | — | |
| `reviewed_at` | timestamptz | S | — | |
| `approved_by` | uuid | S | — | |
| `approved_at` | timestamptz | S | — | |
| `created_at` | timestamptz | N | `now()` | |
| `updated_at` | timestamptz | N | `now()` | |

---

### 2.8 `ppi_templates`

**Objectivo**: Modelos de PPI por actividade.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `code` | text | N | — |
| `title` | text | N | — |
| `description` | text | S | — |
| `disciplina` | text | N | — |
| `disciplina_outro` | text | S | — |
| `version` | integer | N | `1` |
| `is_active` | boolean | N | `true` |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.9 `ppi_template_items`

**Objectivo**: Pontos de controlo do template.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `template_id` | uuid FK → `ppi_templates.id` | N | — |
| `item_no` | integer | N | — |
| `check_code` | text | N | — |
| `label` | text | N | — |
| `method` | text | S | — |
| `acceptance_criteria` | text | S | — |
| `required` | boolean | N | `true` |
| `evidence_required` | boolean | N | `false` |
| `sort_order` | integer | N | `0` |

---

### 2.10 `ppi_instances`

**Objectivo**: Instâncias de PPI (inspeções realizadas).

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `work_item_id` | uuid FK → `work_items.id` | N | — |
| `template_id` | uuid FK → `ppi_templates.id` | S | — |
| `code` | text | N | — |
| `status` | text | N | `'draft'` |
| `inspection_date` | date | S | `CURRENT_DATE` |
| `inspector_id` | uuid | S | — |
| `disciplina_outro` | text | S | — |
| `opened_at` | timestamptz | N | `now()` |
| `closed_at` | timestamptz | S | — |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.11 `ppi_instance_items`

**Objectivo**: Itens individuais de inspeção.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `instance_id` | uuid FK → `ppi_instances.id` | N | — |
| `item_no` | integer | N | — |
| `check_code` | text | N | — |
| `label` | text | N | — |
| `result` | text | N | `'na'` |
| `notes` | text | S | — |
| `requires_nc` | boolean | N | `false` |
| `nc_id` | uuid FK → `non_conformities.id` | S | — |
| `evidence_file_id` | uuid FK → `document_files.id` | S | — |
| `checked_by` | uuid | S | — |
| `checked_at` | timestamptz | S | — |

---

### 2.12 `non_conformities`

**Objectivo**: Registo e gestão de não-conformidades.

| Campo | Tipo | Nullable | Default | Nota |
|-------|------|----------|---------|------|
| `id` | uuid PK | N | `gen_random_uuid()` | |
| `project_id` | uuid FK → `projects.id` | N | — | |
| `code` | text | S | — | Auto: `NC-<PROJ>-<ANO>-NNNN` |
| `title` | text | S | — | |
| `description` | text | N | — | |
| `severity` | text | N | `'medium'` | minor, major, critical |
| `category` | text | N | `'qualidade'` | |
| `category_outro` | text | S | — | |
| `origin` | text | N | `'manual'` | manual, ppi, test, audit |
| `status` | text | N | `'open'` | State machine |
| `reference` | text | S | — | |
| `responsible` | text | S | — | |
| `assigned_to` | uuid | S | — | |
| `owner` | uuid | S | — | |
| `approver` | uuid | S | — | |
| `due_date` | date | S | — | |
| `detected_at` | date | N | `CURRENT_DATE` | |
| `closure_date` | date | S | — | |
| `root_cause` | text | S | — | |
| `correction` | text | S | — | |
| `corrective_action` | text | S | — | |
| `preventive_action` | text | S | — | |
| `verification_method` | text | S | — | |
| `verification_result` | text | S | — | |
| `verified_by` | uuid | S | — | |
| `verified_at` | timestamptz | S | — | |
| `work_item_id` | uuid FK → `work_items.id` | S | — | |
| `ppi_instance_id` | uuid FK → `ppi_instances.id` | S | — | |
| `ppi_instance_item_id` | uuid FK → `ppi_instance_items.id` | S | — | |
| `test_result_id` | uuid FK → `test_results.id` | S | — | |
| `document_id` | uuid FK → `documents.id` | S | — | |
| `supplier_id` | uuid FK → `suppliers.id` | S | — | |
| `subcontractor_id` | uuid FK → `subcontractors.id` | S | — | |
| `origin_entity_type` | text | S | — | |
| `origin_entity_id` | uuid | S | — | |
| `created_by` | uuid | S | — | |
| `updated_by` | uuid | S | — | |
| `created_at` | timestamptz | N | `now()` | |
| `updated_at` | timestamptz | N | `now()` | |

---

### 2.13 `suppliers`

**Objectivo**: Fornecedores de materiais e serviços.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `name` | text | N | — |
| `nif_cif` | text | S | — |
| `category` | text | S | — |
| `status` | text | N | `'active'` |
| `approval_status` | text | N | `'pending'` |
| `contacts` | jsonb | S | `'{}'` |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.14 `subcontractors`

**Objectivo**: Subempreiteiros associados a projectos.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `name` | text | N | — |
| `trade` | text | S | — |
| `contact_email` | text | S | — |
| `status` | text | N | `'active'` |
| `supplier_id` | uuid FK → `suppliers.id` | S | — |
| `created_by` | uuid | N | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.15 `technical_office_items`

**Objectivo**: RFIs, submittals, e itens da oficina técnica.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `type` | text | N | `'RFI'` |
| `title` | text | N | — |
| `description` | text | S | — |
| `status` | text | N | `'open'` |
| `due_date` | date | S | — |
| `created_by` | uuid | N | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.16 `plans`

**Objectivo**: Planos de qualidade (PQO, PIE, etc.).

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `title` | text | N | — |
| `plan_type` | text | N | `'PQO'` |
| `revision` | text | S | `'0'` |
| `status` | text | N | `'draft'` |
| `file_url` | text | S | — |
| `created_by` | uuid | N | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.17 `survey_records`

**Objectivo**: Registos de topografia / levantamento.

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `area_or_pk` | text | N | — |
| `date` | date | N | `CURRENT_DATE` |
| `description` | text | S | — |
| `file_url` | text | S | — |
| `status` | text | N | `'pending'` |
| `created_by` | uuid | N | — |
| `created_at` | timestamptz | N | `now()` |
| `updated_at` | timestamptz | N | `now()` |

---

### 2.18 `attachments`

**Objectivo**: Ficheiros genéricos associados a qualquer entidade (polimórfico).

| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| `id` | uuid PK | N | `gen_random_uuid()` |
| `project_id` | uuid FK → `projects.id` | N | — |
| `entity_type` | text | N | — |
| `entity_id` | uuid | N | — |
| `file_path` | text | N | — |
| `file_name` | text | N | — |
| `mime_type` | text | S | — |
| `file_size` | bigint | S | — |
| `uploaded_by` | uuid | S | — |
| `created_by` | uuid | S | — |
| `created_at` | timestamptz | N | `now()` |

---

## 3. Enums e Valores de Referência

### 3.1 `app_role` (Postgres ENUM)

`super_admin`, `tenant_admin`, `project_manager`, `quality_manager`, `technician`, `viewer`.

### 3.2 Project Roles (tabela `roles`)

`admin`, `quality_manager`, `quality_tech`, `site_manager`, `lab_tech`, `surveyor`, `inspector`, `viewer`.

### 3.3 Disciplinas (convenção partilhada)

`geral`, `terraplenagem`, `pavimentacao`, `drenagem`, `estruturas`, `betao`, `geotecnia`, `topografia`, `ambiente`, `seguranca`, `outro`.

### 3.4 Status por Entidade

| Entidade | Valores |
|----------|---------|
| Project | `active`, `inactive`, `completed`, `archived` |
| Work Item | `planned`, `in_progress`, `completed`, `on_hold` |
| Document | `draft`, `in_review`, `approved`, `obsolete`, `archived` |
| Test Result | `draft`, `pending`, `in_progress`, `completed`, `approved`, `archived` (+legacy: `pass`, `fail`, `inconclusive`) |
| PPI Instance | `draft`, `in_progress`, `submitted`, `approved`, `rejected`, `archived` |
| NC | `draft`, `open`, `in_progress`, `pending_verification`, `closed`, `archived` |
| Supplier | status: `active`, `inactive`, `suspended` · approval: `pending`, `approved`, `suspended`, `blocked` |
| Subcontractor | `active`, `inactive`, `suspended` |
| Plan | `draft`, `approved`, `obsolete` |
| Survey | `pending`, `validated`, `rejected` |
| Technical Office | `open`, `in_progress`, `closed` |

---

## 4. Database Functions (RPCs)

| Função | Objectivo |
|--------|-----------|
| `fn_create_document` | Cria documento com código auto-gerado |
| `fn_create_new_version` | Adiciona versão a documento |
| `fn_create_test_result` | Cria resultado de ensaio com código auto |
| `fn_update_test_status` | Transição de estado de ensaio |
| `fn_create_nc` | Cria NC com código auto-gerado |
| `fn_update_nc_status` | Transição de estado de NC |
| `fn_create_nc_from_test` | Cria NC a partir de ensaio não conforme |
| `fn_create_nc_from_ppi_item` | Cria NC a partir de item PPI |
| `fn_create_ppi_instance` | Cria instância PPI com cópia de template |
| `fn_ppi_instance_transition` | Transição de estado de PPI |
| `fn_ppi_bulk_mark_ok` | Marca todos os itens pendentes como OK |
| `fn_ppi_bulk_save_items` | Salva múltiplos itens em batch |
| `fn_next_ppi_code` | Gera próximo código PPI |
| `fn_bulk_export_tests` | Export bulk de ensaios |
| `is_project_member` | Verifica se user é membro |
| `is_project_admin` | Verifica se user é admin |
| `get_project_role` | Retorna role do user no projecto |
| `has_role` | Verifica role global |
| `get_user_tenant_id` | Retorna tenant do user |
| `log_audit` | Regista entrada no audit_log |

---

## 5. Storage

| Bucket | Público | Uso |
|--------|---------|-----|
| `qms-files` | Não | Ficheiros de documentos, versões |
| `atlas_files` | Não | Anexos gerais |
| `project-files` | Não | Ficheiros de projecto |
