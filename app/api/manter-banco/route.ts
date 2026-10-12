import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Mantém o Supabase acordado. No plano Free o projeto pausa depois de 7 dias sem
 * uso, e a página de todo cliente cai junto. A Vercel chama esta rota a cada
 * 5 dias (vercel.json), com uma consulta de verdade ao banco para contar como atividade.
 * Só responde a quem traz o CRON_SECRET, que é o que a Vercel envia no agendamento.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const clientes = await prisma.cliente.count();
  return NextResponse.json({ ok: true, clientes, em: new Date().toISOString() });
}
