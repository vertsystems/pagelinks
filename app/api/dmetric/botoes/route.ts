import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REDE_POR_ID } from "@/lib/redes";

export const dynamic = "force-dynamic";

/** Os blocos que levam a algum lugar: passam pelo /ir/ e contam o clique. */
const CLICAVEIS = new Set(["link", "destaque", "whatsapp", "imagem", "redes", "carrossel", "unidades"]);

/**
 * Os botões de uma página e os cliques de cada um, para o DMetric (dspace.verts.me)
 * mostrar o desempenho por botão: qual rende mais, a taxa de clique e se a posição
 * faz diferença. Só responde a quem traz o segredo combinado
 * (DMETRIC_PAGELINKS_SEGREDO, o mesmo nos dois projetos da Vercel).
 *
 *   GET /api/dmetric/botoes?slug=lojasmari&desde=<ISO>&ate=<ISO>
 *
 * Clique sem origem (sem referer) fica de fora: é robô. Quem toca num botão da
 * página chega aqui com a própria página como origem; os robôs que varrem os
 * links /ir/ chegam sem nada, em rajada (vistos em 23/10/2026). Vêm só somados,
 * em `semOrigem`.
 *
 * `posicao` é o lugar do botão entre os botões que estão no ar hoje (1 = o
 * primeiro da página). Botão fora do ar só aparece se teve clique no período.
 */
export async function GET(request: Request) {
  const segredo = process.env.DMETRIC_PAGELINKS_SEGREDO;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const busca = new URL(request.url).searchParams;
  const slug = (busca.get("slug") ?? "").toLowerCase();
  const desde = new Date(busca.get("desde") ?? "");
  const ate = new Date(busca.get("ate") ?? "");
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || isNaN(+desde) || isNaN(+ate) || desde >= ate) {
    return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });
  }

  const cliente = await prisma.cliente.findFirst({
    where: { slug },
    select: {
      paginas: {
        where: { publicada: true },
        take: 1,
        select: {
          titulo: true,
          cards: {
            orderBy: { ordem: "asc" },
            select: {
              id: true,
              tipo: true,
              titulo: true,
              url: true,
              imagemUrl: true,
              ativo: true,
              publicarEm: true,
              despublicarEm: true,
              icones: { orderBy: { ordem: "asc" }, select: { id: true, rede: true } },
              unidades: { orderBy: { ordem: "asc" }, select: { id: true, nome: true } },
              imagens: { orderBy: { ordem: "asc" }, select: { id: true, imagemUrl: true, url: true } },
            },
          },
        },
      },
    },
  });
  const pagina = cliente?.paginas[0];
  if (!pagina) return NextResponse.json({ erro: "página não encontrada" }, { status: 404 });

  // Imagem sem link não leva a lugar nenhum (a página nem põe o /ir/ nela).
  const cards = pagina.cards.filter((c) => CLICAVEIS.has(c.tipo) && (c.tipo !== "imagem" || c.url));
  const ids = cards.map((c) => c.id);
  const periodo = { gte: desde, lt: ate };
  const [contagem, semOrigem] = await Promise.all([
    prisma.clique.groupBy({
      by: ["cardId", "iconeId", "itemId"],
      where: { cardId: { in: ids }, data: periodo, origem: { not: null } },
      _count: { _all: true },
    }),
    prisma.clique.count({ where: { cardId: { in: ids }, data: periodo, origem: null } }),
  ]);
  const soma = (filtro: (k: (typeof contagem)[number]) => boolean) =>
    contagem.filter(filtro).reduce((t, k) => t + k._count._all, 0);

  // No ar agora, como a página mostra: ativo e dentro de publicarEm/despublicarEm.
  const agora = new Date();
  let posicao = 0;
  const botoes = cards
    .map((c) => {
      const noAr =
        c.ativo && (!c.publicarEm || c.publicarEm <= agora) && (!c.despublicarEm || c.despublicarEm >= agora);
      const cliques = soma((k) => k.cardId === c.id);
      const itens =
        c.tipo === "redes"
          ? c.icones.map((i) => ({
              nome: REDE_POR_ID[i.rede]?.nome ?? i.rede,
              imagem: null as string | null,
              cliques: soma((k) => k.cardId === c.id && k.iconeId === i.id),
            }))
          : c.tipo === "unidades"
            ? c.unidades.map((u) => ({ nome: u.nome, imagem: null as string | null, cliques: soma((k) => k.cardId === c.id && k.itemId === u.id) }))
            : c.tipo === "carrossel"
              ? c.imagens
                  .filter((im) => im.url)
                  .map((im, i) => ({ nome: `Imagem ${i + 1}`, imagem: im.imagemUrl, cliques: soma((k) => k.cardId === c.id && k.itemId === im.id) }))
              : [];
      return {
        id: c.id,
        tipo: c.tipo,
        titulo: c.titulo || null,
        imagem: c.imagemUrl,
        noAr,
        posicao: noAr ? ++posicao : null,
        cliques,
        itens,
        // Cliques do bloco sem item conhecido: os de antes de o PageLinks guardar o item.
        semItem: cliques - itens.reduce((t, i) => t + i.cliques, 0),
      };
    })
    .filter((b) => b.noAr || b.cliques > 0);

  return NextResponse.json(
    { pagina: { slug, titulo: pagina.titulo }, botoes, semOrigem },
    { headers: { "cache-control": "no-store" } },
  );
}
