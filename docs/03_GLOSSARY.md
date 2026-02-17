# 03 — GLOSSÁRIO / GLOSARIO

Termos normalizados usados em todo o sistema. Cada entidade tem um nome canónico em inglês (usado no código) e tradução oficial PT-PT / ES.

| Código | PT-PT | ES | Definição |
|---|---|---|---|
| `organization` | Organização | Organización | Entidade jurídica (empresa) |
| `project` | Obra / Projeto | Obra / Proyecto | Empreitada ou contrato de construção |
| `project_member` | Membro da Obra | Miembro de Obra | Utilizador associado a uma obra com papel |
| `document` | Documento | Documento | Ficheiro controlado (procedimento, registo, plano) |
| `document_version` | Versão de Documento | Versión de Documento | Revisão numerada de um documento |
| `test_type` | Tipo de Ensaio | Tipo de Ensayo | Definição paramétrica de um ensaio (ex.: Proctor Modificado) |
| `test_sample` | Amostra | Muestra | Porção de material recolhida para ensaio |
| `test_result` | Resultado de Ensaio | Resultado de Ensayo | Dados numéricos/qualitativos de um ensaio realizado |
| `itp` | PPI (Plano de Pontos de Inspeção) | PPI (Plan de Puntos de Inspección) | Grelha de controlos por atividade |
| `itp_checkpoint` | Ponto de Controlo | Punto de Control | Linha individual do PPI |
| `itp_record` | Registo de Inspeção | Registro de Inspección | Execução de um ponto de controlo |
| `nonconformity` | Não-Conformidade (NC) | No Conformidad (NC) | Desvio face a requisito |
| `corrective_action` | Ação Corretiva/Preventiva | Acción Correctiva/Preventiva | Medida para eliminar causa de NC |
| `audit` | Auditoria | Auditoría | Avaliação sistemática de conformidade |
| `audit_finding` | Constatação | Hallazgo | Observação resultante de auditoria |
| `supplier` | Fornecedor / Subempreiteiro | Proveedor / Subcontratista | Entidade externa que fornece materiais ou serviços |
| `supplier_evaluation` | Avaliação de Fornecedor | Evaluación de Proveedor | Classificação periódica de desempenho |
| `survey` | Levantamento Topográfico | Levantamiento Topográfico | Trabalho de topografia |
| `work_start_checklist` | Checklist de Início | Checklist de Inicio | Verificação prévia ao arranque de atividade |
| `material_approval` | Aprovação de Material | Aprobación de Material | Validação de material antes de aplicação |
| `mix_design` | Estudo de Composição | Estudio de Composición | Formulação de mistura (betão, betuminoso, solo-cimento) |
| `attachment` | Anexo | Anexo | Ficheiro (foto, PDF) associado a qualquer entidade |
| `role` | Papel | Rol | Função de autorização no sistema |

## Convenções
- **Código**: sempre `snake_case`, inglês, singular.
- **UI**: exibe o termo na língua ativa do utilizador.
- **BD**: colunas e tabelas usam o código inglês.
- **Abreviaturas aceites**: NC, PPI/ITP, AC/AP, SGQ/SGC.
