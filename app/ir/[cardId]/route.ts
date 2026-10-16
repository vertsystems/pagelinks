import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { destinoDoIcone } from "@/lib/redes";
import { emVigor } from "@/lib/linksProgramados";

/**
 * Redirecionador que conta o clique.
 * Passar pelo servidor em vez de contar no navegador significa que o número não
 * depende de JavaScript, de bloqueador de anúncio nem de consentimento de cookie —
 * e nenhuma informação da pessoa é guardada, só que o card foi clicado.
 *
 * Bloco de redes: cada ícone vem como /ir/<cardId>?icone=<iconeId>, e o clique
 * guarda também qual ícone foi. Carrossel: cada imagem com link vem como
 * /ir/<cardId>?imagem=<id>, e cada unidade, /ir/<cardId>?unidade=<id> (o clique conta para o bloco).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  const busca = new URL(request.url).searchParams;
  const iconeId = busca.get("icone");
  const imagemId = busca.get("imagem");
  const unidadeId = busca.get("unidade");

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      url: true,
      tipo: true,
      telefone: true,
      mensagem: true,
      icones: iconeId ? { where: { id: iconeId }, select: { id: true, rede: true, url: true } } : false,
      imagens: imagemId ? { where: { id: imagemId }, select: { url: true } } : false,
      unidades: unidadeId ? { where: { id: unidadeId }, select: { url: true } } : false,
      // link programado no ar agora, no lugar do endereço de destino (lib/linksProgramados.ts)
      programados: { where: emVigor(new Date()), orderBy: { inicio: "desc" }, take: 1, select: { url: true } },
    },
  });

  if (!card) return NextResponse.redirect(new URL("/", request.url));

  const icone = card.icones?.[0];
  const imagem = card.imagens?.[0];
  const unidade = card.unidades?.[0];
  let destino = card.programados[0]?.url ?? card.url ?? "/";
  if (icone) {
    destino = destinoDoIcone(icone.rede, icone.url);
  } else if (imagem) {
    destino = imagem.url ?? "/";
  } else if (unidade) {
    destino = unidade.url ?? "/";
  } else if (card.tipo === "whatsapp" && card.telefone) {
    const numero = card.telefone.replace(/\D/g, "");
    const texto = card.mensagem ? `?text=${encodeURIComponent(card.mensagem)}` : "";
    destino = `https://wa.me/${numero}${texto}`;
  }

  // Não bloquear o redirecionamento por causa da contagem: se o registro falhar,
  // a pessoa segue para o destino do mesmo jeito.
  prisma.clique
    .create({ data: { cardId: card.id, iconeId: icone?.id, origem: request.headers.get("referer") ?? undefined } })
    .catch(() => {});

  return NextResponse.redirect(new URL(destino, request.url), { status: 302 });
}
