# PageLinks — arquitetura proposta

*25/08/2026 · a validar com o Bruno*

## Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Aplicação | **Next.js (App Router) + TypeScript** | Página pública renderizada no servidor (rápida e indexável) e painel na mesma base |
| Banco (agora) | **SQLite + Prisma 7** | Roda na máquina, sem conta nem chave de serviço. Constrói-se o sistema inteiro antes de contratar qualquer coisa |
| Banco (depois) | **PostgreSQL via Supabase** | Troca de provider e adapter. O schema foi escrito sem Json, enum nativo ou array justamente para isso |
| Autenticação | **Supabase Auth** (quando publicar) | Login do painel sem construir do zero |
| Arquivos | **Supabase Storage** (quando publicar) | Logo, avatar e imagem dos cards |
| Hospedagem | **Vercel** | Deploy por push, domínio personalizado, plano inicial gratuito |

### Detalhes que custaram tempo e ficam registrados

- **Prisma 8 é release candidate.** O `prisma init` fixa a CLI mais nova sozinho e ela
  veio 8.0.0-rc — com os comandos todos diferentes (`migration` no lugar de `migrate`).
  O projeto está fixado em **7.10**, a mesma linha do MyPokeDex
- **No Prisma 7 a URL não fica no schema.** Vai em `prisma.config.ts` para a CLI e no
  driver adapter para o runtime (`lib/prisma.ts`)
- O export do adapter é `PrismaBetterSqlite3` — e não `PrismaBetterSQLite3`

**O critério não foi elegância, foi manutenção:** é exatamente a stack que o Bruno já
usa em outros sistemas. Stack conhecida é stack que se conserta às 22h de uma sexta.

## Modelo de dados (esboço)

```
clientes           id · nome · slug · dominio · ativo · criado_em
paginas            id · cliente_id · titulo · bio · avatar · capa
                   tema (cores, fonte, estilo de botão) · seo
cards              id · pagina_id · tipo · titulo · subtitulo · url
                   imagem · icone · ordem · ativo · agendamento
cliques            id · card_id · data · origem        (contagem simples)
usuarios           id · email · papel (admin | cliente) · cliente_id
```

**Card com tipo** é o que dá o efeito "Elementor": link simples, botão destacado,
bloco de texto, imagem, vídeo, mapa, WhatsApp com mensagem pronta, redes sociais.
Cada tipo tem seus campos e sua forma de renderizar — e novos tipos entram sem mexer
no que já existe.

## Como as páginas são servidas

Depende da decisão 1 do briefing. As três opções, com o custo real de cada uma:

| Opção | Exemplo | Prós | Contras |
|---|---|---|---|
| **Caminho** | `pagelinks.com.br/padaria` | Um domínio só, zero configuração por cliente | A marca do cliente aparece menos |
| **Subdomínio** | `padaria.pagelinks.com.br` | Endereço limpo, ainda automático (wildcard DNS) | Exige wildcard e certificado |
| **Domínio próprio** | `links.padaria.com.br` | Melhor para a marca do cliente, mais vendável | Configuração de DNS por cliente |

**Recomendação:** começar por caminho, com o código já preparado para domínio próprio.
O roteamento por domínio é uma camada que se adiciona; refazer o modelo de dados depois
é que dói. Assim a migração acontece essa semana e o domínio bonito entra quando o
cliente pedir (e pode inclusive virar diferencial cobrado à parte).

## Migração do WordPress

As páginas atuais são poucas e o conteúdo é simples (links, textos, imagens). Duas rotas:

1. **Manual assistida** — abrir cada página, transferir o conteúdo para o painel.
   Previsível, e serve de teste real do painel enquanto ele é construído
2. **Importador** — script que lê a página publicada, extrai links, títulos e imagens e
   cria o rascunho no sistema. Vale a pena a partir de umas 8-10 páginas

A escolha depende de quantas páginas existem hoje.

## Ordem de construção

1. ~~Banco e modelo de dados~~ — **feito** (5 tabelas, migração `inicial`)
2. ~~Página pública~~ — **feita**, com tema por cliente, SEO/Open Graph e agendamento de card
3. ~~Contagem de cliques~~ — **feita**, via redirecionador `/ir/<cardId>`
4. ~~Painel de gestão em `/gestao`~~ — **feito**: lista, editor, prévia ao vivo
5. ~~Editor de blocos com reordenação~~ — **feito**
6. ~~Migração da carteira~~ — **feita**: 59 clientes, 620 blocos
7. **Upload de imagem** (avatar, imagem de bloco, fundo) ← próximo
8. Login do painel
9. Publicação: Supabase + Vercel + dnms.fun
10. Acesso do cliente ao painel, quando o Bruno decidir

## A migração da carteira — 26/08/2026

As 59 páginas do WordPress foram catalogadas a partir dos prints e importadas.

**O que veio de cada página:** título, frase de apresentação, cor de fundo, cor de
destaque, estilo de botão, tipo de fundo e — o mais importante — **a quantidade e a
ordem dos blocos**, com o tipo de cada um (link, destaque, WhatsApp, título, texto,
imagem, vídeo, redes, separador). Onde o texto do print era legível, o rótulo veio
junto; onde não era, o bloco entra marcado como "preencher".

**Números:** 620 blocos, média de 10,3 por página. A maior é a Pack Profissional, com
41; a menor tem 3.

**Contraste corrigido na importação.** A leitura de cor a partir de print é aproximada,
e 29 páginas ficaram com texto ou botão abaixo de 4.5:1. O importador passou a escolher
a cor do texto comparando o contraste real de preto e branco (em vez de um limiar de
luminância, que erra nas cores médias), e a escurecer o tom do botão quando nem preto
nem branco alcançam o mínimo. Resultado: **as 60 páginas passam em WCAG AA**. Seis
tiveram a cor do texto trocada e duas o tom do botão escurecido — todas anotadas no
campo de observação do cliente, para conferência no painel.

**Rodar de novo é seguro:** o importador encontra o cliente pelo slug e só refaz os
blocos se a página ainda estiver intocada. Página já editada no painel é preservada.

```bash
npm run db:importar
```

## Estado atual — 26/08/2026

Roda com `npm run dev` na raiz do produto (esta pasta). A carteira toda está no banco:
`/gestao` lista os 59 clientes, `/gestao/<slug>` edita, e `/<slug>` é a página pública.
A demonstração em `/demo` exercita todos os tipos de bloco.

**O painel `/gestao`** tem: lista com busca e situação, editor com prévia ao vivo ao
lado, nove tipos de bloco para adicionar, reordenação, esconder sem apagar, duplicar,
agendamento por bloco, tema por página (cores, 14 fontes, formato de botão, fundo
sólido/degradê/imagem), SEO e Open Graph, e cadastro com endereço e anotação interna.

**Ainda não tem login** — enquanto roda só na máquina, tudo bem; antes de publicar,
é obrigatório.

**Tipos de card que a página já sabe renderizar:** `link`, `destaque`, `whatsapp`
(com mensagem pronta), `titulo`, `texto`, `imagem` (clicável ou não), `video`
(YouTube e Vimeo), `redes`, `separador`.

**Por que o clique passa pelo servidor:** o link vai para `/ir/<cardId>`, que registra e
redireciona. Assim a contagem não depende de JavaScript, de bloqueador de anúncio nem
de consentimento de cookie — e nada da pessoa é guardado, só que o card foi clicado.

**Comandos:**

```bash
npm run dev          # sobe o servidor
npm run db:migrate   # aplica mudança de schema
npm run db:seed      # recria a página de demonstração
npm run db:studio    # abre o banco numa interface
```
