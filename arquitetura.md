# PageLinks — arquitetura proposta

*25/08/2026 · a validar com o Bruno*

## Stack recomendada

| Camada | Escolha | Por quê |
|---|---|---|
| Aplicação | **Next.js (App Router) + TypeScript** | Página pública renderizada no servidor (rápida e indexável) e painel na mesma base |
| Banco | **PostgreSQL via Supabase** (projeto `vertsys-db`) | Migrado do SQLite em 05/09/2026. O schema foi escrito sem Json, enum nativo ou array justamente para essa troca sair sem reescrita |
| Autenticação | **Própria, na tabela `Usuario`** (12/10/2026) | Senha em scrypt e sessão em cookie assinado, só com o `crypto` do Node. Sem dependência e sem segundo cadastro de usuário fora do banco |
| Arquivos | **Supabase Storage**, bucket `imagens` (12/10/2026) | Foto, cabeçalho, imagem de bloco e fundo, em WebP |
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
7. ~~Upload de imagem~~ — **feito** em 12/10/2026 (foto, cabeçalho, bloco e fundo), ver "Imagens" abaixo
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

## Saúde do sistema — 14/10/2026

Página `/gestao/saude` (botão "Saúde" no topo do painel): o que vale acompanhar, com um
resumo em verde, amarelo e vermelho e o motivo de cada um. Cada visita mede de novo (e o
botão "Medir de novo" refaz sem recarregar). As medições ficam em `lib/saude.ts`, cada parte
isolada: se uma fonte falha, a página mostra o resto e diz o que não deu para medir.

- **Servidor do banco**, pelo endpoint de métricas do Supabase
  (`/customer/v1/privileged/metrics`, formato Prometheus, com a chave secreta): memória RAM,
  swap, disco dos dados, carga de CPU, "pressão" (tempo esperando memória, disco ou CPU desde
  que ligou), tempo no ar, reinícios, rede, região
- **Banco**, pelo próprio Postgres: tamanho frente aos 500 MB, quanto é do PageLinks e quanto é
  do Supabase, leituras vindas da memória (cache), memória configurada, conexões, tempo de
  resposta (3 consultas, vale a do meio), transações e travamentos, limpeza automática, linhas
  e tamanho de cada tabela, e as consultas que mais tomam tempo (pg_stat_statements)
- **Arquivos**, pela tabela `storage.objects`: total frente a 1 GB, quem ocupa mais (pasta de
  cada cliente), **arquivos sem uso** (no Storage e em nenhuma página) e **imagens quebradas**
  (na página, mas sem arquivo), com o cliente e o lugar
- **Uso**: clientes, páginas, blocos por tipo (com as cores das etiquetas), cliques por dia
  nos últimos 30 dias, páginas mais clicadas
- **Limites do plano Free** do Supabase, conferidos em supabase.com/pricing em 14/10/2026: 500 MB
  de banco, 1 GB de arquivos, 5 GB de saída por mês, 500 MB de RAM, pausa depois de 1 semana
  sem uso, **sem backup automático** (aparece como atenção no resumo). A saída de dados
  (egress) não dá para medir daqui: só no painel do Supabase

## Título e texto com formatação por trecho — 14/10/2026

Pedido do Bruno: negrito, itálico, sublinhado, riscado e cor numa palavra, não só no bloco
inteiro. O campo virou um editor (`TextoRico.tsx`): barra em cima (N, I, S, R, as cores da
página e dos botões, oito prontas, uma livre e "Limpar formatação") para o trecho
selecionado; Ctrl/⌘ + B, I, U também; Enter quebra a linha; colar traz só o texto. O campo
tem o fundo e a cor da página, para trecho amarelo não sumir no painel claro. A prévia muda
na hora; grava no "Salvar bloco". Fonte, cor e formato do bloco continuam valendo para o texto
todo (agora rotulados assim), e a formatação de trecho vai por cima.

- **Como guarda:** coluna `rico`, JSON de trechos (`lib/textoRico.ts`), e não HTML: a página
  monta os trechos com elementos do React, então não entra código pela formatação (testado:
  um `<img onerror>` digitado aparece como texto). O `titulo` guarda o texto puro (nome do bloco
  no painel); sem nenhuma formatação, `rico` fica vazio e vale o `titulo`
- **O editor** é um contentEditable formatado pelo próprio navegador (`execCommand`), lido de
  volta em trechos a cada mudança (`lerEditor`: b/strong, i/em, u, s, font color e estilos).
  A seleção fica guardada, porque clicar numa cor tira o foco do texto
