/**
 * Regras das imagens que o navegador e o servidor precisam enxergar iguais.
 * Fica fora de lib/imagens.ts porque aquele usa o sharp, que só roda no servidor.
 */

export type UsoImagem = "avatar" | "cabecalho" | "card" | "fundo";
export type CampoImagemPagina = "avatarUrl" | "cabecalhoImagemUrl" | "fundoImagemUrl";

/** Entra WebP ou PNG; sai sempre WebP q90. */
export const FORMATOS_ACEITOS = ["image/webp", "image/png"];

/** Teto do envio. A Vercel corta o corpo da requisição em 4,5 MB. */
export const LIMITE_ENVIO = 4 * 1024 * 1024;

// A coluna da página tem 620 px: bloco e cabeçalho limitam só a largura (1240
// cobre tela 2x), porque arte comprida é comum e não pode perder nitidez.
// A foto do topo aparece com 104 px (400 sobra até para 3x); o fundo cobre a tela.
export const TAMANHO_MAXIMO: Record<UsoImagem, { largura: number; altura?: number }> = {
  avatar: { largura: 400, altura: 400 },
  cabecalho: { largura: 1240 },
  card: { largura: 1240 },
  fundo: { largura: 1920, altura: 1920 },
};

export const USO_DO_CAMPO: Record<CampoImagemPagina, UsoImagem> = {
  avatarUrl: "avatar",
  cabecalhoImagemUrl: "cabecalho",
  fundoImagemUrl: "fundo",
};
