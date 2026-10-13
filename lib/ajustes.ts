import { TAMANHO_NA_PAGINA } from "@/lib/imagens-limites";
import { AJUSTE_ICONES } from "@/lib/redes";
import { AJUSTE_PAGINA, LARGURAS, fracaoDaLargura } from "@/lib/tema";

/**
 * Layout por tela: celular, tablet e computador.
 *
 * Tamanhos, espaços e larguras são escolhidos por tela; conteúdo (texto, link,
 * imagem, cor, fonte) é o mesmo nas três. O celular é a base e mora nas colunas de
 * sempre (avatarTamanho, espacoTopo, largura…); tablet e computador guardam só o que
 * mudou, em JSON nas colunas ajustesTablet e ajustesComputador. O que falta numa
 * tela segue a tela menor (computador → tablet → celular); sem nada, vale o padrão
 * da tela.
 *
 * Na página, cada ajuste vira até três variáveis de CSS no elemento: --x-m, --x-t e
 * --x-d, só as gravadas. O pagina.module.css escolhe a da tela pela largura (até 767 px
 * é celular, de 768 a 1023 é tablet, de 1024 em diante é computador) e faz o "segue a
 * tela menor" com var() encadeado.
 */

export type Tela = "celular" | "tablet" | "computador";

export const TELAS: { id: Tela; nome: string; sufixo: "m" | "t" | "d" }[] = [
  { id: "celular", nome: "Celular", sufixo: "m" },
  { id: "tablet", nome: "Tablet", sufixo: "t" },
  { id: "computador", nome: "Computador", sufixo: "d" },
];

export type Faixa = { min: number; max: number; passo: number; padrao: number; unidade: "px" | "%" };

type Numerico = {
  alvo: "pagina" | "card";
  coluna: string;
  variavel: string;
  tipo: "numero";
  faixa: Faixa;
  padrao: Record<Tela, number>;
};
type Largura = { alvo: "card"; coluna: "largura"; variavel: "largura"; tipo: "largura"; padrao: Record<Tela, string> };

const igual = (n: number) => ({ celular: n, tablet: n, computador: n });

export const AJUSTES = {
  // página
  avatar: { alvo: "pagina", coluna: "avatarTamanho", variavel: "avatar", tipo: "numero", faixa: TAMANHO_NA_PAGINA.avatar, padrao: igual(104) },
  cabecalho: { alvo: "pagina", coluna: "cabecalhoTamanho", variavel: "cabecalho", tipo: "numero", faixa: TAMANHO_NA_PAGINA.cabecalho, padrao: igual(100) },
  topo: { alvo: "pagina", coluna: "espacoTopo", variavel: "topo", tipo: "numero", faixa: AJUSTE_PAGINA.topo, padrao: { celular: 36, tablet: 48, computador: 48 } },
  blocos: { alvo: "pagina", coluna: "espacoBlocos", variavel: "blocos", tipo: "numero", faixa: AJUSTE_PAGINA.blocos, padrao: igual(14) },
  // bloco
  imagem: { alvo: "card", coluna: "imagemTamanho", variavel: "imagem", tipo: "numero", faixa: TAMANHO_NA_PAGINA.card, padrao: igual(100) },
  icone: { alvo: "card", coluna: "iconeTamanho", variavel: "icone", tipo: "numero", faixa: AJUSTE_ICONES.tamanho, padrao: igual(28) },
  vao: { alvo: "card", coluna: "iconeEspaco", variavel: "vao", tipo: "numero", faixa: AJUSTE_ICONES.espaco, padrao: igual(24) },
  largura: { alvo: "card", coluna: "largura", variavel: "largura", tipo: "largura", padrao: { celular: "inteira", tablet: "inteira", computador: "inteira" } },
} satisfies Record<string, Numerico | Largura>;

export type ChaveAjuste = keyof typeof AJUSTES;
export type ValorAjuste = number | string;
export type ValoresTela = Record<Tela, ValorAjuste | null>;

