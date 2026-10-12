import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";

/**
 * Imagens do PageLinks: chegam em WebP pelo painel, saem otimizadas (WebP q90,
 * no tamanho máximo que a página usa) e ficam no Supabase Storage, no bucket
 * público "imagens", em <clienteId>/<uso>-<id>.webp. O nome nunca se repete, então
 * o arquivo pode ficar em cache para sempre.
 *
 * Fala com o Storage pela API REST, sem o supabase-js: são três chamadas.
 */

const BUCKET = "imagens";

/** Teto do envio. A Vercel corta o corpo da requisição em 4,5 MB. */
export const LIMITE_ENVIO = 4 * 1024 * 1024;

export type UsoImagem = "avatar" | "cabecalho" | "card" | "fundo";

// A coluna da página tem 620 px: bloco e cabeçalho limitam só a largura (1240
// cobre tela 2x), porque arte comprida é comum e não pode perder nitidez.
// A foto do topo aparece com 104 px (400 sobra até para 3x); o fundo cobre a tela.
const TAMANHO_MAXIMO: Record<UsoImagem, { largura: number; altura?: number }> = {
  avatar: { largura: 400, altura: 400 },
  cabecalho: { largura: 1240 },
  card: { largura: 1240 },
  fundo: { largura: 1920, altura: 1920 },
};

/**
 * Reduz ao tamanho que a página usa e regrava em WebP q90. Se a imagem já cabe
 * e o original sai mais leve que a regravação, fica o original: otimizar nunca
 * pode deixar o arquivo mais pesado. Lança erro se não for WebP de verdade.
 */
export async function otimizarImagem(entrada: Buffer, uso: UsoImagem) {
  const imagem = sharp(entrada, { animated: true });
  const { format, width = 0, pageHeight, height = 0 } = await imagem.metadata();
  if (format !== "webp") throw new Error("O arquivo não é WebP.");

  const { largura, altura } = TAMANHO_MAXIMO[uso];
  const alturaDoQuadro = pageHeight ?? height;
  const precisaReduzir = width > largura || (altura !== undefined && alturaDoQuadro > altura);

  const saida = await imagem
    .rotate()
    .resize({ width: largura, height: altura, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();

  return !precisaReduzir && saida.length >= entrada.length ? entrada : saida;
}

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) {
    throw new Error("Envio de imagem desligado: falta SUPABASE_SECRET_KEY ou NEXT_PUBLIC_SUPABASE_URL no ambiente.");
  }
  return { url, cabecalhos: { apikey: chave, Authorization: `Bearer ${chave}` } };
}

function prefixoPublico() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
}

/** Sobe a imagem já otimizada e devolve o endereço público. */
export async function guardarImagem(clienteId: string, uso: UsoImagem, conteudo: Buffer) {
  const { url, cabecalhos } = storage();
  const caminho = `${clienteId}/${uso}-${Date.now().toString(36)}${randomBytes(4).toString("hex")}.webp`;

  const resposta = await fetch(`${url}/storage/v1/object/${BUCKET}/${caminho}`, {
    method: "POST",
    headers: {
      ...cabecalhos,
      "Content-Type": "image/webp",
      "cache-control": "max-age=31536000",
      "x-upsert": "false",
    },
    body: new Uint8Array(conteudo),
  });
  if (!resposta.ok) throw new Error(`O Storage recusou a imagem (${resposta.status}): ${await resposta.text()}`);

  return prefixoPublico() + caminho;
}

/**
 * Apaga do bucket as imagens que nenhuma página ou bloco usa mais. Endereço de
 * fora do bucket é ignorado. Confere o banco antes porque duplicar um bloco
 * copia o endereço: dois blocos podem apontar para o mesmo arquivo.
 * Falha aqui não volta para a tela: no pior caso sobra um arquivo no bucket.
 */
export async function apagarImagensOrfas(urls: (string | null | undefined)[]) {
  const candidatas = [...new Set(urls)].filter((u): u is string => !!u && u.startsWith(prefixoPublico()));
  if (candidatas.length === 0) return;

  try {
    const orfas: string[] = [];
    for (const u of candidatas) {
      const [paginas, cards] = await Promise.all([
        prisma.pagina.count({
          where: {
            OR: [
              { avatarUrl: u },
              { cabecalhoImagemUrl: u },
              { fundoImagemUrl: u },
              { seoImagemUrl: u },
              { faviconUrl: u },
            ],
          },
        }),
        prisma.card.count({ where: { imagemUrl: u } }),
      ]);
      if (paginas + cards === 0) orfas.push(u.slice(prefixoPublico().length));
    }
    if (orfas.length === 0) return;

    const { url, cabecalhos } = storage();
    const resposta = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...cabecalhos, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: orfas }),
    });
    if (!resposta.ok) console.error(`Storage não apagou ${orfas.join(", ")} (${resposta.status})`);
  } catch (erro) {
    console.error("Falha ao limpar imagens órfãs:", erro);
  }
}
