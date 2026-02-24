# Audit Checklist — Validação por Módulo

> Checklist operacional para verificar que cada módulo do Atlas QMS está funcional, seguro e consistente.

## Legenda

- ✅ OK / Implementado
- ⚠️ Parcial / Necessita revisão
- ❌ Não implementado / Falha

---

## 1. Projetos (`projects`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar, editar, arquivar, desarquivar | ✅ |
| RLS | SELECT: `is_project_member` ou `created_by` | ✅ |
| RLS | INSERT: `created_by = auth.uid()` | ✅ |
| RLS | UPDATE/DELETE: admin ou creator | ✅ |
| Filtros | Tabs ativos/arquivados | ✅ |
| i18n | PT + ES completos | ✅ |
| Export | — (não aplicável) | — |
| Audit Log | INSERT via trigger/service | ✅ |

## 2. Documentos (`documents`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar (via RPC `fn_create_document`), editar, soft-delete | ✅ |
| Workflow | draft → in_review → approved → obsolete → archived | ✅ |
| Versioning | `document_versions` com `fn_create_new_version` | ✅ |
| RLS | Membro do projeto para SELECT/INSERT/UPDATE; admin para DELETE | ✅ |
| Filtros | Status, tipo, disciplina, pesquisa | ✅ |
| i18n | PT + ES completos | ✅ |
| Export | PDF (ficha) + CSV (listagem) | ✅ |
| Audit Log | INSERT/UPDATE/NEW_VERSION | ✅ |

## 3. Work Items (`work_items`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar, editar, filtros por disciplina/sector | ✅ |
| RLS | Membro para SELECT/INSERT/UPDATE; admin para DELETE | ✅ |
| Relações | FK para subcontractors; parent de test_results, NCs, PPIs | ✅ |
| Filtros | Disciplina, status, PK range | ✅ |
| i18n | PT + ES | ✅ |
| Export | PDF + CSV via `workItemExportService` | ✅ |
| Audit Log | INSERT/UPDATE | ✅ |

## 4. Ensaios (`test_results` + `tests_catalog`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar (via RPC `fn_create_test_result`), editar | ✅ |
| Workflow | draft → in_progress → completed → approved | ✅ |
| RLS | Membro para CRUD; admin para DELETE | ✅ |
| Filtros | Status, disciplina, work_item, supplier | ✅ |
| i18n | PT + ES | ✅ |
| Export | PDF + CSV via `testExportService` | ✅ |
| Audit Log | INSERT/STATUS_CHANGE | ✅ |

## 5. Não Conformidades (`non_conformities`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar (via RPC `fn_create_nc`), editar | ✅ |
| Workflow | open → in_progress → pending_verification → closed → archived | ✅ |
| RLS | Membro para CRUD; admin para DELETE | ✅ |
| Filtros | Status, severity, category, origin | ✅ |
| i18n | PT + ES | ✅ |
| Export | PDF + CSV via `ncExportService` | ✅ |
| Audit Log | INSERT/STATUS_CHANGE | ✅ |

## 6. PPI (`ppi_instances` + `ppi_templates`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar (via RPC `fn_create_ppi_instance`), editar items | ✅ |
| Workflow | draft → in_progress → submitted → approved/rejected | ✅ |
| RLS | Membro para CRUD; admin para DELETE | ✅ |
| Filtros | Status, template, work_item | ✅ |
| i18n | PT + ES | ✅ |
| Export | PDF + CSV via `ppiExportService` | ✅ |
| Audit Log | status_change, BULK_SAVE, BULK_MARK_OK | ✅ |

## 7. Fornecedores (`suppliers`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar, editar, filtros | ✅ |
| RLS | SELECT restrito a admin/PM/QM; INSERT/UPDATE membro; DELETE admin | ✅ |
| i18n | PT + ES | ✅ |
| Export | — | ⚠️ |
| Audit Log | INSERT/UPDATE | ✅ |

## 8. Subempreiteiros (`subcontractors`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar, editar | ✅ |
| RLS | Membro para CRUD; admin para DELETE | ✅ |
| i18n | PT + ES | ✅ |
| Export | — | ⚠️ |

## 9. Planos (`plans`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar, editar | ✅ |
| RLS | Membro para CRUD; admin para DELETE | ✅ |
| i18n | PT + ES | ✅ |

## 10. Topografia (`survey_records`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar, editar | ✅ |
| RLS | Membro para CRUD; admin para DELETE | ✅ |
| i18n | PT + ES | ✅ |

## 11. Oficina Técnica (`technical_office_items`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| CRUD | Criar, editar (RFI/Submittal/Clarification) | ✅ |
| RLS | Membro para CRUD; admin para DELETE | ✅ |
| i18n | PT + ES | ✅ |

## 12. Anexos (`attachments`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| Upload/Download | Via storage bucket `atlas_files` | ✅ |
| RLS | INSERT: membro + owner; SELECT: membro; DELETE: owner ou admin | ✅ |

## 13. Auditoria (`audit_log`)

| Aspecto | Critério | Estado |
|---------|----------|--------|
| Registo | Via services + triggers SQL | ✅ |
| RLS | SELECT: público; INSERT: auth.uid(); UPDATE/DELETE: admin roles | ✅ |
| Filtros | Módulo, data (desde/até) | ✅ |

---

## Validações Transversais

| Aspecto | Critério | Estado |
|---------|----------|--------|
| RBAC Frontend | `useProjectRole` + `RoleGate` em todas as páginas | ✅ |
| RBAC Backend | `is_project_member`, `is_project_admin`, `has_project_role` | ✅ |
| Error Handling | `classifySupabaseError` em todos os catch blocks | ✅ |
| i18n | Sem strings hardcoded nos componentes | ✅ |
| UUID Safety | Sem strings em campos UUID; validação antes de queries | ✅ |
| Multi-projeto | `activeProject` como filtro em todas as queries | ✅ |
| Storage RLS | `storage_path_project_id` para validação de paths | ✅ |

---

## Próximos Passos

- [ ] Implementar `reportService` unificado com PDFs corporativos
- [ ] Página `/admin/health` com self-checks
- [ ] Export XLSX (se necessário)
- [ ] Notificações por e-mail (NC vencida, doc pendente)