- **Tom apagado na cor, não em opacity:** título e texto eram levemente transparentes
  (opacity .62 e .86), e isso apagava junto a cor escolhida numa palavra. Agora é
  `color-mix(var(--texto) 62%/86%, transparent)`. Comparado pixel a pixel em 4 páginas, antes e
  depois: maior diferença de 1 nível em 255, nenhum pixel com mais de 2

## Título e texto: quebra de linha, fonte, cor e formato — 13/10/2026

- **Quebra de linha:** o campo virou caixa de várias linhas, e a página mostra a quebra
  (`white-space: pre-line`). O navegador manda a quebra como `\r\n`; o `salvarCard` grava `\n`
- **Fonte:** 42 do Google Fonts em quatro grupos (`lib/fontes.ts`: básicas, modernas, clássicas,
  destaque e manuscritas), além de "a fonte da página". `estilos` é o pedido exato de cada uma,
  tirado do catálogo do Google (itálico e negrito só onde existem). A página carrega só as
  fontes usadas, uma `<link>` por fonte. Coluna `fonte` no `Card`
- **Cor:** a coluna `corTexto`, que existia sem campo no painel. Com cor própria, a opacidade
  volta a 1 (título e texto são levemente apagados por padrão)
- **Formato:** negrito, itálico, sublinhado, riscado (botões N, I, S, R). Coluna `formato`, as
  marcas separadas por espaço; vazio (null) é o padrão do bloco (o título é negrito), e `""`
  é "nenhuma", para dar para tirar o negrito do título
- Fonte, cor e formato gravam no "Salvar bloco" e aparecem na prévia na hora (a fonte é
  carregada dentro da prévia); o que não foi salvo some quando a prévia recarrega, de propósito
- **Correção junto:** o `salvarCard` zerava `corFundo` e `corTexto` a cada gravação, porque
  nenhum formulário mandava esses campos. Agora só grava o que o formulário traz
- Medido antes e depois em 6 páginas: fonte, peso, cor, opacidade e altura de cada título e
  texto iguais; nenhum texto guardado tinha quebra de linha

## Cor por tipo de bloco no editor — 13/10/2026

Cada etiqueta de tipo (link, destaque, WhatsApp, título, texto, lista, imagem, vídeo, redes,
carrossel, separador) tem a sua cor, para achar o bloco no meio da lista. Tons suaves:
fundo claro e o texto na mesma cor, mais escuro. Tokens `--g-tipo-<tipo>` e
`--g-tipo-<tipo>-texto` nos dois temas (`gestao.css`); no escuro, a cor é translúcida sobre o
cartão. Contraste medido: de 5,8:1 a 6,7:1 no claro e de 8:1 a 10,6:1 no escuro.

## Tamanho do texto nos blocos de título e texto, e confirmação ao excluir — 13/10/2026

**Tamanho do texto**: barra por tela nos blocos de título e de texto (`AJUSTES.letra`, coluna
`letraTamanho`). O padrão depende do bloco: 13 px no título, 15 px no texto
(`PADRAO_DA_LETRA` em `lib/tema.ts`). Por isso a variável `--letra` não tem padrão no CSS:
cada bloco usa `var(--letra, <o seu>)`, e o painel passa o padrão do bloco ao `ControleAjuste`
(prop `padrao`). E por isso esse ajuste nunca grava vazio: o `salvarAjuste` transforma em vazio
o valor igual ao padrão da tabela (15), e o título em 15 px voltaria para 13
(`padraoPorBloco` em `lib/ajustes.ts`).

**Excluir cliente pede confirmação** (`BotaoExcluir.tsx`): antes, um clique apagava cliente,
página, blocos, cliques e imagens. Em 13/10 duas páginas foram excluídas pelo painel
(Milene Almeida e Renata Amaral, de propósito, confirmado pelo Bruno); a investigação pelos
registros da Vercel mostrou que é fácil apagar sem querer. Cancelar não envia o formulário.

## Imagens sem canto arredondado — 13/10/2026

Imagem enviada (bloco de imagem, banner com link e carrossel) aparece como o arquivo, com
os cantos que a arte tiver. Antes ela seguia o formato dos botões (`--raio`), e no
"totalmente redondo" (999 px) os banners da Infra viravam pílula. Pedido do Bruno: a imagem
original. O vídeo e a caixa da lista continuam com o canto dos botões.

## Bloco lista — 13/10/2026

Tipo de bloco para itens um embaixo do outro, como os serviços de um cliente. No painel é
um campo de texto, **um item por linha**, que aceita colar uma lista pronta: `lerItens`
(`lib/lista.ts`) tira o marcador do começo ("- ", "• ", "✓ ", "1. ", "1) ") para a página não
mostrar dois, e ignora linha vazia. Título opcional em cima (o `titulo` do bloco) e marcador
à escolha: bolinha (padrão, vazio no banco), visto ✓ ou número (vira `<ol>`). Colunas
`itens` e `marcador` no `Card`.

