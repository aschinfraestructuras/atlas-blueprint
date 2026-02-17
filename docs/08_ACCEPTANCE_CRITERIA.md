# 08 — ACCEPTANCE CRITERIA

Critérios objetivos e verificáveis para cada fase. Cada critério deve ser testável com resultado binário (passa / não passa).

---

## Phase 1 — Core + Documentos

### AUTH
- [ ] AC-1.1: Utilizador regista-se com email + password e recebe confirmação.
- [ ] AC-1.2: Login/logout funciona; sessão persiste ao recarregar página.
- [ ] AC-1.3: Utilizador sem sessão é redirecionado para `/login`.

### Organizações & Obras
- [ ] AC-1.4: Admin cria organização e aparece na lista.
- [ ] AC-1.5: Admin cria obra com código, nome, localização e datas.
- [ ] AC-1.6: Admin convida utilizador para obra com role específico.
- [ ] AC-1.7: Utilizador só vê obras onde é membro (RLS).

### RBAC & RLS
- [ ] AC-1.8: `viewer` não consegue criar/editar registos (erro 403 ou UI disabled).
- [ ] AC-1.9: Dados de Organização A não são visíveis para utilizadores de Organização B.
- [ ] AC-1.10: `quality_tech` cria documento; `quality_manager` aprova.

### Documentos (M1)
- [ ] AC-1.11: Utilizador cria documento com código, título e categoria.
- [ ] AC-1.12: Upload de ficheiro cria `document_version` v1.
- [ ] AC-1.13: Submissão altera status para `in_review`.
- [ ] AC-1.14: `quality_manager` aprova → status `approved`.
- [ ] AC-1.15: Rejeição permite revisão → nova versão (v2).
- [ ] AC-1.16: Documento aprovado pode ser marcado `obsolete`.
- [ ] AC-1.17: Histórico de versões acessível com changelog.
- [ ] AC-1.18: Pesquisa por código, título e categoria retorna resultados corretos.

### i18n
- [ ] AC-1.19: Alternância PT-PT ↔ ES altera todos os labels da UI imediatamente.
- [ ] AC-1.20: Datas formatadas conforme locale (dd/MM/yyyy para PT, dd/MM/yyyy para ES).
- [ ] AC-1.21: Mensagens de erro/validação traduzidas.

### Layout
- [ ] AC-1.22: Sidebar com navegação entre módulos; breadcrumbs funcionais.
- [ ] AC-1.23: Responsive: funcional em tablet (≥768px) e desktop.

---

## Phase 2 — Ensaios + PPI + NC

### Ensaios (M2)
- [ ] AC-2.1: Catálogo de tipos de ensaio pré-carregado (≥10 tipos: Proctor, densidade in situ, CBR, granulometria, LA, equiv. areia, Marshall, placas de carga, compressão betão, abaixamento).
- [ ] AC-2.2: `quality_tech` regista amostra com código, tipo de material e origem.
- [ ] AC-2.3: `lab_tech` introduz resultados conforme schema do `test_type`.
- [ ] AC-2.4: Sistema calcula `is_conforming` automaticamente com base em `acceptance_criteria`.
- [ ] AC-2.5: Resultado não-conforme é destacado visualmente (vermelho).
- [ ] AC-2.6: Resultado passa por workflow: draft → pending → validated/rejected.
- [ ] AC-2.7: Geração de relatório de ensaio em PDF com dados, resultado e conformidade.
- [ ] AC-2.8: Filtros por obra, tipo de ensaio, conformidade e período.

### PPI (M3)
- [ ] AC-2.9: Criação de PPI com título, checkpoints ordenados e tipo de controlo.
- [ ] AC-2.10: Cada checkpoint pode ter `test_type` associado.
- [ ] AC-2.11: Registo de inspeção com status (passed/failed/na), notas e fotos.
- [ ] AC-2.12: Inspeção `failed` sugere criação de NC com pré-preenchimento.
- [ ] AC-2.13: Campos de assinatura (empreiteiro + fiscalização) presentes.
- [ ] AC-2.14: Vista de progresso do PPI (% checkpoints realizados).

