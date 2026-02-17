# 06 — RBAC & RLS (Row Level Security)

## Modelo de Autorização

### Hierarquia
```
Organization
  └── Project
       └── Project Member (user + role)
```

Um utilizador pertence a uma `organization` e é associado a uma ou mais `project` via `project_member`, cada uma com um `role`.

### Roles

| Role | Código | Descrição |
|---|---|---|
| Administrador | `admin` | Acesso total à organização e todas as obras |
| Diretor de Qualidade | `quality_manager` | Gestão do SGQ, aprovações, auditorias |
| Técnico de Qualidade | `quality_tech` | Registo de ensaios, PPI, NC em obras atribuídas |
| Diretor de Obra | `site_manager` | Visão de obra, aprovações operacionais |
| Técnico de Laboratório | `lab_tech` | Introdução de resultados de ensaios |
| Topógrafo | `surveyor` | Levantamentos e controlo geométrico |
| Fiscal / Dono de Obra | `inspector` | Consulta, assinaturas, aprovações externas |
| Visualizador | `viewer` | Leitura apenas |

### Matriz de Permissões (por módulo)

Legenda: **C**=Create, **R**=Read, **U**=Update, **D**=Delete, **A**=Approve/Transition

| Módulo | admin | quality_manager | quality_tech | site_manager | lab_tech | surveyor | inspector | viewer |
|---|---|---|---|---|---|---|---|---|
| Organizations | CRUD | R | R | R | R | R | R | R |
| Projects | CRUD | CRUD | R | R | R | R | R | R |
| Documents | CRUD+A | CRUD+A | CRU | R | R | R | R | R |
| Test Results | CRUD+A | CRU+A | CRU | R | CRU | — | R | R |
| PPI | CRUD+A | CRUD+A | CRU+A | R | R | — | R+A | R |
| NC | CRUD+A | CRUD+A | CRU | R | R | — | R | R |
| Corrective Actions | CRUD+A | CRUD+A | CRU | R | — | — | R | R |
| Audits | CRUD+A | CRUD+A | R | R | — | — | R | R |
| Suppliers | CRUD | CRUD | R | R | R | — | R | R |
| Surveys | CRUD | CRU | R | R | — | CRUD | R | R |
| Checklists | CRUD+A | CRUD+A | CRU | R+A | — | — | R | R |
| Dashboards | R | R | R | R | R | R | R | R |

## Estratégia RLS

### Princípios
1. **Isolamento por organização**: nenhum utilizador vê dados de outra organização.
2. **Isolamento por obra**: dentro da organização, cada utilizador só vê obras onde é `project_member`.
3. **Admin da organização**: vê todas as obras da sua organização.
4. **Permissões de escrita**: validadas pelo `role` do `project_member`.

### Padrões de Policy

#### Leitura (SELECT)
```sql
-- Utilizador é membro do projeto OU admin da organização
CREATE POLICY "read_own_project_data" ON <table>
FOR SELECT USING (
  project_id IN (
    SELECT pm.project_id FROM project_member pm
    WHERE pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM project p
    JOIN organization_member om ON om.organization_id = p.organization_id
    WHERE p.id = <table>.project_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
  )
);
```

#### Escrita (INSERT/UPDATE)
```sql
-- Utilizador é membro do projeto com role adequado
CREATE POLICY "write_own_project_data" ON <table>
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_member pm
    WHERE pm.project_id = NEW.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'quality_manager', 'quality_tech')
  )
);
```

#### Tabelas sem `project_id` direto
- `document_version` → join via `document.project_id`
- `itp_checkpoint` → join via `itp.project_id`
- `audit_finding` → join via `audit.project_id`
- `corrective_action` → join via `nonconformity.project_id`
- `attachment` → resolvido via `entity_type` + `entity_id` (helper function)

### Helper Functions (security definer)
```
fn_user_has_project_access(p_project_id uuid) → boolean
fn_user_project_role(p_project_id uuid) → text
fn_user_org_role(p_org_id uuid) → text
```

### Notas de Implementação
- Todas as tabelas com dados de obra têm `project_id` (ou path indireto).
- `test_type` é global (sem RLS restritivo, todos lêem).
- `organization` e `supplier` filtrados por `organization_id`.
- Storage buckets: RLS por `project_id` no path (`{org_id}/{project_id}/...`).
- Serviço de e-mail e notificações via Edge Functions (server-side, sem RLS bypass).