Na página fica numa caixa como o botão secundário, alinhada à esquerda (lista centralizada
não se lê), com o marcador na cor dos botões. Sem item, o bloco não aparece: o bloco recém-criado
não vai ao ar vazio. O `salvarCard` só grava itens e marcador quando o formulário traz os
campos, para trocar o tipo do bloco e voltar não apagar a lista.

## Bloco carrossel — 13/10/2026

Tipo de bloco novo: várias imagens deslizando sem parar, cada uma com link opcional. Pedido do Bruno para páginas como a do Antônio Fernandes,
que no WordPress tinham um carrossel de antes e depois.

- **Dados:** tabela `ImagemCarrossel` (cardId, imagemUrl, url, ordem), com RLS ligado como as
  outras. No `Card`, `carrosselTempo` (segundos em cada imagem; vazio = 4) e `slideLargura`
  (largura de cada imagem em % da coluna, por tela como os outros ajustes: `AJUSTES.slide`,
  padrão 80% no celular e 60% no tablet e no computador). Regras em `lib/carrossel.ts`
- **Painel** (`EditorCarrossel.tsx`): tudo grava na hora. Envia várias imagens de uma vez
  (WebP q90, a de mais de 4 MB é reduzida no navegador), link de cada uma ao sair do campo,
  ← → para a ordem, ✕ para tirar (com confirmação), tempo e largura. Até 20 imagens. Cada
  mudança marca o bloco (`atualizadoEm`), para a prévia recarregar e a lista ordenar
- **Página** (`app/[slug]/Carrossel.tsx`), **em esteira** desde o fim de 13/10 (pedido do
  Bruno: deslizar sem parar, como no WordPress, em vez de passar uma por uma): as imagens
  andam da direita para a esquerda e depois da última vem a primeira, sem emenda. A volta (o
  conjunto) aparece duas vezes e a animação anda exatamente uma volta, n × (largura + vão),
  então recomeçar não dá salto; com menos de 3 imagens a volta se repete até cobrir a
  largura. O vão é margem à direita e não gap (com gap a volta sairia meio vão errada).
  `carrosselTempo` virou a velocidade: segundos para cada imagem passar. Para com o mouse em
  cima ou o foco dentro (para clicar) e no botão de pausa. Quem pede menos movimento vê as
  imagens paradas, numa fileira que arrasta com o dedo. As cópias são aria-hidden e fora do Tab
- **Medido** (13/10): a cópia termina a volta no mesmo pixel em que a primeira começou, em 390
  e 1440 px; com 1 imagem não abre buraco. Para testar por JavaScript, pausar e retomar a
  animação a tira do controle do CSS: as pausas se testam numa página recarregada
- **Clique:** imagem com link vai por `/ir/<bloco>?imagem=<id>` e conta para o bloco
- **Arquivos:** `apagarImagensOrfas` conta também as imagens de carrossel. Excluir bloco ou
  cliente leva os arquivos do carrossel junto, e duplicar o bloco divide os arquivos

## Lista de clientes em três modos, e a prévia sem piscar — 13/10/2026

**Modos da lista** (`app/gestao/ListaClientes.tsx`): Lista (a tabela), Grade (cartões com a
capa da página, que é o fundo, a foto e a arte do nome do cliente em miniatura) e Compacto
(cartões pequenos: bolinha, foto, nome, situação e quando mudou). A troca é na hora (os dados
já vêm do servidor) e fica no cookie `pl_vista` (`lib/vista-painel.ts`), como o tema. Nos
cartões, o link do nome se estica por cima do cartão inteiro; bolinha e endereço ficam por cima.

**Ordem pela última mudança**: a mais recente entre a página e os blocos dela (`excluirCard`
marca a página, porque bloco excluído não deixa data). A bolinha de conferido não conta, para o
cliente não pular para o topo no clique. O "quando" (`app/gestao/quando.ts`) é calculado no
servidor no horário de Brasília ("hoje às 14:32", "há 3 dias", "em 12 set").

**Busca**: no Postgres o `contains` diferencia maiúscula de minúscula; "Ana" achava 1 cliente
e "ANA" nenhum. Agora é `mode: "insensitive"`.