### Não-Conformidades (M4)
- [ ] AC-2.15: Criação de NC com código auto-incrementado, título, severidade e origem.
- [ ] AC-2.16: Workflow completo: open → under_analysis → action_planned → pending_verification → closed.
- [ ] AC-2.17: Possibilidade de reabrir NC após verificação falhada.
- [ ] AC-2.18: Registo de ações corretivas com responsável e prazo.
- [ ] AC-2.19: Ação com prazo ultrapassado muda automaticamente para `overdue`.
- [ ] AC-2.20: NC ligada à origem (itp_record, audit_finding ou test_result) com navegação direta.
- [ ] AC-2.21: Indicadores: total aberto/fechado, tempo médio de resolução, por severidade.

---

## Phase 3 — Enterprise Features

### Auditorias (M5)
- [ ] AC-3.1: Plano anual com auditorias calendarizadas.
- [ ] AC-3.2: Checklist de auditoria configurável.
- [ ] AC-3.3: Registo de constatações com tipo (conformidade, observação, NC menor, NC maior).
- [ ] AC-3.4: Constatação tipo NC gera `nonconformity` automaticamente.
- [ ] AC-3.5: Relatório de auditoria com resumo e constatações.
- [ ] AC-3.6: Workflow: planned → in_progress → report_draft → completed → closed.

### Fornecedores (M6)
- [ ] AC-3.7: Cadastro com NIF/CIF, tipo e documentos (certificados, seguros).
- [ ] AC-3.8: Workflow de qualificação: pending → qualified → suspended → blocked.
- [ ] AC-3.9: Avaliação periódica com score 0-100.
- [ ] AC-3.10: Alerta quando qualificação expira.

### Oficina Técnica (M7)
- [ ] AC-3.11: Registo de levantamento topográfico com tipo, data e anexos.
- [ ] AC-3.12: Associação a obra.

### Planeamento (M8)
- [ ] AC-3.13: Checklist de início de trabalhos com workflow de aprovação.
- [ ] AC-3.14: Aprovação de materiais com ligação a fornecedor.
- [ ] AC-3.15: Estudos de composição com fórmula (jsonb) e workflow de aprovação.

---

## Phase 4 — Dashboards & Polish

### Dashboards
- [ ] AC-4.1: Dashboard global mostra KPIs agregados de todas as obras do utilizador.
- [ ] AC-4.2: Dashboard por obra mostra: NC abertas, PPI progresso, ensaios recentes, próximas auditorias.
- [ ] AC-4.3: Gráficos interativos (evolução temporal, distribuição por severidade).

### Relatórios
- [ ] AC-4.4: Exportação de listagens para PDF e Excel.
- [ ] AC-4.5: Relatório mensal de qualidade por obra (template configurável).

### Notificações
- [ ] AC-4.6: Notificação in-app quando documento submetido para aprovação.
- [ ] AC-4.7: Notificação quando ação corretiva atinge prazo.
- [ ] AC-4.8: Email de resumo semanal (opt-in).

### Qualidade Geral
- [ ] AC-4.9: Tempo de carregamento de listagem < 2s para 1000 registos.
- [ ] AC-4.10: Todas as ações críticas registadas em audit log.
- [ ] AC-4.11: Zero erros de consola em navegação normal.

---

## Critérios Transversais (todas as fases)

- [ ] AC-T.1: Todas as strings de UI disponíveis em PT-PT e ES.
- [ ] AC-T.2: Nenhum dado é acessível fora do scope da organização/obra do utilizador (RLS).
- [ ] AC-T.3: Formulários validados client-side (Zod) e server-side (RLS + constraints).
- [ ] AC-T.4: Operações destrutivas pedem confirmação (dialog).
- [ ] AC-T.5: Feedback visual para todas as ações (toast de sucesso/erro).
- [ ] AC-T.6: Navegação por breadcrumbs funcional em todas as páginas.
