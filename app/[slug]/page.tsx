import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { variaveisDoTema, urlDaFonte } from "@/lib/tema";
import { variaveisDeAjuste, variaveisDeLinha } from "@/lib/ajustes";
import { REDE_POR_ID, destinoDoIcone } from "@/lib/redes";
import DesenhoRede from "./DesenhoRede";
import estilos from "./pagina.module.css";

type Props = { params: Promise<{ slug: string }> };

/** Busca a página publicada de um cliente ativo, com os cards visíveis agora. */
async function buscarPagina(slug: string) {
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
            include: { icones: { orderBy: { ordem: "asc" } } },
          },
        },
      },
    },
  });
  return cliente?.paginas[0] ?? null;
}

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

export default async function PaginaPublica({ params }: Props) {
  const { slug } = await params;
  const pagina = await buscarPagina(slug);
  if (!pagina) notFound();

  const fonte = urlDaFonte(pagina.fonte);
  // Tamanhos, espaços e larguras por tela (lib/ajustes.ts) vão como variáveis de CSS na
  // página e em cada bloco; o pagina.module.css escolhe a da tela. data-pl-tela e
  // data-pl-bloco são por onde as barras do painel mexem na prévia ao vivo.
  const avatar = pagina.avatarTamanho ?? 104;

  /** O que um bloco mostra na página; null quando não tem o que mostrar (imagem sem arquivo, WhatsApp sem número…). */
  function conteudoDoBloco(card: NonNullable<typeof pagina>["cards"][number]) {
    const destino = `/ir/${card.id}`;
    const aba = abrirEmNovaAba(card.tipo === "whatsapp" ? null : card.url); // WhatsApp é sempre https
    const imagem = card.imagemUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={estilos.imagem}
        src={card.imagemUrl}
        alt={card.titulo ?? ""}
      />
    ) : null;
    // Card clicável com imagem: a arte é o próprio card, com o texto já desenhado nela
    // (era assim nas páginas do WordPress). O título fica só como texto alternativo.
    const banner = imagem && <a key={card.id} href={destino} {...aba}>{imagem}</a>;

    switch (card.tipo) {
      case "titulo":
        return <p key={card.id} className={estilos.tituloSecao}>{card.titulo}</p>;

      case "texto":
        return <p key={card.id} className={estilos.texto}>{card.titulo}</p>;

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
              {card.icones.map((icone) => {
                const rede = REDE_POR_ID[icone.rede];
                return rede ? (
                  <a
                    key={icone.id}
                    className={estilos.icone}
                    href={`${destino}?icone=${icone.id}`}
                    {...abrirEmNovaAba(destinoDoIcone(icone.rede, icone.url))}
                    aria-label={rede.nome}
                    title={rede.nome}
                    style={rede.cor ? ({ "--marca": rede.cor } as React.CSSProperties) : undefined}
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

  return (
    <>
      {fonte && <link rel="stylesheet" href={fonte} />}
      <main
        className={estilos.tela}
        style={{ ...variaveisDoTema(pagina), ...variaveisDeAjuste(pagina, "pagina") }}
        data-pl-tela
      >
        <div className={estilos.conteudo}>
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
          ) : (
            <>
              <h1 className={estilos.titulo}>{pagina.titulo}</h1>
              {pagina.bio && <p className={estilos.bio}>{pagina.bio}</p>}
            </>
          )}

          <div className={estilos.blocos}>
            {blocos.map(({ card, conteudo }) => (
              <div
                key={card.id}
                className={estilos.celula}
                data-pl-bloco={card.id}
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