/** O que um registro (Pagina ou Card) precisa ter para ler os ajustes. */
export type ComAjustes = { ajustesTablet?: string | null; ajustesComputador?: string | null } & Record<string, unknown>;

export function lerJson(texto: string | null | undefined): Record<string, ValorAjuste> {
  if (!texto) return {};
  try {
    const dados = JSON.parse(texto);
    return dados && typeof dados === "object" ? dados : {};
  } catch {
    return {};
  }
}

/** O valor gravado de um ajuste em cada tela (null = a tela não tem o seu). */
export function valoresPorTela(registro: ComAjustes, chave: ChaveAjuste): ValoresTela {
  const def = AJUSTES[chave];
  const base = registro[def.coluna];
  return {
    celular: typeof base === "number" || typeof base === "string" ? base : null,
    tablet: lerJson(registro.ajustesTablet)[chave] ?? null,
    computador: lerJson(registro.ajustesComputador)[chave] ?? null,
  };
}

/**
 * O que a tela mostra: o valor dela, ou o da tela menor mais próxima que tiver, ou o
 * padrão. `seguiria` é o que ela mostraria sem o valor próprio, para o "seguir o
 * celular" do painel.
 */
export function valorNaTela(valores: ValoresTela, chave: ChaveAjuste, tela: Tela) {
  const ordem = TELAS.map((t) => t.id);
  const indice = ordem.indexOf(tela);
  const herdado = (ate: number) => {
    for (let i = ate; i >= 0; i--) {
      const v = valores[ordem[i]];
      if (v !== null) return { valor: v, de: ordem[i] as Tela | null };
    }
    return { valor: AJUSTES[chave].padrao[tela] as ValorAjuste, de: null as Tela | null };
  };
  const proprio = valores[tela];
  const sem = herdado(indice - 1);
  return { valor: proprio ?? sem.valor, proprio: proprio !== null, seguiria: sem };
}

/** Valor do ajuste no formato do CSS: número com unidade, ou a fração da largura. */
export function valorCss(chave: ChaveAjuste, valor: ValorAjuste) {
  const def = AJUSTES[chave];
  return def.tipo === "largura" ? String(fracaoDaLargura(String(valor))) : `${valor}${def.faixa.unidade}`;
}

/** Nome da variável de CSS de um ajuste numa tela: --topo-m, --largura-d… */
export function variavelCss(chave: ChaveAjuste, tela: Tela) {
  return `--${AJUSTES[chave].variavel}-${TELAS.find((t) => t.id === tela)!.sufixo}`;
}

/** As variáveis gravadas de um registro, para o style do elemento na página. */
export function variaveisDeAjuste(registro: ComAjustes, alvo: "pagina" | "card"): React.CSSProperties {
  const estilo: Record<string, string> = {};
  for (const chave of Object.keys(AJUSTES) as ChaveAjuste[]) {
    if (AJUSTES[chave].alvo !== alvo) continue;
    const valores = valoresPorTela(registro, chave);
    for (const { id } of TELAS) {
      const v = valores[id];
      if (v !== null) estilo[variavelCss(chave, id)] = valorCss(chave, v);
    }
  }
  return estilo as React.CSSProperties;
}

/** Confere e ajusta um valor vindo do painel. null = apagar (padrão ou seguir a tela menor). */
export function normalizarAjuste(chave: ChaveAjuste, valor: unknown): { ok: true; valor: ValorAjuste | null } | { ok: false } {
  if (valor === null) return { ok: true, valor: null };
  const def = AJUSTES[chave];
  if (def.tipo === "largura") {
    return LARGURAS.some((l) => l.valor === valor) ? { ok: true, valor: String(valor) } : { ok: false };
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, valor: Math.round(Math.min(def.faixa.max, Math.max(def.faixa.min, n))) };
}
