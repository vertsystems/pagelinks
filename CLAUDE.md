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
├── sitevendas/  a página de vendas do serviço (HTML + Tailwind + Alpine.js, tudo dentro da pasta):
│                mora em dunamiscompany.com.br/pagelinks/ (sobe por FTP numa pasta pagelinks/ do site
│                da Dunamis, sem a _fonte/)
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
- **A página de vendas** (`sitevendas/`, 19/10/2026; no ar em dunamiscompany.com.br/pagelinks/) vende o serviço com a marca da Dunamis,
  não a do PageLinks: Inter, uma ação só (WhatsApp), "Desenvolvido por" com o logo no topo, e o
  botão no degradê verde → verde-água do botão principal do site da Dunamis (pedido do Bruno em
  19/10/2026), com o brilho da ponta mais suave para o texto branco passar no contraste. Preço, parcelas
  e garantia seguem `../oferta/servicos/pagina-de-links.md` e aparecem em quatro lugares (topo,
  card de preço, perguntas e os dados para o Google no `<head>`): mudou lá, muda nos quatro. O card
  mostra também a parcela ao lado do preço (3x de R$ 65,67): mudou o preço, muda a parcela. A
  seção "No ar hoje" mostra 3 páginas sorteadas a cada visita entre as 32 escolhidas pelo Bruno
  (prints reais em `img/paginas/`, 500 px; as outras saem da página antes de baixar a foto). Carrossel
  foi testado e recusado (19/10/2026): ficava poluído. Tem o script do DMetric no `<head>`; para medir
  com o Lighthouse, bloquear `*dspace.verts.me*`. As manchetes alternativas ficam num comentário no
  fim do `index.html`
- **Como a página de vendas é feita** (pedido do Bruno em 19/10/2026: framework de CSS e de JS, e
  tudo dentro da pasta para o FTP): Tailwind CSS 4.3.3 compilado em `assets/css/site.css`, Alpine.js
  3.17.4 em `assets/js/alpine.min.js` (só sorteia e desenha a vitrine; a lista das 32 está em
  `assets/js/site.js`), Inter e Source Serif 4 em woff2 em `assets/fonts/`. O estilo se escreve em
  `_fonte/estilo.css` (cores da Dunamis no `@theme`, componentes como `.botao`, `.iphone` e `.vitrines`)
  e nas classes do `index.html`; depois de mudar, rodar `sh sitevendas/_fonte/construir.sh`, que
  instala o Tailwind fora do Drive, refaz o CSS e carimba `?v=` no CSS e no JS (o `.htaccess` da Dunamis
  guarda os dois por 1 mês). Cada print fica dentro de um iPhone feito em CSS (`.iphone`): a cor da
  barra de status vem do topo da página (`--cor-topo`), e `data-topo`/`data-base="claro"` deixam os
  ícones e a barrinha de baixo pretos. A do centro da vitrine (`data-pos="centro"`, que o Alpine põe)
  é 15% maior, com reflexo e pulso a cada 2,5 s; no celular só ela aparece na frente, com as outras duas
  por trás, desfocadas (`blur(5px)`) e cortadas na borda da tela, e a cada 4 s a da direita vem para a
  frente numa transição suave (20/10/2026; parado no tablet, no computador e com movimento reduzido). As de trás
  ficam com o meio na altura do meio da da frente e somem num esmaecido nas duas laterais da tela.
  No celular e no tablet, o topo põe os prints em cima e centraliza tudo; só no celular, os iPhones do
  topo somem num esmaecido de baixo para cima e o texto, 20% maior, sobe por cima dele
- **A dobra "Quem está à frente"** (20/10/2026), entre o preço e as perguntas: a bio do Bruno em
  terceira pessoa, como empresário que desenvolve soluções e sistemas (pedido dele: tom profissional,
  "atende clientes como"), num card branco por cima da foto, no modelo que ele mandou. A faixa
  "Algumas marcas com que já trabalhamos" corre dentro do card com 16 logos coloridos (`img/clientes/`,
  2x da altura que aparece): quase todos tirados das páginas dos clientes no PageLinks, e Ambev, Tetra
  Pak, Rede Krill e o selo da Casa do Tita mandados pelo Bruno (o título não diz "clientes" porque
  Ambev e Tetra Pak foram projetos de que ele participou). Os que só existiam em branco (Adventure &
  Love, Retífica Cerri, Ferreira Motors, os letreiros da Chalés Urubici e da Nali) viraram preto, e a
  Nali mantém a faixa de madeira; a Gesqual saiu porque o logo some no branco. As redes do Bruno (Instagram, Behance,
  WhatsApp e site) ficam fora do card, só o ícone, pequenas, embaixo da foto à esquerda; no celular
  vão para depois do card, que cobre a parte de baixo da foto. As imagens da faixa são lazy, e o `site.js` manda carregar todas quando
  a faixa chega perto da tela, porque o navegador não carrega as que entram andando pela animação

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
