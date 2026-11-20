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
│                da Dunamis, sem a _fonte/), com as versões en/ e es/ geradas a partir do português
└── dev.db       banco local (não versionar)
```

Conteúdo de cliente vive no banco, nunca em arquivo.

## Código, banco e publicação

- **Next 16 e React 19:** o Next 16 muda coisas conhecidas. Leia o guia em
  `node_modules/next/dist/docs/` antes de escrever código (o bloco do fim deste arquivo)
- **Sessão do painel:** o cookie `pl_sessao`, assinado com `SESSAO_SEGREDO` (`lib/sessao.ts`)
- **Banco:** Supabase `vertsys-db`, plano Free. O banco de desenvolvimento é o de produção. Schema
  em `prisma/schema.prisma`, migrations em `prisma/migrations/`; nunca `prisma migrate reset` nem
  `prisma db push`. Sem uso, o banco pausa: o painel e as páginas dão 500 com
  `tenant/user … not found`, e só o Bruno restaura (botão Restore no painel do Supabase). O
  `/api/manter-banco/` roda a cada 5 dias (`vercel.json`) para isso não acontecer (e, na mesma passada,
  apaga as fotos e aparências programadas que já acabaram, com as imagens)
- **Migration pendente de propósito:** a `20261026120000_titulo_do_video` tira o título "Video Apresentação
  NaLi Cuscuzbar" de um vídeo da NaLi, que está na página desde 26/10, e espera o ok do Bruno. Enquanto
  isso, `prisma migrate deploy` aplicaria ela junto: migration nova entra por `prisma db execute --file …`
  e `prisma migrate resolve --applied <nome>` (como a de 20/11/2026), e depois `prisma migrate diff
  --from-config-datasource --to-schema prisma/schema.prisma --script` precisa sair vazio
- **DMetric:** todo link que passa pelo `/ir/` leva `data-dm-link`, senão o clique some do DMetric.
  Medir velocidade com o Lighthouse sempre com `--blocked-url-patterns='*dspace.verts.me*'`, senão
  a medição conta como visita do cliente
- **Sem bateria de testes:** confira com `npm run build` e `npm run lint`. O ESLint já travou no
  Drive: se ficar parado sem gastar CPU, pare e registre
- **O repositório `vertsystems/pagelinks` é público:** nada de `.env`, chave ou dado de cliente no
  commit. Commit só dos arquivos do trabalho, pelo nome
- **Publicar** (o Bruno quer sem perguntar, desde 13/10/2026): o push no GitHub não publica, porque
  o projeto `pagelinks` da Vercel (time `vert-projects`) não está ligado a ele. O deploy sai de uma
  cópia limpa, para nenhum `.env` subir junto:

  ```bash
  D="${TMPDIR:?}/pagelinks-deploy" && rm -rf "$D" && mkdir -p "$D/.vercel" \
    && git archive HEAD | tar -x -C "$D" && cp .vercel/project.json "$D/.vercel/" \
    && cd "$D" && npx -y vercel@latest deploy --prod --yes --scope vert-projects
  ```

  Confira em dnms.fun. A URL sem a proteção da Vercel é `pagelinks-ivory.vercel.app`. Voltar
  atrás: deploy de novo a partir do commit anterior, pela mesma cópia limpa
- **A página de vendas** sobe por FTP na Hostinger, sem a `_fonte/`. Sem a credencial do FTP, quem
  sobe é o Bruno

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
- **Foto e aparência programadas** (20/11/2026, pedido do Bruno; `lib/programacoes.ts`): num período, a
  página mostra outra foto ou logo no topo (no mesmo formato e tamanho) ou outra aparência (cores, fonte,
  formato dos botões e fundo, com imagem própria), e volta sozinha à de sempre no fim. Mesmo jeito dos
  links programados: até 10 de cada por página, sem sobrepor períodos, horário de Brasília, amarela antes
  de entrar e verde no ar. A foto fica embaixo da foto do topo e a aparência no fim do bloco Aparência; a
  nova aparência já vem com a de agora. Tudo é conferido antes de a imagem subir, e as que acabaram são
  apagadas com a imagem. O "Ver na prévia" mostra a programação antes de ela entrar (`?ver=foto.<id>` ou
  `aparencia.<id>`, só para quem está logado)
- **A prévia do editor na silhueta do aparelho** (20/11/2026): celular, tablet e MacBook, todos na largura
  da coluna da prévia, que não muda mais com a tela (antes ela alargava e a coluna do editor ficava
  estreita). Tablet e computador são desenhados no tamanho deles (820×1000 e 1280×800) e reduzidos na
  proporção. Cores do aparelho por token (`--g-aparelho*`)
- **O menu do topo** (20/11/2026): flutuante, 10 px abaixo do topo, cantos arredondados, na largura do
  conteúdo (alinhado com o título da página e a borda direita), em cinza escuro de vidro nos dois temas,
  com texto e botões no cinza claro do fundo. A logo é `public/logo-pagelinks.png`, mandada pelo Bruno:
  "Page" em branco e "Links" em cinza, feita para fundo escuro (não usar em fundo claro sem tratar)
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
  com o Lighthouse, bloquear `*dspace.verts.me*`. A manchete e o texto do topo giram a cada visita entre
  9 escolhidas pelo Bruno (20/10/2026), num script logo depois do texto do topo (lista `MANCHETES`): ele
  roda antes de a tela aparecer, para o texto não trocar na frente de quem chegou, e diminui a letra
  das longas (mais de 44 letras, 14%; mais de 50, 20%) para não passarem de 4 linhas. A primeira fica
  escrita no HTML, para o Google e para quem está sem JavaScript
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
- **Três idiomas** (21/10/2026, pedido do Bruno): o `index.html` em português é a fonte, e o
  `_fonte/idiomas.mjs` gera `en/index.html` e `es/index.html` dentro do `construir.sh`, com cada texto em
  português e as duas traduções lado a lado. Mudou um texto no português, o gerador para e diz qual
  tradução falta; e no fim ele procura português que sobrou nas versões. Nunca editar `en/` e `es/` à mão.
  Fora do Brasil o preço é só **US$ 37** (mudança grande a partir de US$ 5), no cartão internacional ou
  combinado no WhatsApp, sem parcelas: o card de preço perde as 3 parcelas e os dados para o Google viram
  USD. O português leva quem chega de fora para a versão certa pelo fuso do aparelho (sem serviço de fora):
  Brasil e Portugal ficam no português, Espanha e América Latina vão para o espanhol, o resto para o inglês;
  sem fuso, vale a língua do navegador. O seletor PT · EN · ES (topo a partir do tablet, rodapé sempre) guarda
  a escolha em `pl-idioma`, que manda mais que o fuso. Robôs (Google, prévia de link) e o Lighthouse ficam no
  português. O script fica **depois** do CSS no `<head>`. As três se apontam por `hreflang` e no
  `site/sitemap.xml`, e cada uma tem a imagem de compartilhamento na língua dela (`img/og-en.png`, `og-es.png`)
- **No topo, os iPhones vêm antes do texto no HTML** (o `lg:order-last` os leva para a direita no
  computador). Com o texto antes, a internet lenta mostrava o texto sozinho e ele pulava 365 px quando os
  iPhones chegavam (CLS de 0,47). O Lighthouse não pega isso, porque carrega o HTML inteiro de uma vez:
  para conferir salto, medir com rede lenta de verdade (`Network.emulateNetworkConditions`)
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
