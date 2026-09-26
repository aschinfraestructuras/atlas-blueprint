---
name: MQT (Mapa de Quantidades e Trabalhos)
description: Módulo isolado de importação e consulta do mapa de quantidades contratual via XML, com preços restritos a admins
type: feature
---

O módulo MQT (`/mqt`) gere o Mapa de Quantidades e Trabalhos contratual do projeto.

**Tabela `mqt_items`**: armazena estrutura hierárquica (code_rubrica, parent_code, nivel, familia), distinguindo agrupadores de itens folha (`is_leaf`) e extraindo PKs da designação via regex (pk_inicio_mqt, pk_fim_mqt). Cada importação é versionada (`mqt_version`) — reimportar com a mesma versão substitui os itens.

**Vistas**:
- `vw_mqt_items_safe`: lista itens com `preco_unitario`/`preco_total` mascarados a NULL para não-admins (CASE com EXISTS em project_members).
- `vw_mqt_summary`: agrega totais por família (volume m³, área m², comprimento m, nº itens, nº itens com PK). Total monetário só visível a admins.

**Permissões (RLS)**: leitura para qualquer membro ativo do projeto; INSERT/UPDATE/DELETE restrito a `role='admin'`. Frontend usa `useProjectRole().isAdmin` para mostrar o botão "Importar XML" e o `MqtImportDialog`.

**Parser XML** (`mqtService.parseMqtXml`): tolerante a variantes de tags (CodeRubrica/Codigo, Designacao/Descricao, Quantidade/Qtd, Unidade/Un, PrecoUnitario/Preco). Calcula automaticamente nivel, parent_code e familia (prefixo F-NN). Insere em lotes de 500.

**Isolamento**: módulo independente — não toca em work_items, NCs, PPIs ou outros fluxos. Está preparado para integração futura via correspondência por PK quando os work_items tiverem `pk_inicio`/`pk_fim` preenchidos.
