# ATLAS — Contratos de Integração

> Gerado a partir do repositório e Supabase em 2026-02-23.

---

## 1. Princípios Gerais

### 1.1 Isolamento por Projecto

Toda entidade de negócio pertence a um `project_id`. Todas as queries filtram por `project_id` via RLS (`is_project_member`). Nenhuma entidade é visível fora do seu projecto.

### 1.2 Ligações

- **FK directa**: Para relações 1–N fortes (ex: `test_results.work_item_id`).
- **Tabela ponte polimórfica**: Para relações N–N flexíveis (ex: `document_links`, `attachments`).
- **Nenhuma string solta**: Todas as referências entre entidades usam UUID FK ou tabela ponte.

### 1.3 Criação via RPC

Entidades com código auto-gerado ou lógica complexa são criadas via funções `SECURITY DEFINER`:
- `fn_create_document`, `fn_create_nc`, `fn_create_test_result`, `fn_create_ppi_instance`.

---

## 2. Work Items ↔ Módulos

O **Work Item** é o nó central que une actividades de obra com as entidades de qualidade.

### 2.1 Work Items ↔ PPI

```
Contrato:
  ppi_instances.work_item_id → work_items.id (FK, obrigatório)

Regras:
  - Cada PPI pertence a exactamente 1 Work Item.
  - Um Work Item pode ter N PPI (inspeções em datas diferentes).
  - A criação de PPI requer work_item_id (fn_create_ppi_instance).
  - A disciplina do PPI herda do Work Item ou do template.

UI:
  - WorkItemDetailPage → tab "PPI" mostra instâncias associadas.
  - PPIInstanceFormDialog requer selecção de Work Item.
```

### 2.2 Work Items ↔ Ensaios

```
Contrato:
  test_results.work_item_id → work_items.id (FK, opcional)

Regras:
  - Um ensaio pode estar associado a 0 ou 1 Work Item.
  - Um Work Item pode ter N ensaios.
  - O estacionamento (pk_inicio/pk_fim) do ensaio pode diferir do Work Item.
  - fn_create_test_result aceita p_work_item_id opcional.

UI:
  - WorkItemDetailPage → tab "Ensaios" mostra resultados associados.
  - TestResultFormDialog permite seleccionar Work Item.
```

### 2.3 Work Items ↔ NC

```
Contrato:
  non_conformities.work_item_id → work_items.id (FK, opcional)

Regras:
  - Uma NC pode estar associada a 0 ou 1 Work Item.
  - NC criada a partir de PPI herda automaticamente o work_item_id da instância PPI.
  - fn_create_nc e fn_create_nc_from_ppi_item preenchem work_item_id.

UI:
  - WorkItemDetailPage → tab "NC" mostra não-conformidades.
  - NCFormDialog permite seleccionar Work Item.
```

### 2.4 Work Items ↔ Documentos

```
Contrato:
  document_links (document_id, linked_entity_type='work_items', linked_entity_id)

Regras:
  - Relação N–N via tabela ponte.
  - Qualquer documento pode ser ligado a qualquer Work Item.
  - A ligação é bidirecional na UI.

UI:
  - WorkItemDetailPage → tab "Documentos" via LinkedDocumentsPanel.
  - DocumentDetailPage → tab "Ligações" mostra Work Items associados.
```

---

## 3. PPI ↔ NC ↔ Ensaios (Fluxo de Inspeção)

### 3.1 PPI → NC

```
Contrato:
  non_conformities.ppi_instance_id → ppi_instances.id (FK, opcional)
  non_conformities.ppi_instance_item_id → ppi_instance_items.id (FK, opcional)
  ppi_instance_items.nc_id → non_conformities.id (FK, opcional)

RPC:
  fn_create_nc_from_ppi_item(p_ppi_instance_item_id):
    1. Lê o item PPI e a instância.
    2. Cria NC com origin='ppi', título=check_code+label.
    3. Herda work_item_id da instância PPI.
    4. Actualiza ppi_instance_items.nc_id com a NC criada.

Regras:
  - Item PPI com result='nok' ou 'fail' → requires_nc = true.
  - NC é criada manualmente pelo utilizador (não automática).
  - Uma NC pode referenciar instância E item específico.
```

### 3.2 Ensaio → NC

