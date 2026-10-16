import { Fragment, cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { variaveisDoTema, urlDaFonte } from "@/lib/tema";
import { variaveisDeAjuste, variaveisDeLinha } from "@/lib/ajustes";
import { REDE_POR_ID, destinoDoIcone } from "@/lib/redes";
import { TEMPO_PADRAO } from "@/lib/carrossel";
import { lerItens, lerMarcador } from "@/lib/lista";
import { corValida, estiloDoTexto, fonteDoTexto, lerFormato, urlDaFonteDoTexto } from "@/lib/fontes";
import { lerTrechos, type Trecho } from "@/lib/textoRico";
import { animacaoValida } from "@/lib/animacoes";
import { usuarioLogado } from "@/lib/acesso";
import { destinoDoRedirecionamento } from "@/lib/redirecionamentos";
import DesenhoRede from "./DesenhoRede";
import Carrossel from "./Carrossel";
import estilos from "./pagina.module.css";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ previa?: string; [chave: string]: string | string[] | undefined }> };

/**
 * DMetric (dspace.verts.me): conta as visitas e mede a página no aparelho de quem visita.
 * O mesmo script para todos os clientes; o DMetric reconhece o site pelo domínio e separa
 * cada cliente pelo caminho (/anajulia, /lojasmari…).
 */
const SCRIPT_DE_METRICAS = "https://dspace.verts.me/dm.js";

/**
 * Busca a página publicada de um cliente ativo, com os cards visíveis agora.
 * No cache() do React: o generateMetadata e a página pedem a mesma coisa na mesma
 * visita, e assim o banco é consultado uma vez só, não duas.
 */
