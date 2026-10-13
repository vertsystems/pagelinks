/**
 * Fontes dos blocos de título e de texto: 42 do Google Fonts, em quatro grupos (básicas,
 * modernas, clássicas, e destaque e manuscritas). A página carrega só as que usa, uma
 * <link> por fonte (urlDaFonteDoTexto).
 *
 * `estilos` é o pedido exato de cada uma, tirado do catálogo do Google
 * (fonts.google.com/metadata/fonts, em 13/10/2026): itálico e negrito só onde existem. Sem
 * eles, o navegador imita (fica um pouco pior, mas aparece). `reserva` é a família genérica
 * enquanto a fonte carrega.
 * Sem import de servidor: o editor, que roda no navegador, também usa.
 */

export type FonteDoTexto = { nome: string; grupo: string; estilos: string; reserva: string };

export const FONTES_DO_TEXTO: FonteDoTexto[] = [
  { nome: "Inter", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Roboto", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Open Sans", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Lato", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Nunito", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Source Sans 3", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Noto Sans", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "PT Sans", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Work Sans", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Mulish", grupo: "Básicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Poppins", grupo: "Modernas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Montserrat", grupo: "Modernas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Raleway", grupo: "Modernas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "DM Sans", grupo: "Modernas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Manrope", grupo: "Modernas", estilos: "wght@400;700", reserva: "sans-serif" },
  { nome: "Outfit", grupo: "Modernas", estilos: "wght@400;700", reserva: "sans-serif" },
  { nome: "Sora", grupo: "Modernas", estilos: "wght@400;700", reserva: "sans-serif" },
  { nome: "Plus Jakarta Sans", grupo: "Modernas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Urbanist", grupo: "Modernas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "sans-serif" },
  { nome: "Space Grotesk", grupo: "Modernas", estilos: "wght@400;700", reserva: "sans-serif" },
  { nome: "Lexend", grupo: "Modernas", estilos: "wght@400;700", reserva: "sans-serif" },
  { nome: "Playfair Display", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "Merriweather", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "Lora", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "Libre Baskerville", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "Cormorant Garamond", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "EB Garamond", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "Crimson Text", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "PT Serif", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "Cinzel", grupo: "Clássicas", estilos: "wght@400;700", reserva: "serif" },
  { nome: "DM Serif Display", grupo: "Clássicas", estilos: "ital@0;1", reserva: "serif" },
  { nome: "Bodoni Moda", grupo: "Clássicas", estilos: "ital,wght@0,400;0,700;1,400;1,700", reserva: "serif" },
  { nome: "Bebas Neue", grupo: "Destaque e manuscritas", estilos: "", reserva: "sans-serif" },
  { nome: "Oswald", grupo: "Destaque e manuscritas", estilos: "wght@400;700", reserva: "sans-serif" },
  { nome: "Anton", grupo: "Destaque e manuscritas", estilos: "", reserva: "sans-serif" },
  { nome: "Abril Fatface", grupo: "Destaque e manuscritas", estilos: "", reserva: "sans-serif" },
  { nome: "Righteous", grupo: "Destaque e manuscritas", estilos: "", reserva: "sans-serif" },
  { nome: "Dancing Script", grupo: "Destaque e manuscritas", estilos: "wght@400;700", reserva: "cursive" },
  { nome: "Great Vibes", grupo: "Destaque e manuscritas", estilos: "", reserva: "cursive" },
  { nome: "Pacifico", grupo: "Destaque e manuscritas", estilos: "", reserva: "cursive" },
  { nome: "Caveat", grupo: "Destaque e manuscritas", estilos: "wght@400;700", reserva: "cursive" },
  { nome: "Satisfy", grupo: "Destaque e manuscritas", estilos: "", reserva: "cursive" },
];

export const GRUPOS_DE_FONTE = [...new Set(FONTES_DO_TEXTO.map((f) => f.grupo))];

const POR_NOME = new Map(FONTES_DO_TEXTO.map((f) => [f.nome, f]));

/** A fonte da lista, ou null (fonte fora da lista não entra: o nome vai para a URL e o CSS). */
export const fonteDoTexto = (nome: string | null | undefined) => (nome ? POR_NOME.get(nome) ?? null : null);

export function urlDaFonteDoTexto(fonte: FonteDoTexto) {
  const familia = fonte.nome.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${familia}${fonte.estilos ? `:${fonte.estilos}` : ""}&display=swap`;
}

/** Como vai no font-family: a fonte e a família genérica de reserva. */
export const pilhaDaFonte = (fonte: FonteDoTexto) => `"${fonte.nome}", ${fonte.reserva}`;

/** Negrito, itálico, sublinhado e riscado. No banco, as marcadas separadas por espaço. */
export const FORMATOS = [
  { valor: "negrito", rotulo: "Negrito", letra: "N" },
  { valor: "italico", rotulo: "Itálico", letra: "I" },
  { valor: "sublinhado", rotulo: "Sublinhado", letra: "S" },
  { valor: "riscado", rotulo: "Riscado", letra: "R" },
] as const;

export type Formato = (typeof FORMATOS)[number]["valor"];

/** Sem nada gravado, cada bloco tem o seu: o título já é negrito, o texto não. */
export const FORMATO_PADRAO: Record<string, Formato[]> = { titulo: ["negrito"], texto: [] };

/**
 * As marcas do bloco. Vazio no banco (null) é o padrão do bloco; texto vazio ("") é
 * "nenhuma", para dar para tirar o negrito do título.
 */
export function lerFormato(gravado: string | null | undefined, tipo: string): Formato[] {
  if (gravado === null || gravado === undefined) return FORMATO_PADRAO[tipo] ?? [];
  return FORMATOS.map((f) => f.valor).filter((v) => gravado.split(/\s+/).includes(v));
}

/** O que vai para o banco: vazio quando é o padrão do bloco, senão as marcas (ou "" para nenhuma). */
export function formatoParaGravar(valor: string, tipo: string) {
  const marcas = lerFormato(valor, tipo);
  const padrao = FORMATO_PADRAO[tipo] ?? [];
  return marcas.length === padrao.length && marcas.every((m) => padrao.includes(m)) ? null : marcas.join(" ");
}

const COR = /^#[0-9a-fA-F]{6}$/;
export const corValida = (cor: string | null | undefined) => (cor && COR.test(cor) ? cor : null);

/**
 * O estilo de um bloco de título ou de texto, igual na página e na prévia ao vivo do
 * painel. Com cor própria, a opacidade volta a 1: o título e o texto da página são
 * levemente apagados (opacity), e a cor escolhida tem que aparecer como foi escolhida.
 */
export function estiloDoTexto(fonteNome: string | null | undefined, cor: string | null | undefined, formato: Formato[]) {
  const fonte = fonteDoTexto(fonteNome);
  const corPropria = corValida(cor);
  const linhas = [formato.includes("sublinhado") && "underline", formato.includes("riscado") && "line-through"].filter(Boolean).join(" ");
  return {
    fontFamily: fonte ? pilhaDaFonte(fonte) : undefined,
    color: corPropria ?? undefined,
    opacity: corPropria ? 1 : undefined,
    fontWeight: formato.includes("negrito") ? 700 : 400,
    fontStyle: formato.includes("italico") ? "italic" : undefined,
    textDecorationLine: linhas || undefined,
  } satisfies React.CSSProperties;
}