**A prévia piscava** a cada gravação: o iframe recarregava inteiro, aparecia pela metade e no
topo da página antes de voltar à rolagem. E a recarga de uma gravação chega 2 a 3 s depois:
quem continuava arrastando a barra via o valor velho voltar (medido em produção: ícone em 40
com a barra já em 50, no topo e incompleto, por 295 ms). Agora (`Previa.tsx`) a versão nova
carrega num segundo iframe escondido atrás do visível e só troca de lugar pronta: documento,
imagens e fontes carregados, a mesma rolagem, e os **retoques ao vivo** refeitos
(`retocarPrevia` em `BarraAjuste.tsx`: tamanho, espaço, cor dos ícones, formato da foto; o
último de cada um vence). A largura na linha fica de fora de propósito: ao vivo ela é uma
aproximação, e a recarga traz a fração certa, calculada com os vizinhos.

## Arrastar blocos e tamanho do texto do topo — 13/10/2026

**Arrastar no lugar das setas.** Cada bloco do editor tem uma alça (⠿) à esquerda: arrasta
com mouse ou dedo, e a lista se reorganiza enquanto arrasta. Ao soltar, a ordem inteira é
gravada de uma vez (`reordenarCards`, que substituiu o `moverCard`), e só os blocos que
mudaram de posição são regravados. Com a alça em foco, ↑ e ↓ do teclado andam uma posição.
Perto da borda da janela a página rola sozinha, para levar um bloco longe.

Três detalhes que custaram tempo, em `EditorCards.tsx`:
- **O movimento é ouvido na janela, não na alça.** Para reordenar, o React move os nós,
  e nó movido perde a captura do ponteiro; ouvindo só a alça, o arraste parava depois de
  uma posição. A cada reorganização a alça recaptura o ponteiro, para o arraste não
  escapar para a prévia (que é outro documento)
- **A ordem do servidor só é absorvida fora de arraste e sem gravação pendente.** Senão a
  resposta de um arraste desfazia o seguinte no meio do caminho
- A ação recusa a lista que não for exatamente a dos blocos da página (a mais, a menos
  ou repetido), em vez de gravar meia ordem

**Tamanho do título e da frase.** Duas barras novas no topo do editor, por tela
(`AJUSTES.titulo` e `AJUSTES.bio`, colunas `tituloTamanho` e `bioTamanho`). Padrão de sempre:
título 24 px no celular e 28 px no tablet e no computador, frase 16 px. Somem enquanto
houver imagem no lugar do título e da frase. Medido antes e depois em seis páginas com
título em texto, nas três larguras: nada mudou.

## Bolinha de conferido — 13/10/2026

Para o Bruno marcar, página a página, o que já revisou. Cada cliente tem `conferido`
(`Cliente.conferido`, falso por padrão): na lista do `/gestao`, uma bolinha antes do
nome, **amarela** (falta algo) ou **verde com ✓** (está certo); um clique troca e grava
na hora (`marcarConferido` em `app/gestao/acoes.ts`). A mesma bolinha fica ao lado do
nome no editor, e o topo da lista conta quantos estão conferidos.

O botão (`app/gestao/Conferido.tsx`) troca a cor antes da resposta do servidor e volta
atrás se a gravação falhar. As cores são tokens nos dois temas (`--g-pendente`, `--g-ok`
em `gestao.css`). É marcação interna: não muda nada na página pública.

## Bloco de redes: ícones — 13/10/2026

O bloco **Redes** virou uma fileira de ícones lado a lado, cada um com o próprio link,
todos dentro do mesmo bloco ("+ Adicionar ícone" põe mais uma linha; salvar o bloco
grava a lista inteira, na ordem da tela).

- **Tabela `Icone`** (cardId, rede, url, ordem), com RLS ligado como as outras. Ícone que
  já existia é atualizado (guarda o histórico); o que sai da lista é apagado. Duplicar o
  bloco duplica os ícones
- **20 redes** em `lib/redes.ts`: WhatsApp, Instagram, Facebook, TikTok, YouTube, Google,
  Google Maps, LinkedIn, X, Threads, Pinterest, Telegram, Spotify, iFood, Airbnb,
  Tripadvisor, e os genéricos Site, E-mail, Telefone e Localização. Os desenhos das marcas
  são do Simple Icons (CC0), copiados só os usados: o pacote inteiro iria parar no painel.
  O LinkedIn saiu do Simple Icons a pedido da marca e tem desenho próprio
- **Clique contado por ícone:** o link é `/ir/<cardId>?icone=<id>`, e `Clique.iconeId`
  guarda qual foi. WhatsApp aceita só o número (sem o 55, ele entra); e-mail e telefone
  viram `mailto:` e `tel:`; link sem `https://` ganha
- **Sugestão a partir do nome:** os 49 blocos de redes que vieram do WordPress têm nomes como
  "Instagram, WhatsApp, TikTok". Ao abrir um deles sem ícones, as linhas já nascem com essas
  redes, faltando só colar os links
