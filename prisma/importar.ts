/**
 * Importa a carteira do dnms.fun para o PageLinks.
 *
 * Fontes:
 *   material/00-Listagem-Paginas-dnms.fun.md  → nome e slug oficiais de cada cliente
 *   material/catalogo-paginas.json            → estrutura e tema lidos dos prints
 *
 * O que ele NÃO faz: recriar o conteúdo exato das páginas. Os blocos entram como
 * espaços reservados, na quantidade e na ordem certas, para serem preenchidos pelo
 * painel. Foi o que o Bruno pediu — os prints não têm resolução para copiar texto.
 *
 * Rodar de novo é seguro: o cliente é encontrado pelo slug e atualizado; os blocos
 * são refeitos apenas se a página ainda estiver intocada (nenhum bloco editado).
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

type Bloco = { tipo: string; rotulo: string };
type Catalogo = {
  arquivo: string; slug: string; titulo: string; bio: string;
  temAvatar: boolean; temCapa: boolean; totalBlocos: number; blocos: Bloco[];
  corFundo: string; corDestaque: string; corTexto: string;
  fundoTipo: string; estiloBotao: string; temIconesRedes: boolean; observacao: string;
};

const TIPOS_VALIDOS = new Set([
  "link", "destaque", "whatsapp", "titulo", "texto", "imagem", "video", "redes", "separador",
]);

/**
 * Lê a tabela do markdown: devolve slug → título oficial.
 *
 * Cuidado que custou uma rodada: vários títulos têm "|" dentro
 * ("Adventure & Love™ | PageLinks", "Pack Profissional | Canva | Aline Santana"),
 * então contar colunas não funciona. O slug é a única célula sempre entre crases —
 * é ele que ancora a leitura, e o título é tudo que vem antes dele.
 */
