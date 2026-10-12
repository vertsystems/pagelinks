# PageLinks — arquitetura proposta

*25/08/2026 · a validar com o Bruno*

## Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Aplicação | **Next.js (App Router) + TypeScript** | Página pública renderizada no servidor (rápida e indexável) e painel na mesma base |
| Banco | **PostgreSQL via Supabase** (projeto `vertsys-db`) | Migrado do SQLite em 05/09/2026. O schema foi escrito sem Json, enum nativo ou array justamente para essa troca sair sem reescrita |
| Autenticação | **Própria, na tabela `Usuario`** (12/10/2026) | Senha em scrypt e sessão em cookie assinado, só com o `crypto` do Node. Sem dependência e sem segundo cadastro de usuário fora do banco |
| Arquivos | **Supabase Storage** (quando publicar) | Logo, avatar e imagem dos cards |
| Hospedagem | **Vercel** | Deploy por push, domínio personalizado, plano inicial gratuito |

### Detalhes que custaram tempo e ficam registrados

- **Prisma 8 é release candidate.** O `prisma init` fixa a CLI mais nova sozinho e ela
  veio 8.0.0-rc — com os comandos todos diferentes (`migration` no lugar de `migrate`).
  O projeto está fixado em **7.10**, a mesma linha do MyPokeDex
- **No Prisma 7 a URL não fica no schema.** Vai em `prisma.config.ts` para a CLI e no
  driver adapter para o runtime (`lib/prisma.ts`)
- O export do adapter é `PrismaBetterSqlite3` — e não `PrismaBetterSQLite3`
- **A conexão direta (`db.<ref>.supabase.co:5432`) só resolve em IPv6.** Funciona no
  Mac, quebra na Vercel, que é IPv4. As duas URLs do projeto passam pelo **pooler**:
  `DATABASE_URL` no modo transação (6543, runtime) e `DIRECT_URL` no modo sessão
  (5432, migração e studio). Migração não roda no modo transação

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
8. ~~Login do painel~~ — **feito** em 12/10/2026, com agendamento que mantém o banco acordado
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

## Login e agendamento — 12/10/2026

**O painel fechado.** `/gestao` só abre com sessão de admin. O login fica em `/entrar`,
e o botão **Sair** fica no topo do painel.

- **Senha:** só o hash vai para `Usuario.senhaHash` (scrypt, `lib/senha.ts`). Para criar ou
  trocar a senha de alguém: `SENHA='...' npm run db:usuario -- email@dominio.com "Nome"`
- **Sessão:** cookie `pl_sessao` assinado com HMAC (`lib/sessao.ts`), válido por 30 dias,
  `HttpOnly`. A chave é `SESSAO_SEGREDO`. Trocar a chave desloga todo mundo
- **Duas travas.** A primeira é o `proxy.ts` (o antigo middleware), que manda quem chega
  sem cookie para o login. A segunda é o `exigirAdmin()` (`lib/acesso.ts`), chamado no
  começo de **toda página e toda ação** do painel, que confere no banco se a conta existe,
  está ativa e é admin. A segunda é a que vale: ação de servidor pode ser disparada de
  outra rota, e o proxy sozinho não cobre isso. **Página ou ação nova em `/gestao` precisa
  chamar `exigirAdmin()`**
- Desativar o usuário (`ativo = false`) corta o acesso na hora, sem esperar o cookie vencer
- O papel `cliente` continua sem acesso: o login só aceita `admin`
- Endereços reservados (`gestao`, `entrar`, `ir`, `api`) não podem virar slug de cliente
- Por que não Supabase Auth: seria um segundo cadastro de usuário fora da tabela que já
  existe, uma dependência a mais e a chave secreta do Supabase no servidor, tudo isso para
  um painel com um usuário só. Se um dia o cliente entrar com "esqueci a senha" e login
  por e-mail, vale reavaliar

**O banco acordado.** No plano Free o Supabase pausa o projeto depois de 7 dias sem uso,
e foi o que aconteceu entre setembro e outubro: o `/gestao` e todas as páginas deram 500
até o Bruno restaurar o projeto no painel do Supabase. Agora o `vercel.json` agenda
`/api/manter-banco` a cada 5 dias (dias 1, 6, 11, 16, 21, 26 e 31, ao meio-dia UTC), e a
rota faz uma consulta real ao banco. Ela só responde a quem traz o `CRON_SECRET`, que é o
que a Vercel envia no agendamento. O intervalo maior entre duas chamadas é de 5 dias.

`SESSAO_SEGREDO` e `CRON_SECRET` estão no `.env` local e na Vercel (produção e preview).

## O banco no Supabase — 06/09/2026

Projeto **`vertsys-db`** (organização Vert Systems, plano Free, `us-west-2`, instância
NANO — 60 conexões). Ref: `vjzxmlccmqazuoznuhxs`.

O banco já está com a carteira dentro: **60 clientes, 60 páginas, 620 blocos**, e a
migração `20260905202826_inicial` aplicada (`prisma migrate status` limpo).

**Duas conexões, não uma:**

| Variável | Porta | Modo | Para quê |
|---|---|---|---|
| `DATABASE_URL` | 6543 | transação (`?pgbouncer=true`) | a aplicação — `lib/prisma.ts` |
| `DIRECT_URL` | 5432 | sessão | `prisma migrate`, `prisma studio` — `prisma.config.ts` |

Ambas apontam para `aws-0-us-west-2.pooler.supabase.com`, com o usuário
`postgres.<ref>`. O caminho direto (`db.<ref>.supabase.co`) ficou de fora de propósito:
é IPv6 e a Vercel não fala IPv6.

**Segurança:** RLS está ligado nas cinco tabelas e **não há nenhuma policy** — ou seja,
a API REST pública do Supabase (`anon`) não lê nada. Quem lê é o Prisma, conectado como
`postgres`, que tem `BYPASSRLS`. Se um dia o cliente for consultar o banco direto do
navegador, aí sim entram policies.

**As chaves** ficam só no `.env` (ignorado pelo git). O `.env.example` documenta o
formato sem segredo nenhum. A chave publicável é pública por definição; a secreta não
está no arquivo — pegar no dashboard quando o Storage entrar.

## Estado atual — 26/08/2026

Roda com `npm run dev` na raiz do produto (esta pasta). A carteira toda está no banco:
`/gestao` lista os 59 clientes, `/gestao/<slug>` edita, e `/<slug>` é a página pública.
A demonstração em `/demo` exercita todos os tipos de bloco.

**O painel `/gestao`** tem: lista com busca e situação, editor com prévia ao vivo ao
lado, nove tipos de bloco para adicionar, reordenação, esconder sem apagar, duplicar,
agendamento por bloco, tema por página (cores, 14 fontes, formato de botão, fundo
sólido/degradê/imagem), SEO e Open Graph, e cadastro com endereço e anotação interna.

**Login:** desde 12/10/2026 o `/gestao` exige login (ver "Login e agendamento" acima).

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