```
Contrato:
  non_conformities.test_result_id → test_results.id (FK, opcional)

RPC:
  fn_create_nc_from_test(p_test_result_id):
    1. Lê o resultado e o catálogo.
    2. Cria NC com origin='test', descrição do ensaio.
    3. Herda work_item_id e supplier_id do resultado.

Regras:
  - Ensaio com pass_fail='fail' permite criar NC.
  - A NC refere o test_result_id para rastreabilidade.
```

### 3.3 PPI ↔ Documentos

```
Contrato:
  document_links (document_id, linked_entity_type='ppi_instances', linked_entity_id)
  ppi_instance_items.evidence_file_id → document_files.id (FK, opcional)

Regras:
  - Documentos associados via LinkedDocumentsPanel na PPIDetailPage.
  - Evidências fotográficas ligadas a itens individuais via evidence_file_id.
```

---

## 4. Fornecedores ↔ Módulos

### 4.1 Fornecedores ↔ Ensaios

```
Contrato:
  test_results.supplier_id → suppliers.id (FK, opcional)

Regras:
  - Um ensaio pode indicar o fornecedor do material testado.
  - Permite rastrear qualidade por fornecedor.
  - fn_create_test_result aceita p_supplier_id.

UI:
  - TestResultFormDialog → select de Fornecedor.
  - Filtro por fornecedor na lista de ensaios.
```

### 4.2 Fornecedores ↔ NC

```
Contrato:
  non_conformities.supplier_id → suppliers.id (FK, opcional)

Regras:
  - NC pode ser atribuída a um fornecedor.
  - NC criada a partir de ensaio herda supplier_id automaticamente.
```

### 4.3 Fornecedores ↔ Documentos

```
Contrato:
  document_links (document_id, linked_entity_type='suppliers', linked_entity_id)

Regras:
  - Certificados, seguros, alvarás → documentos ligados ao fornecedor.
  - LinkedDocumentsPanel na página de fornecedores (futuro).
```

### 4.4 Fornecedores ↔ Subempreiteiros

```
Contrato:
  subcontractors.supplier_id → suppliers.id (FK, opcional)

Regras:
  - Um subempreiteiro pode ser também um fornecedor (mesma entidade jurídica).
  - A ligação é opcional — subempreiteiro pode existir sem ser fornecedor.
```

---

## 5. Subempreiteiros ↔ Módulos

### 5.1 Subempreiteiros ↔ Work Items

```
Contrato:
  Actualmente sem FK directa work_items ↔ subcontractors.
  Ligação indirecta via test_results e non_conformities.

Evolução prevista:
  Adicionar work_items.subcontractor_id → subcontractors.id (FK, opcional)
  para rastrear que subempreiteiro executa cada frente de trabalho.
```

### 5.2 Subempreiteiros ↔ Ensaios

```
Contrato:
  test_results.subcontractor_id → subcontractors.id (FK, opcional)

Regras:
  - Ensaio pode ser associado ao subempreiteiro que executou o trabalho.
```

### 5.3 Subempreiteiros ↔ NC

```
Contrato:
  non_conformities.subcontractor_id → subcontractors.id (FK, opcional)

Regras:
  - NC pode ser imputada a um subempreiteiro.
```

### 5.4 Subempreiteiros ↔ Documentos

```
Contrato:
  document_links (document_id, linked_entity_type='subcontractors', linked_entity_id)

Regras:
  - Documentos contratuais, seguros, certificados.
```

---

## 6. Oficina Técnica ↔ Módulos

### 6.1 Tipos de Item

```
technical_office_items.type ∈ {'RFI', 'submittal', 'transmittal', 'design_change', 'other'}
```

### 6.2 Oficina Técnica ↔ Documentos

```
Contrato:
  document_links (document_id, linked_entity_type='technical_office_items', linked_entity_id)

Regras:
  - RFIs, submittals e transmittals podem ter documentos associados.
  - Respostas a RFIs são documentos ligados.

Evolução prevista:
  - Adicionar technical_office_items.document_id → documents.id (FK, opcional)
    para referência directa ao documento principal.
```

### 6.3 Oficina Técnica ↔ Planos

