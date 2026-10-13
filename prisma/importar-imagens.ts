/**
 * Importa as imagens das páginas de uma pasta, uma subpasta por cliente:
 *
 *   01-logo.png      → foto do topo (logo largo ou comprido entra "sem cortar")
 *   02-nome.png      → imagem no lugar do título e da frase
 *   03-card-NN.png   → imagens dos blocos clicáveis, na ordem
 *   extras/          → não entra (não dá para saber onde vai); fica no relatório
 *
 *   npx tsx prisma/importar-imagens.ts <pasta> <mapa.json> [links.json]            # só mostra o plano
 *   npx tsx prisma/importar-imagens.ts <pasta> <mapa.json> [links.json] --aplicar  # faz
 *
 * mapa.json: { "nome da subpasta": "slug do cliente" }.
 * links.json (opcional): { slug: [{ link, proporcao, titulo? }] }, as imagens da página
 * antiga na ordem. Cada arquivo casa com a próxima imagem de proporção parecida (4%), e o
 * link dela vai para o bloco. WhatsApp vira número e mensagem num bloco de WhatsApp.
 *
 * Só preenche o que está vazio: página que já tem qualquer imagem é pulada inteira.
 * Imagem sobra além dos blocos → bloco novo depois do último que recebeu imagem.
 * Bloco que fica com imagem e sem destino vira bloco de imagem (não leva a lugar nenhum).
 * Arte do nome menor que a coluna ganha tamanho para não esticar (fica nítida).
 * Com --aplicar, guarda antes o estado de cada página tocada em
 * <pasta>/importar-imagens-<data>.json (fora do projeto: não vai para o git).
 */
import "dotenv/config";
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { prisma } from "../lib/prisma";
import type { Prisma } from "../lib/generated/prisma/client";
import { guardarImagem, otimizarImagem } from "../lib/imagens";
import type { UsoImagem } from "../lib/imagens-limites";

type ImagemAntiga = { link: string | null; proporcao: number | null; titulo?: string };
const CLICAVEIS = ["link", "destaque", "whatsapp", "imagem"];
const COLUNA = { celular: 358, tablet: 620 }; // largura útil da coluna da página

const [base, arquivoMapa, ...resto] = process.argv.slice(2);
const aplicar = resto.includes("--aplicar");
const arquivoLinks = resto.find((a) => !a.startsWith("--"));
if (!base || !arquivoMapa) {
  console.error("uso: npx tsx prisma/importar-imagens.ts <pasta> <mapa.json> [links.json] [--aplicar]");
  process.exit(1);
}
const mapa: Record<string, string> = JSON.parse(readFileSync(arquivoMapa, "utf8"));
const antigas: Record<string, ImagemAntiga[]> = arquivoLinks ? JSON.parse(readFileSync(arquivoLinks, "utf8")) : {};

