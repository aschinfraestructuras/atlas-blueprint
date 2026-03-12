# ATLAS Blueprint

Sistema de Gestão da Qualidade para Construção Civil, concebido para suportar operações multi-projeto com rastreabilidade, controlo documental, ensaios, PPI, não conformidades, fornecedores, subempreiteiros, topografia e reporting operacional.

---

## Visão Geral

O **ATLAS Blueprint** é uma plataforma web orientada à digitalização e estruturação do controlo da qualidade em obra.

A aplicação foi desenhada para ambientes com múltiplos projetos, múltiplos utilizadores e diferentes níveis de responsabilidade, permitindo centralizar informação técnica e operacional num único sistema, com controlo de acessos, segregação de dados e rastreabilidade de ações.

O objetivo é substituir fluxos dispersos em folhas de cálculo, emails, pastas partilhadas e registos manuais por uma base digital coerente, auditável e evolutiva.

---

## Objetivos

- Centralizar a gestão documental e operacional da qualidade
- Assegurar rastreabilidade de decisões, evidências e alterações
- Suportar workflows de obra com controlo por projeto e por perfil
- Reduzir dispersão de informação e redundância de registos
- Criar uma base escalável para um SGQ digital orientado à construção civil

---

## Principais Módulos

O sistema cobre ou prevê os seguintes domínios funcionais:

- Autenticação e gestão de utilizadores
- Gestão de projetos
- Perfis, funções e permissões
- Documentos e versões documentais
- Ensaios e resultados
- Planos de inspeção e ensaio (PPI)
- Não conformidades
- Fornecedores
- Subempreiteiros
- Oficina técnica
- Planos e planeamento
- Topografia
- Work items / frentes / elementos de controlo
- Daily reports
- Materiais e lotes
- Materiais reciclados
- Auditoria e histórico de ações
- Notificações e seguimento operacional

---

## Arquitetura Técnica

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod
- i18next

### Backend / Infraestrutura

- Supabase
- PostgreSQL
- Row Level Security (RLS)
- Supabase Auth
- Supabase Storage
- Edge Functions

---

## Princípios de Desenho

- **Multi-tenant**: isolamento lógico por organização/tenant
- **Multi-projeto**: operação contextualizada por obra/projeto ativo
- **RBAC + RLS**: permissões aplicadas ao nível funcional e ao nível da base de dados
- **Auditabilidade**: registo de ações críticas e alterações relevantes
- **Modularidade**: organização por domínios funcionais
- **Escalabilidade evolutiva**: base preparada para expansão futura

---

## Estrutura do Repositório

```text
.
├── docs/                  # Documentação funcional e técnica
├── public/                # Recursos públicos estáticos
├── src/
│   ├── components/        # Componentes UI e módulos funcionais
│   ├── contexts/          # Contextos globais (auth, projeto, etc.)
│   ├── hooks/             # Hooks reutilizáveis
│   ├── i18n/              # Internacionalização
│   ├── integrations/      # Integrações externas, incluindo Supabase
│   ├── lib/               # Serviços, utilitários, tipos e lógica partilhada
│   ├── pages/             # Páginas e rotas da aplicação
│   └── test/              # Testes
├── supabase/
│   ├── migrations/        # Migrações SQL
│   ├── functions/         # Edge Functions
│   └── config.toml        # Configuração Supabase
└── ...

O projeto encontra-se em evolução contínua, com uma base funcional alargada e documentação técnica estruturada.

Trata-se de uma base aplicacional já organizada e operacional, embora existam ainda áreas em consolidação, nomeadamente:

otimização de políticas RLS

performance de queries e índices

uniformização transversal entre módulos

reforço do audit trail

redução de dívida técnica

melhoria da documentação pública do repositório

Roadmap Técnico

Linhas de evolução prioritárias:

consolidação de permissões e políticas RLS

otimização de índices e performance SQL

reforço da auditoria automática

melhoria dos dashboards operacionais

workflows de aprovação e validação

reforço da consistência funcional e técnica entre módulos

Contribuição

Este repositório suporta a evolução do ecossistema ATLAS.

Antes de introduzir alterações estruturais relevantes, recomenda-se:

rever a documentação existente em docs/

validar impacto no modelo de dados

confirmar impacto em permissões, RLS e auditoria

manter coerência com os princípios funcionais e arquiteturais do sistema

Licença

Definir de acordo com o enquadramento pretendido para o projeto.

Exemplos possíveis:

Proprietary

Internal Use Only

MIT

Apache-2.0

Até definição formal, recomenda-se não assumir utilização livre por terceiros.
