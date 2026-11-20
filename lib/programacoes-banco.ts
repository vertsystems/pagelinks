import { prisma } from "@/lib/prisma";
import { apagarImagensOrfas } from "@/lib/imagens";

/**
 * Apaga as fotos e aparências programadas que já acabaram (de uma página, ou de todas) e as
 * imagens que só elas usavam. Roda quando a página grava uma programação e no /api/manter-banco/:
 * sem isso, a foto de uma campanha que passou ficaria no bucket para sempre (lib/programacoes.ts).
 */
export async function limparProgramacoesVencidas(paginaId?: string) {
  const onde = { fim: { lte: new Date() }, ...(paginaId && { paginaId }) };
  const [fotos, aparencias] = await Promise.all([
    prisma.fotoProgramada.findMany({ where: onde, select: { id: true, imagemUrl: true } }),
    prisma.aparenciaProgramada.findMany({ where: onde, select: { id: true, fundoImagemUrl: true } }),
  ]);
  if (!fotos.length && !aparencias.length) return 0;

  await prisma.$transaction([
    prisma.fotoProgramada.deleteMany({ where: { id: { in: fotos.map((f) => f.id) } } }),
    prisma.aparenciaProgramada.deleteMany({ where: { id: { in: aparencias.map((a) => a.id) } } }),
  ]);
  await apagarImagensOrfas([...fotos.map((f) => f.imagemUrl), ...aparencias.map((a) => a.fundoImagemUrl)]);
  return fotos.length + aparencias.length;
}
