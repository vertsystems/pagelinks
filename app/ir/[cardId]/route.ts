import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Redirecionador que conta o clique.
 * Passar pelo servidor em vez de contar no navegador significa que o número não
 * depende de JavaScript, de bloqueador de anúncio nem de consentimento de cookie —
 * e nenhuma informação da pessoa é guardada, só que o card foi clicado.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, url: true, tipo: true, telefone: true, mensagem: true },
  });

  if (!card) return NextResponse.redirect(new URL("/", request.url));

  let destino = card.url ?? "/";
  if (card.tipo === "whatsapp" && card.telefone) {
    const numero = card.telefone.replace(/\D/g, "");
    const texto = card.mensagem ? `?text=${encodeURIComponent(card.mensagem)}` : "";
    destino = `https://wa.me/${numero}${texto}`;
  }

  // Não bloquear o redirecionamento por causa da contagem: se o registro falhar,
  // a pessoa segue para o destino do mesmo jeito.
  prisma.clique
    .create({ data: { cardId: card.id, origem: request.headers.get("referer") ?? undefined } })
    .catch(() => {});

  return NextResponse.redirect(destino, { status: 302 });
}