```
Contrato:
  Actualmente sem FK directa.
  Ambos têm project_id e podem ser cruzados via document_links.

Evolução prevista:
  - Planos (PQO, PIE, etc.) podem ser documentos formais com ligação.
  - Considerar plans.document_id → documents.id para vincular plano ao documento.
```

---

## 7. Dashboard / KPIs (Contratos de Dados)

### 7.1 Fontes de Dados

| KPI | Tabela | Query |
|-----|--------|-------|
| NC abertas / fechadas | `non_conformities` | `GROUP BY status WHERE project_id = ?` |
| NC por severidade | `non_conformities` | `GROUP BY severity` |
| Taxa de fecho de NC | `non_conformities` | `COUNT(closed) / COUNT(*)` |
| Tempo médio de resolução NC | `non_conformities` | `AVG(closure_date - detected_at)` |
| Ensaios por estado | `test_results` | `GROUP BY status` |
| Taxa de conformidade | `test_results` | `COUNT(pass_fail='pass') / COUNT(*)` |
| PPI por estado | `ppi_instances` | `GROUP BY status` |
| Cobertura PPI | `ppi_instances` vs `work_items` | `COUNT(DISTINCT work_item_id com PPI) / COUNT(work_items)` |
| Documentos por estado | `documents` | `GROUP BY status` |
| Work Items por estado | `work_items` | `GROUP BY status` |

### 7.2 Filtros Standard

Todos os KPIs suportam filtros por:
- `project_id` (obrigatório, via contexto)
- Período (`created_at BETWEEN ? AND ?`)
- `disciplina`
- `status`

---

## 8. Checklist de Conformidade para Novos Módulos

Ao criar um novo módulo, verificar:

- [ ] Tabela tem `id uuid PK DEFAULT gen_random_uuid()`
- [ ] Tabela tem `project_id uuid FK → projects.id NOT NULL`
- [ ] Tabela tem `created_at timestamptz DEFAULT now()`
- [ ] Tabela tem `updated_at timestamptz DEFAULT now()` com trigger `set_updated_at`
- [ ] Tabela tem `created_by uuid` (preenchido por RPC ou aplicação)
- [ ] Tabela tem `status text` com valores documentados (se aplicável)
- [ ] RLS habilitado com 4 políticas standard (SELECT/INSERT/UPDATE/DELETE)
- [ ] RPC `SECURITY DEFINER` se necessário (código auto-gerado, validações)
- [ ] Ligações a outras entidades por FK (nunca strings soltas)
- [ ] Se usa `disciplina`, segue o padrão partilhado
- [ ] Chaves i18n adicionadas a `pt.json` e `es.json`
- [ ] Integração com `document_links` para associar documentos
- [ ] Integração com `attachments` para ficheiros genéricos
- [ ] Entrada no `audit_log` para INSERT/UPDATE/DELETE
- [ ] Entrada neste blueprint (data-model.md, relationships-graph.md, integration-contracts.md)

---

## 9. Migrações Propostas (Normalização)

### 9.1 ⚠️ `non_conformities.responsible` — text → uuid

**Actual**: Campo `responsible` é `text` (nome livre).
**Proposta**: Manter `responsible` como text para compatibilidade, mas usar `assigned_to` (uuid) como referência principal.
**Estado**: Já implementado — `assigned_to uuid` existe e é usado na UI.

### 9.2 ⚠️ Work Items ↔ Subcontractors (FK directa)

**Actual**: Sem ligação directa.
**Proposta**: Adicionar `work_items.subcontractor_id uuid FK → subcontractors.id` (nullable).
**Impacto**: Baixo — campo opcional, sem breaking changes.
**Prioridade**: Média — útil para reporting por subempreiteiro.

### 9.3 ⚠️ Technical Office ↔ Documents (FK directa)

**Actual**: Ligação só via `document_links`.
**Proposta**: Adicionar `technical_office_items.document_id uuid FK → documents.id` (nullable).
**Impacto**: Baixo.
**Prioridade**: Baixa — `document_links` é suficiente.

### 9.4 ⚠️ Plans ↔ Documents (FK directa)

**Actual**: `plans.file_url` (text) — URL directa.
**Proposta**: Adicionar `plans.document_id uuid FK → documents.id` (nullable) para vincular ao sistema documental.
**Impacto**: Baixo.
**Prioridade**: Média — unifica gestão documental.