const ehWhatsapp = (link: string) => /(?:api\.whatsapp\.com|wa\.me|whatsapp\.com\/send)/i.test(link);
function whatsapp(link: string) {
  const url = new URL(link);
  const numero = (url.searchParams.get("phone") ?? url.pathname.replace(/\D/g, "")).replace(/\D/g, "");
  return { telefone: numero || null, mensagem: url.searchParams.get("text") };
}
const linkValido = (link: string | null) => !!link && !/^(#|javascript:)/i.test(link) && link !== "/";

async function subir(clienteId: string, uso: UsoImagem, caminho: string) {
  const otimizada = await otimizarImagem(readFileSync(caminho), uso);
  return guardarImagem(clienteId, uso, otimizada);
}

async function main() {
  const copia: unknown[] = [];
  const relatorio: string[] = [];

  for (const [pasta, slug] of Object.entries(mapa)) {
    const dir = `${base}/${pasta}`;
    const cliente = await prisma.cliente.findUnique({
      where: { slug },
      include: { paginas: { take: 1, include: { cards: { orderBy: { ordem: "asc" } } } } },
    });
    const pagina = cliente?.paginas[0];
    if (!cliente || !pagina) {
      relatorio.push(`${slug}: cliente não encontrado`);
      continue;
    }
    const clicaveis = pagina.cards.filter((c) => CLICAVEIS.includes(c.tipo));
    if (pagina.avatarUrl || pagina.cabecalhoImagemUrl || pagina.cards.some((c) => c.imagemUrl)) {
      relatorio.push(`${slug}: pulada (já tem imagem)`);
      continue;
    }

    const arquivos = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort();
    const medir = async (f: string) => {
      const m = await sharp(`${dir}/${f}`).metadata();
      return { f, w: m.width!, h: m.height!, p: m.width! / m.height! };
    };
    const logo = arquivos.includes("01-logo.png") ? await medir("01-logo.png") : null;
    const nome = arquivos.includes("02-nome.png") ? await medir("02-nome.png") : null;
    const cards = await Promise.all(arquivos.filter((f) => /^03-card/i.test(f)).map(medir));
    const extras = existsSync(`${dir}/extras`) ? readdirSync(`${dir}/extras`).length : 0;

    // casa cada arquivo com a próxima imagem da página antiga de proporção parecida
    const lista = antigas[slug] ?? [];
    let j = 0;
    const casar = (p: number) => {
      for (let k = j; k < lista.length; k++) {
        const prop = lista[k].proporcao;
        if (prop && Math.abs(prop - p) / p < 0.04) {
          j = k + 1;
          return lista[k];
        }
      }
      return null;
    };
    if (logo) casar(logo.p);
    if (nome) casar(nome.p);
    const casados = cards.map((c) => ({ ...c, antiga: casar(c.p) }));

    const logoLivre = !!logo && (logo.p > 1.25 || logo.p < 0.8);
    const novos = casados.length - Math.min(casados.length, clicaveis.length);
    const comLink = casados.filter((c) => linkValido(c.antiga?.link ?? null)).length;
    const linha = `${slug}: foto ${logo ? (logoLivre ? "sem cortar" : "redonda") : "—"} · nome ${nome ? "sim" : "—"} · ${cards.length} imagens de bloco (${novos} em blocos novos) · ${comLink} com link${extras ? ` · ${extras} extras fora` : ""}`;
    relatorio.push(linha);
    if (!aplicar) continue;

    copia.push({ slug, pagina: { ...pagina, cards: undefined }, cards: pagina.cards });

    // foto e arte do nome
    const dadosPagina: Record<string, unknown> = {};
    if (logo) {
      dadosPagina.avatarUrl = await subir(cliente.id, "avatar", `${dir}/${logo.f}`);
      if (logoLivre) {
        dadosPagina.avatarFormato = "livre";
        dadosPagina.avatarTamanho = logo.p > 1 ? 240 : 120; // largura do logo na tela
      }
    }
    if (nome) {
      dadosPagina.cabecalhoImagemUrl = await subir(cliente.id, "cabecalho", `${dir}/${nome.f}`);
      // não esticar além do tamanho do arquivo: % da coluna em que ele fica nítido
      const porcentagem = (coluna: number) => (nome.w < coluna ? Math.max(20, Math.round((nome.w / coluna) * 20) * 5) : null);
      if (porcentagem(COLUNA.celular)) dadosPagina.cabecalhoTamanho = porcentagem(COLUNA.celular);
      const tablet = porcentagem(COLUNA.tablet);
      if (tablet) dadosPagina.ajustesTablet = JSON.stringify({ cabecalho: tablet });
    }
    if (Object.keys(dadosPagina).length) await prisma.pagina.update({ where: { id: pagina.id }, data: dadosPagina as Prisma.PaginaUpdateInput });

    // imagens dos blocos
    const ultimaOrdem = casados.length && clicaveis.length ? clicaveis[Math.min(casados.length, clicaveis.length) - 1].ordem : (pagina.cards.at(-1)?.ordem ?? 0);
    if (novos > 0) {
      await prisma.card.updateMany({ where: { paginaId: pagina.id, ordem: { gt: ultimaOrdem } }, data: { ordem: { increment: novos } } });
    }
    for (const [i, c] of casados.entries()) {
      const imagemUrl = await subir(cliente.id, "card", `${dir}/${c.f}`);
      const link = linkValido(c.antiga?.link ?? null) ? c.antiga!.link! : null;
      const bloco = clicaveis[i];
      const dados: Record<string, unknown> = { imagemUrl };

      let tipo = bloco?.tipo ?? "link";
      let temDestino = !!(bloco?.url || bloco?.telefone);
      if (link && ehWhatsapp(link) && tipo === "whatsapp") {
        const { telefone, mensagem } = whatsapp(link);
        if (!bloco?.telefone && telefone) dados.telefone = telefone;
        if (!bloco?.mensagem && mensagem) dados.mensagem = mensagem;
        temDestino ||= !!telefone;
      } else if (link) {
        if (tipo === "whatsapp") tipo = "link";
        if (!bloco?.url) dados.url = link;
        temDestino = true;
      }
      if (!temDestino) tipo = "imagem"; // sem destino, a arte só aparece
      dados.tipo = tipo;

      if (bloco) {
        await prisma.card.update({ where: { id: bloco.id }, data: dados as Prisma.CardUpdateInput });
      } else {
        await prisma.card.create({
          data: {
            paginaId: pagina.id,
            ...dados,
            tipo,
            titulo: c.antiga?.titulo ?? `Banner ${i + 1}`,
            ordem: ultimaOrdem + (i - clicaveis.length) + 1,
          } as Prisma.CardUncheckedCreateInput,
        });
      }
    }
    console.log(`✓ ${linha}`);
  }

  if (aplicar) {
    const arquivo = `${base}/importar-imagens-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    writeFileSync(arquivo, JSON.stringify(copia, null, 1));
    console.log(`\ncópia do antes: ${arquivo}`);
  }
  console.log(`\n${aplicar ? "FEITO" : "PLANO (nada foi gravado)"}:\n` + relatorio.map((l) => "  " + l).join("\n"));
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
