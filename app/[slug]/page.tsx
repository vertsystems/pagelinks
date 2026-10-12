import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { variaveisDoTema, urlDaFonte } from "@/lib/tema";
import { TAMANHO_NA_PAGINA } from "@/lib/imagens-limites";
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
  // tamanhos escolhidos na barra do painel; data-pl-tamanho é por onde a prévia ajusta ao vivo
  const avatar = pagina.avatarTamanho ?? TAMANHO_NA_PAGINA.avatar.padrao;
  const cabecalho = pagina.cabecalhoTamanho ?? TAMANHO_NA_PAGINA.cabecalho.padrao;

  return (
    <>
      {fonte && <link rel="stylesheet" href={fonte} />}
      <main className={estilos.tela} style={variaveisDoTema(pagina)}>
        <div className={estilos.conteudo}>
          {pagina.avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={estilos.avatar}
              src={pagina.avatarUrl}
              alt={pagina.titulo}
              width={avatar}
              height={avatar}
              style={{ width: avatar, height: avatar }}
              data-pl-tamanho="avatar"
            />
          )}
          {pagina.cabecalhoImagemUrl ? (
            // A arte da marca já traz o nome e a frase: ela é o título da página.
            <h1 className={estilos.cabecalho}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pagina.cabecalhoImagemUrl}
                alt={[pagina.titulo, pagina.bio].filter(Boolean).join(" — ")}
                style={{ width: `${cabecalho}%` }}
                data-pl-tamanho="cabecalho"
              />
            </h1>
          ) : (
            <>
              <h1 className={estilos.titulo}>{pagina.titulo}</h1>
              {pagina.bio && <p className={estilos.bio}>{pagina.bio}</p>}
            </>
          )}

          <div className={estilos.blocos}>
            {pagina.cards.map((card) => {
              const destino = `/ir/${card.id}`;

              switch (card.tipo) {
                case "titulo":
                  return <p key={card.id} className={estilos.tituloSecao}>{card.titulo}</p>;

                case "texto":
                  return <p key={card.id} className={estilos.texto}>{card.titulo}</p>;

                case "separador":
                  return <hr key={card.id} className={estilos.separador} />;

                case "imagem": {
                  const largura = { width: `${card.imagemTamanho ?? TAMANHO_NA_PAGINA.card.padrao}%` };
                  return card.imagemUrl ? (
                    card.url ? (
                      <a key={card.id} href={destino}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={estilos.imagem} src={card.imagemUrl} alt={card.titulo ?? ""} style={largura} data-pl-tamanho={`card-${card.id}`} />
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={card.id} className={estilos.imagem} src={card.imagemUrl} alt={card.titulo ?? ""} style={largura} data-pl-tamanho={`card-${card.id}`} />
                    )
                  ) : null;
                }

                case "video": {
                  const player = card.url ? urlDeVideo(card.url) : null;
                  return player ? (
                    <iframe key={card.id} className={estilos.video} src={player} title={card.titulo ?? "Vídeo"} allowFullScreen />
                  ) : null;
                }

                case "whatsapp":
                  return card.telefone ? (
                    <a key={card.id} className={`${estilos.botao} ${card.destaque ? estilos.destaque : ""}`} href={destino}>
                      {card.titulo ?? "Chamar no WhatsApp"}
                      {card.subtitulo && <span className={estilos.sub}>{card.subtitulo}</span>}
                    </a>
                  ) : null;

                case "redes":
                case "link":
                case "destaque":
                default:
                  return (
                    <a
                      key={card.id}
                      className={`${estilos.botao} ${card.destaque || card.tipo === "destaque" ? estilos.destaque : ""} ${card.tipo === "redes" ? estilos.secundario : ""}`}
                      href={destino}
                      style={card.corFundo ? { background: card.corFundo, color: card.corTexto ?? undefined } : undefined}
                    >
                      {card.titulo}
                      {card.subtitulo && <span className={estilos.sub}>{card.subtitulo}</span>}
                    </a>
                  );
              }
            })}
          </div>

          <p className={estilos.rodape}>feito com PageLinks</p>
        </div>
      </main>
    </>
  );
}

export const dynamic = "force-dynamic";
export { linkDoWhatsApp };
