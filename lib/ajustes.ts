import { LARGURA_DO_SLIDE } from "@/lib/carrossel";
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
  /** sem valor gravado, segue outro ajuste (e não um número fixo) */
  segue?: string;
};
type Largura = { alvo: "card"; coluna: "largura"; variavel: "largura"; tipo: "largura"; padrao: Record<Tela, string> };

const igual = (n: number) => ({ celular: n, tablet: n, computador: n });

export const AJUSTES = {
  // página
  avatar: { alvo: "pagina", coluna: "avatarTamanho", variavel: "avatar", tipo: "numero", faixa: TAMANHO_NA_PAGINA.avatar, padrao: igual(104) },
  cabecalho: { alvo: "pagina", coluna: "cabecalhoTamanho", variavel: "cabecalho", tipo: "numero", faixa: TAMANHO_NA_PAGINA.cabecalho, padrao: igual(100) },
  topo: { alvo: "pagina", coluna: "espacoTopo", variavel: "topo", tipo: "numero", faixa: AJUSTE_PAGINA.topo, padrao: { celular: 36, tablet: 48, computador: 48 } },
  titulo: { alvo: "pagina", coluna: "tituloTamanho", variavel: "titulo", tipo: "numero", faixa: AJUSTE_PAGINA.titulo, padrao: { celular: 24, tablet: 28, computador: 28 } },
  bio: { alvo: "pagina", coluna: "bioTamanho", variavel: "bio", tipo: "numero", faixa: AJUSTE_PAGINA.bio, padrao: igual(16) },
  blocos: { alvo: "pagina", coluna: "espacoBlocos", variavel: "blocos", tipo: "numero", faixa: AJUSTE_PAGINA.blocos, padrao: igual(14) },
  // vão entre blocos lado a lado; sem valor, igual ao espaço entre os blocos daquela tela
  lado: { alvo: "pagina", coluna: "espacoLado", variavel: "lado", tipo: "numero", faixa: AJUSTE_PAGINA.lado, padrao: igual(14), segue: "blocos" },
  // bloco
  imagem: { alvo: "card", coluna: "imagemTamanho", variavel: "imagem", tipo: "numero", faixa: TAMANHO_NA_PAGINA.card, padrao: igual(100) },
  icone: { alvo: "card", coluna: "iconeTamanho", variavel: "icone", tipo: "numero", faixa: AJUSTE_ICONES.tamanho, padrao: igual(28) },
  vao: { alvo: "card", coluna: "iconeEspaco", variavel: "vao", tipo: "numero", faixa: AJUSTE_ICONES.espaco, padrao: igual(24) },
  largura: { alvo: "card", coluna: "largura", variavel: "largura", tipo: "largura", padrao: { celular: "inteira", tablet: "inteira", computador: "inteira" } },
  // carrossel: largura de cada imagem; na coluna de 620 px do tablet e do computador, 60% já mostra as vizinhas
  slide: { alvo: "card", coluna: "slideLargura", variavel: "slide", tipo: "numero", faixa: LARGURA_DO_SLIDE, padrao: { celular: 80, tablet: 60, computador: 60 } },
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
export function valorNaTela(valores: ValoresTela, chave: ChaveAjuste, tela: Tela, padrao?: ValorAjuste) {
  const ordem = TELAS.map((t) => t.id);
  const indice = ordem.indexOf(tela);
  const herdado = (ate: number) => {
    for (let i = ate; i >= 0; i--) {
      const v = valores[ordem[i]];
      if (v !== null) return { valor: v, de: ordem[i] as Tela | null };
    }
    return { valor: padrao ?? (AJUSTES[chave].padrao[tela] as ValorAjuste), de: null as Tela | null };
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

/**
 * As variáveis gravadas de um registro, para o style do elemento na página. A largura
 * fica de fora: a fração real depende dos vizinhos e vem de variaveisDeLinha.
 */
export function variaveisDeAjuste(registro: ComAjustes, alvo: "pagina" | "card"): React.CSSProperties {
  const estilo: Record<string, string> = {};
  for (const chave of Object.keys(AJUSTES) as ChaveAjuste[]) {
    if (AJUSTES[chave].alvo !== alvo || chave === "largura") continue;
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

/**
 * Fração da linha que cada bloco ocupa de verdade numa tela. Blocos seguidos que não
 * são inteiros dividem a linha enquanto couberem; se o próximo não couber e a linha só
 * tiver um, ele entra assim mesmo (pelo menos dois por linha) e a linha encolhe na mesma
 * proporção: 3/4 + 3/4 vira metade e metade, 3/4 + 1/2 vira 60% e 40%. Linha que soma
 * até 1 fica como está (1/2 + 1/2 exato; 1/2 sozinho, centralizado).
 * Recebe só os blocos que aparecem na página, na ordem.
 *
 * `encosto`: numa linha de dois, o primeiro encosta no fim da célula e o segundo no
 * começo. Imagem menor que a célula (barra de tamanho abaixo de 100%) fica junto da
 * vizinha, e a sobra vai para as bordas de fora; sem isso, as duas sobras somavam no meio.
 */
export function fracoesNaTela(blocos: (ComAjustes & { id: string })[], tela: Tela) {
  const fracoes = new Map<string, number>();
  const encostos = new Map<string, "fim" | "inicio">();
  let linha: { id: string; fracao: number }[] = [];
  const fechar = () => {
    const soma = linha.reduce((s, b) => s + b.fracao, 0);
    for (const b of linha) fracoes.set(b.id, soma > 1 ? b.fracao / soma : b.fracao);
    if (linha.length === 2) {
      encostos.set(linha[0].id, "fim");
      encostos.set(linha[1].id, "inicio");
    }
    linha = [];
  };

  for (const bloco of blocos) {
    const fracao = fracaoDaLargura(String(valorNaTela(valoresPorTela(bloco, "largura"), "largura", tela).valor));
    if (fracao >= 1) {
      fechar();
      fracoes.set(bloco.id, 1);
      continue;
    }
    const soma = linha.reduce((s, b) => s + b.fracao, 0);
    if (linha.length > 0 && soma + fracao > 1 + 1e-6) {
      if (linha.length === 1) {
        linha.push({ id: bloco.id, fracao });
        fechar();
        continue;
      }
      fechar();
    }
    linha.push({ id: bloco.id, fracao });
  }
  fechar();
  return { fracoes, encostos };
}

/** Variável de CSS da fração real de um bloco numa tela: --fr-m, --fr-t, --fr-d. */
export const variavelDaLinha = (tela: Tela) => `--fr-${TELAS.find((t) => t.id === tela)!.sufixo}`;

/**
 * As variáveis de linha de cada bloco, nas três telas: a fração real (--fr-*, só a
 * diferente de inteira) e o encosto da imagem (--enc-*, margin-inline: "auto 0" encosta
 * no fim, "0 auto" no começo).
 */
export function variaveisDeLinha(blocos: (ComAjustes & { id: string })[]) {
  const porTela = TELAS.map((t) => ({ tela: t, ...fracoesNaTela(blocos, t.id) }));
  const estilos = new Map<string, React.CSSProperties>();
  for (const { id } of blocos) {
    const estilo: Record<string, string> = {};
    for (const { tela, fracoes, encostos } of porTela) {
      const f = fracoes.get(id) ?? 1;
      if (f < 1) estilo[variavelDaLinha(tela.id)] = String(Math.round(f * 1e4) / 1e4);
      const encosto = encostos.get(id);
      if (encosto) estilo[`--enc-${tela.sufixo}`] = encosto === "fim" ? "auto 0" : "0 auto";
    }
    estilos.set(id, estilo as React.CSSProperties);
  }
  return estilos;
}