- **Barras de tamanho e espaço** (`Card.iconeTamanho`, de 16 a 64 px, padrão 28;
  `Card.iconeEspaco`, de 0 a 64 px, padrão 24). Mexem na prévia ao vivo pelas variáveis
  `--icone` e `--espaco` da fileira e gravam sozinhas. O espaço é medido entre os desenhos:
  a área de toque (10 px em volta) tem margem negativa igual e não empurra os vizinhos
- **Cor dos ícones** (13/10/2026, `Card.iconeCor`): vazio = cor do texto da página;
  `"marcas"` = cada ícone na cor da sua marca (`cor` em `lib/redes.ts`, do Simple Icons;
  LinkedIn pelo azul oficial); `"#RRGGBB"` = uma cor só. TikTok, X, Threads e os genéricos
  não têm cor de marca e ficam na cor do texto, senão sumiriam em fundo escuro. É a mesma
  nas três telas. Grava sozinha (`salvarCorIcones`) e mexe na prévia ao vivo
- **Na página:** ícones de 28 px em área de toque de 48 px, na cor do texto da página (ou na
  cor de texto do bloco). Bloco de redes sem ícone só aparece se tiver link (o botão de
  antes); os que vieram do WordPress sem link eram espaço reservado e saíram da página

## Imagens — 12/10/2026

**Quem sobe é a equipe, em WebP ou PNG; sai sempre WebP q90.** O painel tem campo de envio na foto do topo, na
imagem que substitui título e frase, na imagem de bloco e no fundo. O endereço de SEO e o
ícone da aba continuam como endereço digitado.

- **O envio grava na hora**, sem esperar o Salvar do formulário: `enviarImagem` e
  `removerImagem` em `app/gestao/acoes.ts`, que também passam pelo `exigirAdmin()`
- **Otimização** (`lib/imagens.ts`, com o `sharp`): converte para WebP q90 e reduz ao tamanho
  que a página usa. Bloco e cabeçalho limitam só a largura em 1240 px (a coluna tem 620),
  porque arte comprida é comum. Foto do topo vai a 400×400 e fundo a 1920. Se a imagem já
  cabe e o original (WebP) é mais leve que a regravação, fica o original. PNG transparente
  continua transparente. Quem decide o formato é o conteúdo, não a extensão: JPG com nome
  `.png` é recusado. Os limites ficam em `lib/imagens-limites.ts`, que o navegador também lê
- **Teto de 4 MB por envio**: a Vercel corta o corpo da requisição em 4,5 MB. O `next.config.ts`
  sobe o limite da ação de servidor, que por padrão é 1 MB. Arquivo maior (PNG pesado, em
  geral) é reduzido no próprio navegador ao tamanho da página e vai como WebP q95 (q85 se ainda
  passar); no teste, uma arte PNG de 16 MB chegou com 1 MB. Qualidade 1 no navegador não serve:
  a mesma arte saía acima de 4 MB
- **Testado de ponta a ponta em 12/10/2026** num Chrome de verdade, na página `demo`: WebP falso
  recusado, foto de 2,6 MB aceita, troca apagando o arquivo antigo, cabeçalho travando título e frase,
  exclusão de bloco limpando o bucket. A demo voltou ao estado original
- **Onde fica:** bucket público `imagens`, em `<clienteId>/<uso>-<id>.webp`. O nome nunca se
  repete, então o arquivo vai com cache de um ano. Criado por `npm run storage:preparar`
- **Limpeza:** trocar ou remover uma imagem, excluir bloco e excluir cliente apagam do
  bucket o arquivo que ninguém mais usa. Confere o banco antes, porque duplicar um bloco
  copia o endereço da imagem
- **Cabeçalho em imagem** (`Pagina.cabecalhoImagemUrl`): para quando a arte da marca já
  traz o nome e a frase. Na página ela entra dentro do `<h1>`, com título e frase como texto
  alternativo. No painel, com a imagem, título e frase ficam travados (e o servidor ignora
  os dois) até a imagem sair
- Precisa de `SUPABASE_SECRET_KEY` no `.env` e na Vercel. Sem ela, o envio avisa que está desligado
- **Card-banner** (13/10/2026): todo bloco clicável (link, destaque, WhatsApp, redes) aceita
  imagem opcional. Com ela, o card vira a própria arte, clicável e contando clique pelo
  `/ir/`, no lugar do botão de texto. É como eram quase todas as páginas do WordPress: arte com
  título e botãozinho desenhados dentro. O título do bloco continua editável, porque é o nome
  dele no painel e o texto alternativo da imagem
