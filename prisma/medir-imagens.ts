/**
 * Mede as imagens que ainda não têm tamanho gravado (logo, cabeçalho, imagem de bloco e de
 * carrossel) e grava largura e altura no banco. A página põe esses números no <img>, e o
 * navegador guarda o lugar da imagem antes de ela chegar: sem eles a página pulava (CLS).
 *
 *   npm run db:medir-imagens            mede e grava
 *   npm run db:medir-imagens -- --ver   só mostra o que mediria
 *
 * O envio pelo painel já grava o tamanho; isto é para as imagens de antes (16/10/2026) e para
 * as que entram por importação. Só escreve nas colunas de tamanho. Rodar de novo é seguro:
 * o que já tem medida fica como está.
 */
import "dotenv/config";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const soVer = process.argv.includes("--ver");

type Tamanho = { largura: number; altura: number };
const medidas = new Map<string, Promise<Tamanho | null>>();

/** Baixa e mede; cada endereço uma vez só (a cópia de um bloco usa o mesmo arquivo). */
function medir(url: string) {
  if (!medidas.has(url)) {
    medidas.set(
      url,
      (async () => {
        try {
          const resposta = await fetch(url);
          if (!resposta.ok) return null;
          const { width, height, pageHeight } = await sharp(Buffer.from(await resposta.arrayBuffer()), { animated: true }).metadata();
          const altura = pageHeight ?? height;
          return width && altura ? { largura: width, altura } : null;
        } catch {
          return null;
        }
      })(),
    );
  }
  return medidas.get(url)!;
}

/** Roda as tarefas de 8 em 8: rápido sem abrir conexão demais com o Storage. */
async function emLotes<T>(itens: T[], tarefa: (item: T) => Promise<void>) {
  for (let i = 0; i < itens.length; i += 8) await Promise.all(itens.slice(i, i + 8).map(tarefa));
}

async function main() {
  const conta = { medidas: 0, falharam: [] as string[] };
  const anotar = (url: string, tamanho: Tamanho | null) => (tamanho ? conta.medidas++ : conta.falharam.push(url));

  const paginas = await prisma.pagina.findMany({
    where: {
      OR: [
        { avatarUrl: { not: null }, avatarLargura: null },
        { cabecalhoImagemUrl: { not: null }, cabecalhoLargura: null },
      ],
    },
    select: { id: true, avatarUrl: true, avatarLargura: true, cabecalhoImagemUrl: true, cabecalhoLargura: true },
  });
  await emLotes(paginas, async (p) => {
    const data: Record<string, number> = {};
    if (p.avatarUrl && p.avatarLargura === null) {
      const t = await medir(p.avatarUrl);
      anotar(p.avatarUrl, t);
      if (t) Object.assign(data, { avatarLargura: t.largura, avatarAltura: t.altura });
    }
    if (p.cabecalhoImagemUrl && p.cabecalhoLargura === null) {
      const t = await medir(p.cabecalhoImagemUrl);
      anotar(p.cabecalhoImagemUrl, t);
      if (t) Object.assign(data, { cabecalhoLargura: t.largura, cabecalhoAltura: t.altura });
    }
    if (!soVer && Object.keys(data).length) await prisma.pagina.update({ where: { id: p.id }, data });
  });

  const cards = await prisma.card.findMany({ where: { imagemUrl: { not: null }, imagemLargura: null }, select: { id: true, imagemUrl: true } });
  await emLotes(cards, async (c) => {
    const t = await medir(c.imagemUrl!);
    anotar(c.imagemUrl!, t);
    if (!soVer && t) await prisma.card.update({ where: { id: c.id }, data: { imagemLargura: t.largura, imagemAltura: t.altura } });
  });

  const imagens = await prisma.imagemCarrossel.findMany({ where: { largura: null }, select: { id: true, imagemUrl: true } });
  await emLotes(imagens, async (i) => {
    const t = await medir(i.imagemUrl);
    anotar(i.imagemUrl, t);
    if (!soVer && t) await prisma.imagemCarrossel.update({ where: { id: i.id }, data: { largura: t.largura, altura: t.altura } });
  });

  console.log(
    `${soVer ? "Mediria" : "Mediu"}: ${paginas.length} páginas, ${cards.length} blocos, ${imagens.length} imagens de carrossel ` +
      `(${medidas.size} arquivos diferentes, ${conta.medidas} medidas).`,
  );
  if (conta.falharam.length) {
    console.log(`Não deu para medir ${conta.falharam.length} (arquivo fora do ar ou que não é imagem); ficam sem tamanho, como antes:`);
    for (const url of [...new Set(conta.falharam)]) console.log(`  ${url}`);
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
