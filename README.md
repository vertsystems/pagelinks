# PageLinks

Páginas de links para clientes, servidas por um sistema só, com painel próprio de
gestão. Produto da Vert Systems — substitui o WordPress que hoje hospeda uma
instalação por cliente.

## Rodar

```bash
npm install
npm run db:migrate    # cria o banco local
npm run db:seed       # página de demonstração em /demo
npm run dev           # http://localhost:3000
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:migrate` | Aplica mudança de schema |
| `npm run db:seed` | Recria a página de demonstração |
| `npm run db:studio` | Abre o banco numa interface |

## Estrutura

```
app/            rotas (App Router)
  [slug]/       a página pública do cliente
  ir/[cardId]/  redirecionador que conta o clique
lib/            prisma.ts (banco) e tema.ts (cores e fontes)
prisma/         schema, migrações e seed
```

## Banco

SQLite durante a construção, PostgreSQL (Supabase) quando publicar. O schema foi
escrito sem Json, enum nativo ou array — trocar é mudar o `provider` em
`prisma/schema.prisma` e o adapter em `lib/prisma.ts`.

Prisma fixado na **7.10**. A 8.x ainda é release candidate e tem outra CLI.

## Contexto

`briefing.md` (o problema e as decisões) e `arquitetura.md` (stack, modelo de dados,
ordem de construção e estado atual).