const buscarPagina = cache(async (slug: string) => {
  const agora = new Date();
  const cliente = await prisma.cliente.findFirst({
    where: { slug, ativo: true },
    include: {
      paginas: {
        where: { publicada: true },
        take: 1,
        include: {
          cards: {
            where: {
              ativo: true,
              AND: [
                { OR: [{ publicarEm: null }, { publicarEm: { lte: agora } }] },
                { OR: [{ despublicarEm: null }, { despublicarEm: { gte: agora } }] },
              ],
            },
            orderBy: { ordem: "asc" },
            include: { icones: { orderBy: { ordem: "asc" } }, imagens: { orderBy: { ordem: "asc" } }, unidades: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  });
  return cliente?.paginas[0] ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pagina = await buscarPagina(slug);
  if (!pagina) return { title: "Página não encontrada" };

  const titulo = pagina.seoTitulo || pagina.titulo;
  const descricao = pagina.seoDescricao || pagina.bio || undefined;
  const imagem = pagina.seoImagemUrl || pagina.avatarUrl || pagina.cabecalhoImagemUrl || undefined;

  return {
    title: titulo,
    description: descricao,
    icons: pagina.faviconUrl ? [{ url: pagina.faviconUrl }] : undefined,
    openGraph: {
      title: titulo,
      description: descricao,
      images: imagem ? [imagem] : undefined,
      type: "profile",
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao },
  };
}

/**
 * O texto de um bloco de título ou de texto: os trechos formatados, ou o texto puro.
 * Elementos do React (o texto é escapado), as mesmas marcas do editor: a cor por fora,
 * para o sublinhado e o riscado saírem na cor do trecho.
 */
function textoDoBloco(rico: string | null, titulo: string | null) {
  const trechos = lerTrechos(rico);
  if (!trechos) return titulo;
  return trechos.map((t: Trecho, i) => {
    let no: React.ReactNode = t.texto;
    if (t.riscado) no = <s>{no}</s>;
    if (t.sublinhado) no = <u>{no}</u>;
    if (t.italico) no = <em>{no}</em>;
    if (t.negrito) no = <strong>{no}</strong>;
    if (t.cor) no = <span style={{ color: t.cor }}>{no}</span>;
    return <Fragment key={i}>{no}</Fragment>;
  });
}

function linkDoWhatsApp(telefone: string, mensagem?: string | null) {
  const numero = telefone.replace(/\D/g, "");
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${numero}${texto}`;
}

/**
 * Link de bloco e de ícone abre em nova aba. E-mail, telefone e SMS ficam na mesma: abrem
 * o aplicativo, e a aba nova ficaria em branco. noopener por segurança; sem noreferrer, para
 * o /ir continuar sabendo de onde veio o clique.
 */
function abrirEmNovaAba(destinoFinal: string | null | undefined) {
  return destinoFinal && /^(mailto|tel|sms):/i.test(destinoFinal) ? {} : { target: "_blank", rel: "noopener" };
}

/** Converte link do YouTube/Vimeo em URL de player. Devolve null se não reconhecer. */
function urlDeVideo(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default async function PaginaPublica({ params, searchParams }: Props) {
  const { slug } = await params;
  // Fora da conta: a prévia do painel (recarrega a cada ajuste, cada um contaria como visita)
  // e quem está logado no painel olhando a página. Sem o cookie do painel, isto não vai ao banco.
  const [busca, usuario] = await Promise.all([searchParams, usuarioLogado()]);
  const medirVisita = busca?.previa === undefined && !usuario;
  const pagina = await buscarPagina(slug);
  if (!pagina) {
    // Sem página no ar: pode ser um endereço antigo com redirecionamento (lib/redirecionamentos.ts).
    const destino = await destinoDoRedirecionamento([slug], busca, !usuario);
    if (destino) redirect(destino);
    notFound();
  }

  const fonte = urlDaFonte(pagina.fonte);
  // Tamanhos, espaços e larguras por tela (lib/ajustes.ts) vão como variáveis de CSS na
  // página e em cada bloco; o pagina.module.css escolhe a da tela. data-pl-tela e
  // data-pl-bloco são por onde as barras do painel mexem na prévia ao vivo.
  const avatar = pagina.avatarTamanho ?? 104;

  /** O que um bloco mostra na página; null quando não tem o que mostrar (imagem sem arquivo, WhatsApp sem número…). */
  function conteudoDoBloco(card: NonNullable<typeof pagina>["cards"][number]) {
    const destino = `/ir/${card.id}/`; // com a barra: vai direto, sem redirecionar antes
    const aba = abrirEmNovaAba(card.tipo === "whatsapp" ? null : card.url); // WhatsApp é sempre https
    // A imagem vai numa moldura do tamanho dela: é por onde o reflexo passa (uma <img> não
    // tem ::after) e o que pulsa ou treme; largura e encosto ficam na moldura. --arte é a
    // própria imagem, para o reflexo só aparecer onde ela não é transparente.
    const imagem = card.imagemUrl ? (
      <span className={estilos.moldura} style={{ "--arte": `url(${JSON.stringify(card.imagemUrl)})` } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.imagemUrl} alt={card.titulo ?? ""} />
      </span>
    ) : null;
    // Card clicável com imagem: a arte é o próprio card, com o texto já desenhado nela
    // (era assim nas páginas do WordPress). O título fica só como texto alternativo.
    const banner = imagem && <a key={card.id} href={destino} {...aba}>{imagem}</a>;

    switch (card.tipo) {
      // fonte, cor e formato próprios (lib/fontes.ts); sem nada gravado, o estilo de sempre
      case "titulo":
        return <p key={card.id} className={estilos.tituloSecao} style={estiloDoTexto(card.fonte, card.corTexto, lerFormato(card.formato, card.tipo))}>{textoDoBloco(card.rico, card.titulo)}</p>;

      case "texto":
        return <p key={card.id} className={estilos.texto} style={estiloDoTexto(card.fonte, card.corTexto, lerFormato(card.formato, card.tipo))}>{textoDoBloco(card.rico, card.titulo)}</p>;

      case "lista": {
        // sem item, nada aparece (bloco recém-criado fica fora da página até ter o primeiro)
        const itens = lerItens(card.itens);
        if (!itens.length) return null;
        const marcador = lerMarcador(card.marcador);
        const Itens = marcador === "numero" ? "ol" : "ul";
        return (
          <div key={card.id} className={estilos.lista} data-marcador={marcador}>
            {card.titulo && <p className={estilos.listaTitulo}>{card.titulo}</p>}
            <Itens className={estilos.listaItens}>
              {itens.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </Itens>
          </div>
        );
      }

      case "separador":
        return <hr key={card.id} className={estilos.separador} />;

      case "imagem":
        if (!imagem) return null;
        return card.url ? banner : <div key={card.id}>{imagem}</div>;

      case "video": {
        const player = card.url ? urlDeVideo(card.url) : null;
        return player ? (
          <iframe key={card.id} className={estilos.video} src={player} title={card.titulo ?? "Vídeo"} allowFullScreen />
        ) : null;
      }

      case "whatsapp":
        if (!card.telefone) return null;
        if (banner) return banner;
        return (
          <a key={card.id} className={`${estilos.botao} ${card.destaque ? estilos.destaque : ""}`} href={destino} {...aba}>
            {card.titulo ?? "Chamar no WhatsApp"}
            {card.subtitulo && <span className={estilos.sub}>{card.subtitulo}</span>}
          </a>
        );

      case "redes":
        if (card.icones.length) {
          return (
            <nav
              key={card.id}
              className={estilos.redes}
              aria-label={card.titulo ?? "Redes sociais"}
              data-cor={card.iconeCor === "marcas" ? "marcas" : undefined}
              style={card.iconeCor?.startsWith("#") ? { color: card.iconeCor } : undefined}
            >
              {card.icones.map((icone, i) => {
                const rede = REDE_POR_ID[icone.rede];
                return rede ? (
                  <a
                    key={icone.id}
                    className={estilos.icone}
                    href={`${destino}?icone=${icone.id}`}
                    {...abrirEmNovaAba(destinoDoIcone(icone.rede, icone.url))}
                    aria-label={rede.nome}
                    title={rede.nome}
                    // --i: a vez do ícone na animação (o reflexo corre de um a um)
                    style={{ ...(rede.cor && { "--marca": rede.cor }), "--i": i } as React.CSSProperties}
                  >
                    <DesenhoRede rede={rede} tamanho={28} />
                  </a>
                ) : null;
              })}
            </nav>
          );
        }
        // Sem ícone: só aparece se tiver link (o botão de antes). Os blocos de redes
        // que vieram do WordPress sem link eram espaço reservado e levavam para lugar nenhum.
        if (!card.url) return null;
        return (
          <a key={card.id} className={`${estilos.botao} ${estilos.secundario}`} href={destino} {...aba}>
            {card.titulo}
          </a>
        );

      // unidades: foto horizontal em cima, nome e endereço embaixo, e a seta com o mesmo link
      // da foto. A foto é um atalho para quem toca nela: fora do Tab e do leitor de tela, que
      // já têm a seta (com o nome da unidade). Cores do cartão: corFundo e corTexto do bloco.
      case "unidades": {
        if (!card.unidades.length) return null;
        const cores = { "--cor-cartao": corValida(card.corFundo) ?? undefined, "--cor-cartao-texto": corValida(card.corTexto) ?? undefined } as React.CSSProperties;
        return (
          <div key={card.id} className={estilos.unidades} style={cores}>
            {card.unidades.map((u) => {
              const link = u.url ? `${destino}?unidade=${u.id}` : null;
              const abaDaUnidade = abrirEmNovaAba(u.url);
              // eslint-disable-next-line @next/next/no-img-element
              const foto = u.imagemUrl ? <img src={u.imagemUrl} alt="" /> : null;
              return (
                <article key={u.id} className={estilos.unidade}>
                  {foto &&
                    (link ? (
                      <a href={link} {...abaDaUnidade} className={estilos.unidadeFoto} tabIndex={-1} aria-hidden="true">
                        {foto}
                      </a>
                    ) : (
                      <div className={estilos.unidadeFoto}>{foto}</div>
                    ))}
                  <div className={estilos.unidadeTexto}>
                    <p className={estilos.unidadeNome}>{u.nome}</p>
                    {u.endereco && <p className={estilos.unidadeEndereco}>{u.endereco}</p>}
                    {link && (
                      <a href={link} {...abaDaUnidade} className={estilos.unidadeSeta} aria-label={`${u.nome}: abrir`}>
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        );
      }

      case "carrossel":
        if (!card.imagens.length) return null;
        return (
          <Carrossel
            key={card.id}
            titulo={card.titulo || "Imagens"}
            tempo={card.carrosselTempo ?? TEMPO_PADRAO}
            itens={card.imagens.map((i) => ({
              id: i.id,
              imagemUrl: i.imagemUrl,
              destino: i.url ? `${destino}?imagem=${i.id}` : null,
              novaAba: !!i.url && "target" in abrirEmNovaAba(i.url),
            }))}
          />
        );

      case "link":
      case "destaque":
      default:
        if (banner) return banner;
        return (
          <a
            key={card.id}
            className={`${estilos.botao} ${card.destaque || card.tipo === "destaque" ? estilos.destaque : ""} ${card.tipo === "redes" ? estilos.secundario : ""}`}
            href={destino}
            {...aba}
            style={card.corFundo ? { background: card.corFundo, color: card.corTexto ?? undefined } : undefined}
          >
            {card.titulo}
            {card.subtitulo && <span className={estilos.sub}>{card.subtitulo}</span>}
          </a>
        );
    }
  }

  // Só os blocos que aparecem entram na conta das linhas: cada um vai numa célula com
  // os ajustes dele por tela e a fração real da linha em cada tela (lib/ajustes.ts),
  // lidos pelo pagina.module.css.
  const blocos = pagina.cards
    .map((card) => ({ card, conteudo: conteudoDoBloco(card) }))
    .filter((b) => b.conteudo !== null);
  const linhasDosBlocos = variaveisDeLinha(blocos.map((b) => b.card));
  // as fontes próprias dos blocos de título e de texto, uma <link> por fonte (só as usadas)
  const fontesDosBlocos = [
    ...new Map(
      blocos
        .filter((b) => b.card.tipo === "titulo" || b.card.tipo === "texto")
        .map((b) => fonteDoTexto(b.card.fonte))
        .filter((f) => f !== null)
        .map((f) => [f.nome, f]),
    ).values(),
  ];

  return (
    <>
      {fonte && <link rel="stylesheet" href={fonte} />}
      {medirVisita && <script defer src={SCRIPT_DE_METRICAS} />}
      {fontesDosBlocos.map((f) => (
        <link key={f.nome} rel="stylesheet" href={urlDaFonteDoTexto(f)} />
      ))}
      <main
        className={estilos.tela}
        style={{ ...variaveisDoTema(pagina), ...variaveisDeAjuste(pagina, "pagina") }}
        data-pl-tela
      >
        <div className={estilos.conteudo} data-sem-titulo={pagina.semTitulo && !pagina.cabecalhoImagemUrl ? "" : undefined}>
          {pagina.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={estilos.avatar}
              src={pagina.avatarUrl}
              alt={pagina.titulo}
              width={avatar}
              height={pagina.avatarFormato === "livre" ? undefined : avatar}
              data-pl-avatar
              data-formato={pagina.avatarFormato ?? undefined}
            />
          )}
          {pagina.cabecalhoImagemUrl ? (
            // A arte da marca já traz o nome e a frase: ela é o título da página.
            <h1 className={estilos.cabecalho}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pagina.cabecalhoImagemUrl}
                alt={[pagina.titulo, pagina.bio].filter(Boolean).join(" — ")}
              />
            </h1>
          ) : pagina.semTitulo ? (
            // sem título à vista (só a foto ou logo): o título fica para o leitor de tela
            <h1 className={estilos.somenteLeitor}>{pagina.titulo}</h1>
          ) : (
            <>
              <h1 className={estilos.titulo} data-pl-texto-topo>
                {pagina.titulo}
              </h1>
              {pagina.bio && (
                <p className={estilos.bio} data-pl-texto-topo>
                  {pagina.bio}
                </p>
              )}
            </>
          )}

          <div className={estilos.blocos}>
            {blocos.map(({ card, conteudo }) => (
              <div
                key={card.id}
                className={estilos.celula}
                data-pl-bloco={card.id}
                data-animacao={animacaoValida(card.animacao) ?? undefined}
                style={{ ...variaveisDeAjuste(card, "card"), ...linhasDosBlocos.get(card.id) }}
              >
                {conteudo}
              </div>
            ))}
          </div>

          <p className={estilos.rodape}>feito com PageLinks</p>
        </div>
      </main>
    </>
  );
}

export const dynamic = "force-dynamic";
export { linkDoWhatsApp };