function lerListagem(): Map<string, string> {
  const texto = readFileSync("material/00-Listagem-Paginas-dnms.fun.md", "utf8");
  const mapa = new Map<string, string>();

  for (const linha of texto.split("\n")) {
    if (!linha.trim().startsWith("|") || linha.includes("---")) continue;

    const celulas = linha.split("|").map((c) => c.trim()).filter((c, i, arr) => !(i === 0 || i === arr.length - 1) || c);
    const iSlug = celulas.findIndex((c) => /^`[a-z0-9-]+`$/.test(c));
    if (iSlug < 1) continue;

    const slug = celulas[iSlug].replace(/`/g, "");
    const titulo = celulas
      .slice(1, iSlug)
      .filter((c) => c && !/^PageLinks( Antiga)?$/i.test(c))
      .join(" | ")
      .trim();

    if (slug) mapa.set(slug, titulo || slug);
  }
  return mapa;
}

/** Luminância relativa (WCAG). */
function luminancia(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return [r, g, b]
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrasteEntre(a: string, b: string) {
  const [l1, l2] = [luminancia(a), luminancia(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Cor legível sobre um fundo: escolhe entre preto e branco o que der MAIS contraste.
 *
 * Decidir por limiar de luminância (">0.5 usa preto") erra justamente nas cores
 * médias — um verde-oliva fica com texto branco a 2,3:1, ilegível. Comparar os dois
 * candidatos custa o mesmo e nunca erra.
 */
function corLegivel(fundo: string) {
  return contrasteEntre("#101010", fundo) >= contrasteEntre("#FFFFFF", fundo)
    ? "#101010"
    : "#FFFFFF";
}

/**
 * Ajusta o tom de uma cor até que preto ou branco alcance 4.5:1 sobre ela.
 *
 * Existe porque cor média — um rosa-claro, um dourado — não atinge o mínimo com
 * nenhum dos dois. Escurecer ou clarear alguns passos resolve sem descaracterizar
 * a marca do cliente, e é preferível a entregar botão que ninguém lê.
 */
function ajustarAteLegivel(cor: string) {
  const melhor = (c: string) => Math.max(contrasteEntre("#101010", c), contrasteEntre("#FFFFFF", c));
  if (melhor(cor) >= 4.5) return cor;

  const h = cor.replace("#", "");
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const paraHex = () => "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

  // escurece de 4% em 4%; 24 passos cobrem do mais claro ao quase preto
  for (let i = 0; i < 24; i++) {
    r *= 0.96; g *= 0.96; b *= 0.96;
    if (melhor(paraHex()) >= 4.5) return paraHex();
  }
  return paraHex();
}

/**
 * Mantém a cor lida do print quando ela é legível; senão troca pela melhor.
 * Os prints dão uma leitura aproximada — fidelidade não vale página ilegível.
 * Devolve também se houve troca, para registrar na anotação do cliente.
 */
function corDeTexto(lida: string | undefined, fundo: string) {
  if (lida && /^#[0-9a-fA-F]{6}$/.test(lida) && contrasteEntre(lida, fundo) >= 4.5) {
    return { cor: lida.toUpperCase(), ajustada: false };
  }
  return { cor: corLegivel(fundo), ajustada: true };
}

function hexValido(cor: string | undefined, padrao: string) {
  return cor && /^#[0-9a-fA-F]{6}$/.test(cor) ? cor.toUpperCase() : padrao;
}

async function main() {
  const listagem = lerListagem();
  const catalogo: Catalogo[] = JSON.parse(readFileSync("material/catalogo-paginas.json", "utf8"));
  const porSlug = new Map(catalogo.map((c) => [c.slug, c]));

  console.log(`listagem: ${listagem.size} páginas · prints lidos: ${catalogo.length}`);

  let criados = 0, atualizados = 0, pulados = 0, semPrint = 0;
  const ajustes: string[] = [];
  const tonsAjustados: string[] = [];

  for (const [slug, tituloOficial] of listagem) {
    const lido = porSlug.get(slug);
    if (!lido) semPrint++;

    const corFundo = hexValido(lido?.corFundo, "#101010");
    const corDestaqueLida = hexValido(lido?.corDestaque, "#FF6F00");
    const corDestaque = ajustarAteLegivel(corDestaqueLida);
    if (corDestaque !== corDestaqueLida) tonsAjustados.push(slug);
    const texto = corDeTexto(lido?.corTexto, corFundo);
    const corTexto = texto.cor;
    const corTextoBotao = corLegivel(corDestaque);
    if (texto.ajustada) ajustes.push(slug);

    const dadosPagina = {
      titulo: lido?.titulo?.trim() || tituloOficial,
      bio: lido?.bio?.trim() || null,
      publicada: true,
      corFundo,
      corTexto,
      corDestaque,
      corTextoBotao,
      fonte: "Inter",
      estiloBotao: ["arredondado", "reto", "pilula", "contorno"].includes(lido?.estiloBotao ?? "")
        ? lido!.estiloBotao : "arredondado",
      fundoTipo: ["solido", "gradiente", "imagem"].includes(lido?.fundoTipo ?? "")
        ? lido!.fundoTipo : "solido",
      seoTitulo: tituloOficial,
      seoDescricao: lido?.bio?.trim() || null,
    };

    const existente = await prisma.cliente.findUnique({
      where: { slug },
      include: { paginas: { include: { cards: true } } },
    });

    if (!existente) {
      const cliente = await prisma.cliente.create({
        data: {
          nome: tituloOficial,
          slug,
          observacao: [lido?.observacao?.trim(), texto.ajustada ? "Cor do texto ajustada na importação para garantir leitura — conferir no painel." : null].filter(Boolean).join(" ") || null,
          paginas: { create: dadosPagina },
        },
        include: { paginas: true },
      });
      await criarBlocos(cliente.paginas[0].id, lido);
      criados++;
      continue;
    }

    const pagina = existente.paginas[0];
    const intocada = pagina.cards.every((c) => c.criadoEm.getTime() === c.atualizadoEm.getTime());

    await prisma.cliente.update({
      where: { id: existente.id },
      data: { nome: tituloOficial, observacao: lido?.observacao?.trim() || existente.observacao },
    });

    if (!intocada) {
      console.log(`  · ${slug}: já editado no painel, blocos preservados`);
      pulados++;
      continue;
    }

    await prisma.pagina.update({ where: { id: pagina.id }, data: dadosPagina });
    await prisma.card.deleteMany({ where: { paginaId: pagina.id } });
    await criarBlocos(pagina.id, lido);
    atualizados++;
  }

  console.log(`\n✓ ${criados} criados · ${atualizados} atualizados · ${pulados} preservados`);
  if (ajustes.length)
    console.log(`  ${ajustes.length} páginas com a cor do texto ajustada para ficar legível`);
  if (tonsAjustados.length)
    console.log(`  ${tonsAjustados.length} com o tom do botão escurecido para o texto caber: ${tonsAjustados.join(", ")}`);
  if (semPrint) console.log(`  ${semPrint} sem print lido: entraram com o tema padrão e sem blocos`);

  const totais = await prisma.cliente.count();
  const cards = await prisma.card.count();
  console.log(`  banco agora: ${totais} clientes · ${cards} blocos`);
}

/** Cria os blocos na quantidade e ordem que o print mostrou. */
async function criarBlocos(paginaId: string, lido?: Catalogo) {
  if (!lido) return;

  const blocos = lido.blocos?.length
    ? lido.blocos
    : Array.from({ length: lido.totalBlocos }, () => ({ tipo: "link", rotulo: "" }));

  await prisma.card.createMany({
    data: blocos.map((b, i) => {
      const tipo = TIPOS_VALIDOS.has(b.tipo) ? b.tipo : "link";
      const rotulo = (b.rotulo ?? "").trim();
      return {
        paginaId,
        tipo,
        titulo: rotulo || rotuloVazio(tipo, i + 1),
        ordem: i + 1,
        ativo: true,
      };
    }),
  });
}

function rotuloVazio(tipo: string, posicao: number) {
  const nomes: Record<string, string> = {
    link: `Link ${posicao} — preencher`,
    destaque: `Destaque ${posicao} — preencher`,
    whatsapp: "WhatsApp — preencher número",
    titulo: "Título da seção — preencher",
    texto: "Texto — preencher",
    imagem: "Imagem — colar endereço",
    video: "Vídeo — colar endereço",
    redes: "Redes sociais — preencher",
    separador: "",
  };
  return nomes[tipo] ?? `Bloco ${posicao} — preencher`;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