- **Barra de tamanho** (13/10/2026, pedido do Bruno): foto, cabeçalho e imagem de bloco têm
  uma barra que muda o tamanho de exibição. Foto em px (48 a 200, padrão 104), cabeçalho e
  bloco em % da coluna (20 a 100, padrão 100). Fica em `Pagina.avatarTamanho`,
  `Pagina.cabecalhoTamanho` e `Card.imagemTamanho`. Vazio é o padrão, e "voltar ao padrão"
  grava vazio. Arrastar muda a prévia na hora, direto no iframe (mesma origem, pelos
  `data-pl-tamanho` da página pública), e grava meio segundo depois que a barra para.
  Remover a imagem zera o tamanho; trocar mantém. Os intervalos ficam em
  `TAMANHO_NA_PAGINA`, em `lib/imagens-limites.ts`
- **A prévia guarda a rolagem** quando recarrega depois de salvar: ajustar um bloco lá
  embaixo não joga a prévia de volta para o topo
- A miniatura do campo de imagem usa a cor de fundo da página do cliente: logo branco
  sumia no xadrez claro

**Conserto junto:** o editor tem três formulários para a mesma página, e o `salvarPagina`
gravava todos os campos em todo envio. O do topo não mandava cores nem SEO, então salvar o
título voltava as cores para o padrão e apagava o SEO. Agora só muda o campo que veio no envio.

## Importação das imagens da carteira — 13/10/2026

O Bruno exportou as imagens das páginas antigas para uma pasta por cliente
(`~/Downloads/PageLinks Imagens/NN - Nome/`): `01-logo.png`, `02-nome.png` e
`03-card-NN.png`. O `prisma/importar-imagens.ts` lê essa pasta e preenche as páginas:
logo na foto, nome no cabeçalho, cards nos blocos clicáveis em ordem. Cada arquivo é casado
com a imagem da página antiga de proporção parecida, e o link dela vai junto (WhatsApp vira
número e mensagem). Só preenche página que ainda não tinha imagem, e guarda o antes num JSON
ao lado das imagens.

- 33 páginas preenchidas na primeira rodada (Amanda Tabet pulada: o Bruno já tinha feito);
  a **Hydramaq Hidráulica** foi criada (`/hydramaq`), a partir da página própria dela em
  dnms.fun/hydramaq (fora do WordPress): tema, fundo e os 4 cards com link
- "Cabana Ubirici" é a Chalés Urubici; "Ste Bernardo" é Ste Bernards
- **Formato da foto** (`Pagina.avatarFormato`): "Sem cortar" mostra o logo inteiro, sem
  círculo nem borda, e o tamanho vira a largura. Logo largo ou comprido entra assim na
  importação (SpaceFM, Studio Sarah Sampaio, Gesqual, Litoral Relógios, Hydramaq). O teto da
  foto subiu para 640 px de arquivo e 320 px na barra
- Ficaram de fora as imagens de `extras/` (30, em 10 clientes): carrosséis, fileiras de logos,
  prints de avaliação. O lugar delas são os blocos de imagem vazios que vieram dos prints
- **Correções depois da primeira rodada** (conferidas no celular, uma a uma):
  - Fernando Ferro, Studio Sarah Sampaio e Vanessa Andrade tinham os ícones de redes
    exportados como cards: eles entraram nos blocos dos banners. Os ícones viraram ícones do
    bloco de redes (com os links da página antiga) e cada banner voltou para o bloco dele
  - SpaceFM: os três selos (Google Play, App Store, Alexa) a 1/3 da linha, pequenos, com o link
    de cada loja
  - Milene Almeida: os prints só tinham 3 dos 5 banners; ficaram os 5, na ordem e com nome
  - Sarah Sampaio: as imagens da pasta têm proporção diferente da página antiga, e os links
    não casaram; foram postos pela ordem. A imagem que era a fileira de ícones saiu
  - Infra Assessoria: os botões "Fale com a gente" eram os links dos banners
- **Ícones de redes da carteira:** 81 ícones em 26 páginas, lidos da página antiga (um por
  rede, sem os botões e os links de loja). Matheus Ferro e Heloisa de Paula não tinham ícones
- **Ficou sem destino** (a página antiga não tinha link para recuperar): Redó Souza &
  Muneratti "Acompanhe Nosso Canal", Ana Julia "Quero fechar parceria", Matheus Ferro
  "Mentoria InstaLUCRO", Renata Amaral "Contact now!" e dois do Instituto Ponto de Luz

## Blocos lado a lado mais juntos — 13/10/2026

