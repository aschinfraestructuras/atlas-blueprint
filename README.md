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

## Quick Start (desenvolvimento local)

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd atlas-blueprint
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Preencher .env com as credenciais do projeto Supabase

# 3. Desenvolvimento
npm run dev          # Servidor local (Vite)
npm run lint         # ESLint
npm run typecheck    # Verificação de tipos TypeScript
npm run test         # Testes (Vitest)
npm run build        # Build de produção
```

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon/publishable do Supabase |
| `VITE_SUPABASE_URL` | URL da API Supabase |

Ver `.env.example` para referência completa.

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
```

---

## Estado do Projeto

O projeto encontra-se em evolução contínua, com uma base funcional alargada e documentação técnica estruturada.

Áreas em consolidação:

- Otimização de políticas RLS
- Performance de queries e índices
- Uniformização transversal entre módulos
- Reforço do audit trail
- Redução de dívida técnica

## Roadmap Técnico

- Consolidação de permissões e políticas RLS
- Otimização de índices e performance SQL
- Reforço da auditoria automática
- Melhoria dos dashboards operacionais
- Workflows de aprovação e validação
- Reforço da consistência funcional e técnica entre módulos

## Contribuição

Ver [CONTRIBUTING.md](./CONTRIBUTING.md).

## Licença

Ver [LICENSE](./LICENSE).
