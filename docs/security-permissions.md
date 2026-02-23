# ATLAS — Permissões e Segurança por Projecto

> Gerado a partir do repositório e Supabase em 2026-02-23.

---

## 1. Modelo de Permissões

### 1.1 Tabela `project_members`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `project_id` | uuid FK → projects.id | Projecto |
| `user_id` | uuid FK → auth.users.id | Utilizador |
| `role` | text FK → roles.code | Papel no projecto |
| `is_active` | boolean (default true) | Permite desactivar sem remover |
| `created_at` | timestamptz | Data de atribuição |

**PK composta**: (project_id, user_id)

### 1.2 Roles Disponíveis

| Código | Nome | Descrição |
|--------|------|-----------|
| `admin` | Administrador | Controlo total do projecto |
| `project_manager` | Gestor de Projecto | Cria, edita, valida — não apaga |
| `quality_manager` | Gestor de Qualidade | Cria, edita, valida NC/PPI/Ensaios |
| `technician` | Técnico | Cria e edita registos de campo |
| `viewer` | Visualizador | Apenas leitura |

### 1.3 Funções SQL

| Função | Parâmetros | Descrição |
|--------|------------|-----------|
| `is_project_member(user_id, project_id)` | uuid, uuid | Verifica se é membro activo |
| `is_project_admin(user_id, project_id)` | uuid, uuid | Verifica se é admin activo |
| `get_project_role(user_id, project_id)` | uuid, uuid | Retorna o role do membro |
| `has_project_role(user_id, project_id, role)` | uuid, uuid, text | Verifica role específico |

Todas são `SECURITY DEFINER` e verificam `is_active = true`.

---

## 2. Matriz de Permissões por Módulo

### 2.1 Legenda

- ✅ = Permitido
- ❌ = Negado
- 🔒 = Apenas admin (RLS DELETE)

### 2.2 Tabela de Permissões

| Módulo | Acção | admin | project_manager | quality_manager | technician | viewer |
|--------|-------|-------|----------------|-----------------|------------|--------|
| **Projects** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Editar | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Apagar | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Work Items** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **PPI** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Editar/Inspecção | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Validar (aprovar) | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Ensaios** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Validar (aprovar) | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **NC** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Transição estado | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Documentos** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Aprovar | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Fornecedores** | Ver | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Criar | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Subempreiteiros** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Editar | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Oficina Técnica** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Planos** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Topografia** | Ver | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Criar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Editar | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Apagar | 🔒 | ❌ | ❌ | ❌ | ❌ |
| **Audit Log** | Ver | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Modificar | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Settings** | Ver | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Gerir membros | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. RLS — Políticas por Tabela

### 3.1 Padrão Standard (14 tabelas)

```sql
-- SELECT: qualquer membro activo do projecto
USING (is_project_member(auth.uid(), project_id))

-- INSERT: qualquer membro activo
WITH CHECK (is_project_member(auth.uid(), project_id))

-- UPDATE: qualquer membro activo
USING (is_project_member(auth.uid(), project_id))

-- DELETE: apenas admin do projecto
USING (is_project_admin(auth.uid(), project_id))
```

Tabelas com este padrão:
`work_items`, `ppi_instances`, `ppi_templates`, `ppi_template_items`, `test_results`, `tests_catalog`,
`non_conformities`, `documents`, `document_files`, `document_versions`, `technical_office_items`,
`plans`, `survey_records`, `subcontractors`

### 3.2 Excepções

| Tabela | Diferença |
|--------|-----------|
| `suppliers` | SELECT restrito a admin/project_manager/quality_manager |
| `attachments` | DELETE pelo uploader ou admin; sem UPDATE |
| `document_links` | Acesso via JOIN com documents; sem UPDATE |
| `audit_log` | SELECT público; INSERT requer auth; UPDATE/DELETE requer super_admin/tenant_admin |
| `profiles` | SELECT: self ou admin do projecto partilhado; UPDATE: self only |
| `project_members` | CRUD restrito a project admin + tenant_admin + super_admin |
| `projects` | Múltiplas políticas (creator, member, admin, tenant_admin) |

---

## 4. Frontend — Enforcement

### 4.1 Hook `useProjectRole()`

```typescript
const { role, canCreate, canEdit, canDelete, canValidate, isAdmin, isManager, isQuality, can } = useProjectRole();
```

O hook consulta `project_members` para o user + activeProject e expõe flags booleanas.

### 4.2 Componente `<RoleGate>`

```tsx
<RoleGate action="create">
  <Button>Novo Item</Button>
</RoleGate>

<RoleGateAdmin>
  <Button variant="destructive">Apagar</Button>
</RoleGateAdmin>
```

### 4.3 Regra de ouro

- Frontend esconde botões → UX limpa
- Backend (RLS) valida → segurança real
- Nunca confiar apenas no frontend

---

## 5. Fluxo de Projecto

```
1. Utilizador cria projecto → trigger fn_add_creator_as_project_admin
2. Admin convida membros → INSERT em project_members com role
3. Membro faz login → ProjectContext carrega apenas projectos onde é membro
4. Membro selecciona projecto → useProjectRole() retorna o seu role
5. UI adapta-se → botões visíveis conforme role
6. Qualquer operação → RLS valida no backend
```

---

## 6. Checklist de Segurança

- [x] Todas as tabelas de negócio têm RLS habilitado
- [x] Todas as tabelas filtram por `project_id` via `is_project_member`
- [x] DELETE restrito a admin em todas as tabelas de negócio
- [x] Funções RPC são `SECURITY DEFINER` com `SET search_path`
- [x] Suppliers têm SELECT restrito por role
- [x] Profiles têm acesso restrito (self + admin do projecto)
- [x] Audit log é append-only para utilizadores normais
- [x] Frontend usa `<RoleGate>` para esconder acções
- [x] `is_active` permite desactivar membros sem apagar
- [ ] Leaked Password Protection — activar em Supabase Auth Settings
