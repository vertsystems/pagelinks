# PageLinks — produto Vert Systems

> Projeto criado em 25/08/2026. Instruções aqui sobrescrevem as da marca e da raiz.

## Sobre

Serviço de **páginas de links** vendido a clientes (o "link da bio"). Hoje cada página
é um site WordPress separado — modelo que não escala: cada atualização vira trabalho
manual, cada cliente é uma instalação para manter, atualizar e quebrar.

O PageLinks substitui isso por **um sistema só**: as páginas de todos os clientes
servidas pela mesma aplicação, e um painel próprio onde a Dunamis (e, se decidido, o
próprio cliente) edita cards, links e informações sem tocar em código — o que o
WordPress com Elementor fazia, sem o WordPress.

## Tipo

Produto interno da Vert Systems, vendido a clientes.

## Entregas previstas

- **Páginas públicas** — a página de links de cada cliente, rápida e responsiva
- **Painel de gestão** — CRUD de clientes, páginas, cards, links, tema e informações
- **Migração** — trazer as páginas que já existem no WordPress
- **Editor visual** — edição direta, sem código, com preview

## Onde salvar o que

**Tudo do PageLinks vive nesta pasta** — ela é a raiz do produto, e cada produto novo
da Vert Systems ganha a sua, no mesmo nível.

```
pagelinks/
├── CLAUDE.md · briefing.md · arquitetura.md   contexto e decisões
├── app/         rotas do Next (App Router): [slug], ir/, painel/
├── lib/         prisma, tema e o que for compartilhado
├── prisma/      schema, migrações e seed
├── public/      arquivos estáticos
└── dev.db       banco local (não versionar)
```

Conteúdo de cliente vive no banco, nunca em arquivo.

## Contexto herdado

A pasta mora em `dunamiscompany/pagelinks/` desde 16/10/2026 (veio de `vertsystems/produtos/`),
com repositório próprio (`vertsystems/pagelinks`), fora do git da dunamiscompany. Herda as skills
e as regras do Contex OS da pasta de cima (`dunamiscompany/`), e o contexto da marca continua o da
Vert Systems (`../../vertsystems/`). **Não usa a identidade da Dunamis** — nem no painel, nem nas páginas.

## Específico deste projeto

- **A página do cliente usa a marca do cliente**, nunca a da Vert Systems. Cor, fonte
  e logo vêm do cadastro dele
- **O painel tem dois temas** (decisão do Bruno, 12/10/2026): o **claro** é o padrão, na paleta azul
  `#F0F3FA · #D5DEEF · #B1C9EF · #8AAEE0 · #638ECB · #395886`; o **escuro** é a identidade Vert Systems
  (verde `#34D399` sobre `#0B0F0D`). A troca é no botão do topo e fica num cookie. Cor nova no painel
  entra como token nos dois temas, em `app/gestao/gestao.css`, nunca fixa no módulo
- **Layout por tela** (celular, tablet, computador): tamanho, espaço e largura são por tela;
  o resto é igual nas três. Ajuste novo de layout entra em `AJUSTES` (lib/ajustes.ts) e no
  bloco "Layout por tela" do pagina.module.css, nunca como estilo fixo na página
- **Imagem entra em WebP ou PNG e sai sempre em WebP q90**, no tamanho que a página usa
  (`lib/imagens.ts`). Decisão do Bruno em 12/10/2026: PNG também, porque é mais prático
- Nenhuma página vai ao ar sem o cliente ver antes
- Página de links é peça de conversão: velocidade de carregamento e legibilidade no
  celular vêm antes de qualquer efeito visual

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