Na Amanda Tabet, dois cards em 1/2 com a imagem a ~90% pareciam longe no centro: a sobra
de cada imagem ia para os dois lados, e as duas do meio somavam com o espaço entre os
blocos (uns 44 px no meio contra 10 entre linhas). Duas mudanças:

- **Encosto:** numa linha de dois blocos, a imagem do primeiro encosta no fim da célula e
  a do segundo no começo (`--enc-*`, de `fracoesNaTela`); a sobra vai para as bordas de
  fora. Com três ou mais na linha, continuam centralizadas
- **"Espaço entre blocos lado a lado"** (`Pagina.espacoLado`, ajuste `lado`, por tela): o vão
  horizontal, separado do vertical. Sem valor, segue o "Espaço entre os blocos" da tela
  (por isso, no celular, o valor escolhido é gravado mesmo quando dá 14)
- Testado com banners largos a 85% em 3/4 + 3/4 no computador: vão no meio igual ao
  vertical (14 px), e 4 px com a barra em 4

## Pelo menos dois por linha — 13/10/2026

Pedido do Bruno: no computador, dois blocos seguidos em 3/4 devem ficar lado a lado.
Regra nova (`fracoesNaTela`, em `lib/ajustes.ts`): blocos seguidos que não são inteiros
dividem a linha enquanto couberem; se o próximo não couber e a linha só tiver um, ele entra
assim mesmo, e a linha encolhe na mesma proporção. 3/4 + 3/4 vira metade e metade, 3/4 + 1/2
vira 60% e 40%, três de 3/4 viram 2 numa linha e 1 na seguinte. Combinações que fecham a
linha (1/2 + 1/2, 1/3 + 2/3, 3/4 + 1/4) ficam exatas, como antes.

- A fração real depende dos vizinhos, então é resolvida no servidor para cada tela, só com
  os blocos que aparecem na página (`conteudoDoBloco` primeiro, depois as linhas), e chega
  pronta como `--fr-m`, `--fr-t`, `--fr-d`. A largura escolhida (`--largura-*`) não vai mais
  para a página
- Na prévia, a escolha aparece na hora com a fração crua; o par certo sai quando a prévia
  recarrega, logo depois de gravar
- Testado na página pública: 303 + 14 + 303 = 620 px no 3/4 + 3/4; celular intacto

## Bloco em edição em foco — 13/10/2026

Abrir um bloco no editor dá a ele uma borda em degradê verde-claro com halo (`.cardAberto`),
leva a rolagem do editor até ele (o topo fica 88 px abaixo do alto da tela, logo depois da
barra fixa) e rola a prévia até o mesmo bloco, no centro. Não trava a rolagem. A prévia
rola só a página de dentro (`scrollTo` na janela do iframe; `scrollIntoView` ali puxaria o
editor junto). Com "reduzir movimento" ligado no sistema, a rolagem é sem animação.

## Layout por tela: celular, tablet e computador — 13/10/2026

