import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limparProgramacoesVencidas } from "@/lib/programacoes-banco";

export const dynamic = "force-dynamic";

/**
 * Mantém o Supabase acordado. No plano Free o projeto pausa depois de 7 dias sem
 * uso, e a página de todo cliente cai junto. A Vercel chama esta rota a cada
 * 5 dias (vercel.json), com uma consulta de verdade ao banco para contar como atividade.
 * Só responde a quem traz o CRON_SECRET, que é o que a Vercel envia no agendamento.
 *
 * Na mesma passada, apaga as fotos e aparências programadas que já acabaram, com as imagens
 * delas (lib/programacoes-banco.ts): a página que não grava outra programação não as limparia.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const clientes = await prisma.cliente.count();
  const programacoesApagadas = await limparProgramacoesVencidas().catch((erro) => {
    console.error("Falha ao limpar programações vencidas:", erro);
    return null;
  });
  return NextResponse.json({ ok: true, clientes, programacoesApagadas, em: new Date().toISOString() });
}
