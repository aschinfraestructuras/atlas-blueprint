# Contribuição — ATLAS Blueprint

## Antes de começar

1. Revê a documentação em `docs/` antes de qualquer alteração estrutural.
2. Confirma o impacto no modelo de dados, permissões (RLS/RBAC) e auditoria.
3. Mantém coerência com os princípios funcionais e arquiteturais do sistema.

## Workflow

1. Cria uma branch a partir de `main`: `feature/<nome>` ou `fix/<nome>`.
2. Implementa a alteração com commits descritivos (convenção: `feat:`, `fix:`, `refactor:`, `docs:`).
3. Corre `npm run lint`, `npm run typecheck` e `npm run test` antes de submeter.
4. Abre um Pull Request usando o template disponível.
5. Aguarda revisão — pelo menos 1 aprovação é necessária.

## Regras

- **Não** alteres migrations sem aprovação explícita.
- **Não** desatives RLS em nenhuma tabela.
- **Não** introduzas dependências sem justificação técnica.
- Testes para lógica de negócio são obrigatórios.
- Mantém a internacionalização (i18n) consistente em `pt` e `es`.

## Estrutura do Projeto

Consulta `docs/02_MODULES.md` para visão dos módulos e `docs/04_ENTITY_MAP.md` para o mapa de entidades.

## Dúvidas

Abre uma Issue com o template adequado.