Tamanhos, espaços e larguras são escolhidos **por tela**; conteúdo (texto, link, imagem,
cor, fonte) é o mesmo nas três. A tela escolhida na prévia ("Celular | Tablet |
Computador") é a que o editor inteiro edita, e um aviso no topo do editor diz quando não é
o celular. Tudo está em `lib/ajustes.ts`, que é a fonte da verdade.

- **Ajustes por tela:** foto (`avatar`), cabeçalho, espaço acima do topo (`topo`), espaço
  entre os blocos (`blocos`), imagem do bloco (`imagem`), tamanho dos ícones (`icone`),
  espaço entre ícones (`vao`) e largura do bloco na linha (`largura`)
- **Onde mora:** o celular é a base e fica nas colunas de sempre (`avatarTamanho`,
  `espacoTopo`, `largura`…). Tablet e computador guardam só o que mudou, em JSON nas colunas
  `ajustesTablet` e `ajustesComputador` (Pagina e Card)
- **Herança:** tela sem valor próprio segue a tela menor (computador → tablet → celular);
  sem nenhum, vale o padrão da tela. Foi escolhido assim para as páginas já ajustadas no
  celular não mudarem no computador até alguém mexer lá. Cada barra mostra "segue o
  celular" quando herda e "seguir o celular" para apagar o valor próprio
- **Na página:** cada ajuste vira até três variáveis no elemento (`--topo-m`, `--topo-t`,
  `--topo-d`, só as gravadas). O `pagina.module.css` escolhe a da tela pela largura (até
  767 px celular, de 768 a 1023 tablet, de 1024 em diante computador) e faz a herança com
  `var()` encadeado
- **Uma ação só grava tudo:** `salvarAjuste(alvo, chave, tela, valor)`; null apaga. Remover
  uma imagem zera o tamanho dela nas três telas
- **No editor:** o que foi gravado nesta sessão vale por cima do que veio do servidor
  (trocar de tela logo depois de mexer mostrava o valor antigo), e a barra que sai da tela
  com gravação pendente grava na hora (trocar de tela em menos de meio segundo perdia a
  mudança)
- Testado de ponta a ponta na demo e na página pública aberta a 390, 820 e 1280 px: cada
  tela com os seus valores, tablet herdando do celular e computador do tablet
- O padrão do espaço do topo passou a mudar em 768 px (era 480): de 481 a 767 px, sem
  ajuste, o topo agora é 36 px, e não 48

## Blocos lado a lado — 13/10/2026

Cada bloco tem **largura na linha** (`Card.largura`: 3/4, 2/3, 1/2, 1/3, 1/4; vazio = inteira),
escolhida no editor do bloco, e os blocos se encaixam lado a lado, descendo quando a linha
enche. É fração, não barra livre, para o alinhamento sair certo: frações que somam 1
fecham a linha exata (1/2 + 1/2, 1/3 + 2/3, três de 1/3).

- Na página, cada bloco vai numa `.celula` com `--fracao`; a largura é
  `fração × 100% − (1 − fração) × espaço`, então o espaço entre eles (o mesmo da barra
  "Espaço entre os blocos") já sai descontado. Testado: 156 + 14 + 156 = 326 px e
  99,3 + 14 + 212,7 = 326 px
- Na mesma linha, as células ficam da mesma altura e o botão ocupa a altura toda; bloco
  parcial sozinho numa linha fica centralizado; botão em bloco parcial tem menos margem
  interna
- A escolha grava na hora e mexe na prévia ao vivo (`data-pl-bloco`); a lista do painel
  mostra a fração ao lado do tipo. Duas trocas seguidas muito rápidas podem fazer a primeira
  sumir da prévia por um instante, até a prévia recarregar com o que foi gravado

## Espaços da página e prévia no computador — 13/10/2026

- **Espaço acima do topo** (`Pagina.espacoTopo`, de 0 a 320 px), no bloco "Página": empurra a
  foto, ou o que vier primeiro, e o resto da página para baixo. Vazio segue o de antes (36 px no
  celular, 48 no computador); com valor escolhido, vale nos dois. Por isso o padrão da barra é
  36, o do celular
- **Espaço entre os blocos** (`Pagina.espacoBlocos`, de 0 a 48 px, padrão 14), no topo de
  "Blocos da página"
- As duas barras viram as variáveis `--espaco-topo` e `--espaco-blocos` da página (só quando
  escolhidas, em `variaveisDoTema`), mexem na prévia ao vivo pelo `data-pl-tela` e gravam
  sozinhas (`salvarAjustePagina`). A regra de celular do `pagina.module.css` também usa a
  variável: sem isso, a barra não fazia efeito em tela de até 480 px
- **Prévia "Celular | Computador":** no modo computador a página é desenhada em 1280×800 e
  reduzida em escala para caber (o `ResizeObserver` acompanha a largura), com uma moldura de
  navegador, e a coluna da prévia alarga (`.editor:has(.previaComputador)`). O iframe é o
  mesmo nos dois modos: trocar não recarrega nem perde a rolagem

## Listas que voltavam depois de salvar — 13/10/2026

O React 19 reseta o formulário quando a ação de servidor termina, e um `<select>` volta à
opção de quando foi montado. No editor, isso fazia a lista mostrar o valor antigo depois de
salvar (escolher Poppins, salvar, e a lista mostrava Inter), e salvar de novo desfazia a
escolha sem aviso. Nos ícones de redes, controlados pelo estado, todos voltavam para a
primeira opção (WhatsApp). Conserto: toda `<select>` do editor tem `key` no valor gravado e
usa `defaultValue`, então é recriada com o valor novo e o reset volta para ele. **Lista nova
no editor segue o mesmo padrão.** Campo de texto e de cor não tem o problema: o React
acompanha o atributo de valor deles.

## Tema do painel — 12/10/2026

Claro por padrão (paleta azul), escuro como opção, no botão do topo do `/gestao` e do
`/entrar`. Fica no cookie `pl_tema`, que o servidor lê para entregar a tela já no tema
certo. Os tokens dos dois temas estão em `app/gestao/gestao.css`, e o módulo só usa token.
Contraste do claro: texto 12.3:1, texto suave 5.1:1, botão 7.2:1.

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
(YouTube e Vimeo), `redes`, `separador`, `carrossel` e `lista` (desde 13/10/2026).

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
