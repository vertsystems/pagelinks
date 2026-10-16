/** Traduz o tema salvo no banco em variáveis CSS e estilos prontos. */

type TemaPagina = {
  corFundo: string;
  corTexto: string;
  corDestaque: string;
  corTextoBotao: string;
  fonte: string;
  estiloBotao: string;
  fundoTipo: string;
  fundoCorFim: string | null;
  fundoImagemUrl: string | null;
};

/**
 * Barras de espaço da página, em px: acima do primeiro elemento (empurra tudo
 * para baixo) e entre um bloco e outro. O padrão do topo muda com a tela (36 no
 * celular, 48 no tablet e no computador): ver AJUSTES em lib/ajustes.ts.
 */
export const AJUSTE_PAGINA = {
  topo: { min: 0, max: 320, passo: 4, padrao: 36, unidade: "px" },
  blocos: { min: 0, max: 48, passo: 2, padrao: 14, unidade: "px" },
  // entre blocos lado a lado; sem valor, segue o espaço entre os blocos (ver AJUSTES.lado)
  lado: { min: 0, max: 48, passo: 2, padrao: 14, unidade: "px" },
  // tamanho da letra do título e da frase de apresentação
  titulo: { min: 16, max: 56, passo: 1, padrao: 24, unidade: "px" },
  bio: { min: 12, max: 28, passo: 1, padrao: 16, unidade: "px" },
} as const;

/** Tamanho da letra dos blocos de título e de texto. O padrão depende do bloco (PADRAO_DA_LETRA). */
export const TAMANHO_DA_LETRA = { min: 10, max: 48, passo: 1, padrao: 15, unidade: "px" } as const;
export const PADRAO_DA_LETRA: Record<string, number> = { titulo: 13, texto: 15, unidades: 14 };

export type AjustePagina = keyof typeof AJUSTE_PAGINA;

const RAIO: Record<string, string> = {
  arredondado: "12px",
  reto: "0px",
  pilula: "999px",
  contorno: "12px",
};

export function variaveisDoTema(p: TemaPagina): React.CSSProperties {
  const fundo =
    p.fundoTipo === "gradiente" && p.fundoCorFim
      ? `linear-gradient(160deg, ${p.corFundo} 0%, ${p.fundoCorFim} 100%)`
      : p.fundoTipo === "imagem" && p.fundoImagemUrl
        ? `url(${p.fundoImagemUrl}) center/cover no-repeat fixed`
        : p.corFundo;

  return {
    "--fundo": p.corFundo,
    "--fundo-camada": fundo,
    "--texto": p.corTexto,
    "--destaque": p.corDestaque,
    "--texto-botao": p.corTextoBotao,
    "--raio": RAIO[p.estiloBotao] ?? RAIO.arredondado,
    "--borda": p.estiloBotao === "contorno" ? `2px solid ${p.corDestaque}` : "none",
    "--preenchimento": p.estiloBotao === "contorno" ? "transparent" : p.corDestaque,
    "--cor-do-texto-do-botao": p.estiloBotao === "contorno" ? p.corDestaque : p.corTextoBotao,
    fontFamily: `"${p.fonte}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  } as React.CSSProperties;
}

/** Só as fontes que o painel oferece. A página as serve do próprio domínio (app/[slug]/fontes.ts). */
const FONTES_PERMITIDAS = new Set([
  "Inter", "Poppins", "Montserrat", "Roboto", "Open Sans", "Lato", "Playfair Display",
  "Source Serif 4", "Oswald", "Raleway", "Nunito", "Work Sans", "DM Sans", "Manrope",
]);

export const FONTES = [...FONTES_PERMITIDAS];

/**
 * Largura de um bloco na linha. Blocos lado a lado se encaixam, e frações que
 * somam 1 fecham a linha sem sobra (1/2 + 1/2, 1/3 + 2/3, 1/4 + 3/4…). Por isso é
 * fração e não barra livre: com 48% + 50%, sobraria um buraco no fim da linha.
 */
export const LARGURAS = [
  { valor: "inteira", rotulo: "Inteira", fracao: 1 },
  { valor: "3/4", rotulo: "3/4", fracao: 3 / 4 },
  { valor: "2/3", rotulo: "2/3", fracao: 2 / 3 },
  { valor: "1/2", rotulo: "1/2", fracao: 1 / 2 },
  { valor: "1/3", rotulo: "1/3", fracao: 1 / 3 },
  { valor: "1/4", rotulo: "1/4", fracao: 1 / 4 },
] as const;

export function fracaoDaLargura(largura: string | null | undefined) {
  return LARGURAS.find((l) => l.valor === largura)?.fracao ?? 1;
}
