/**
 * Texto com formatação por trecho, nos blocos de título e de texto: cada trecho com as
 * suas marcas (negrito, itálico, sublinhado, riscado e cor). Fica no banco como JSON
 * (coluna `rico`), e não como HTML: a página monta os trechos com elementos do React, sem
 * colar HTML de ninguém, então não tem como entrar código pela formatação.
 * A quebra de linha é "\n" dentro do texto (a página usa white-space: pre-line).
 *
 * O `titulo` do bloco continua guardando o texto puro (nome do bloco no painel, e o que
 * aparece quando não há formatação nenhuma).
 * Sem import de servidor: o editor, que roda no navegador, também usa.
 */

export type Trecho = { texto: string; negrito?: true; italico?: true; sublinhado?: true; riscado?: true; cor?: string };
type Marcas = Omit<Trecho, "texto">;

const MARCAS = ["negrito", "italico", "sublinhado", "riscado"] as const;
const COR = /^#[0-9A-F]{6}$/;
const LIMITE_DE_TEXTO = 5000;
const LIMITE_DE_TRECHOS = 500;

const mesmasMarcas = (a: Marcas, b: Marcas) => MARCAS.every((m) => !!a[m] === !!b[m]) && (a.cor ?? null) === (b.cor ?? null);

/** Confere e arruma o que veio do navegador: só as marcas conhecidas, cor em hex, trechos iguais juntos. */
export function normalizarTrechos(entrada: unknown): Trecho[] {
  if (!Array.isArray(entrada)) return [];
  const saida: Trecho[] = [];
  let total = 0;
  for (const bruto of entrada.slice(0, LIMITE_DE_TRECHOS)) {
    if (!bruto || typeof bruto !== "object" || typeof bruto.texto !== "string") continue;
    const texto = bruto.texto.replace(/\r\n?/g, "\n").slice(0, LIMITE_DE_TEXTO - total);
    if (!texto) continue;
    total += texto.length;
    const trecho: Trecho = { texto };
    for (const m of MARCAS) if (bruto[m] === true) trecho[m] = true;
    const cor = typeof bruto.cor === "string" ? bruto.cor.toUpperCase() : null;
    if (cor && COR.test(cor)) trecho.cor = cor;
    const anterior = saida.at(-1);
    if (anterior && mesmasMarcas(anterior, trecho)) anterior.texto += trecho.texto;
    else saida.push(trecho);
  }
  // quebras soltas no começo e no fim não aparecem: saem
  while (saida.length && /^\s*$/.test(saida[0].texto)) saida.shift();
  while (saida.length && /^\s*$/.test(saida.at(-1)!.texto)) saida.pop();
  if (saida.length) {
    saida[0].texto = saida[0].texto.replace(/^\s+/, "");
    saida[saida.length - 1].texto = saida[saida.length - 1].texto.replace(/\s+$/, "");
  }
  return saida.filter((t) => t.texto);
}

export const textoSimples = (trechos: Trecho[]) => trechos.map((t) => t.texto).join("");
export const temFormatacao = (trechos: Trecho[]) => trechos.some((t) => MARCAS.some((m) => t[m]) || t.cor);

/** Os trechos gravados, ou null (sem formatação, vale o texto puro do bloco). */
export function lerTrechos(gravado: string | null | undefined): Trecho[] | null {
  if (!gravado) return null;
  try {
    const trechos = normalizarTrechos(JSON.parse(gravado));
    return trechos.length ? trechos : null;
  } catch {
    return null;
  }
}

/** Os trechos de um texto puro (o que já existia antes da formatação). */
export const trechosDoTexto = (texto: string | null | undefined): Trecho[] => (texto ? [{ texto }] : []);

/**
 * Monta os trechos num documento (o editor do painel e a prévia usam isto), com as mesmas
 * marcas que a página usa: strong, em, u, s e span com cor por fora, para o sublinhado e o
 * riscado saírem na cor do trecho. A quebra de linha vira <br> (no editor, que não usa
 * pre-line, é assim que ela aparece).
 */
export function montarTrechos(documento: Document, trechos: Trecho[]) {
  const fragmento = documento.createDocumentFragment();
  for (const t of trechos) {
    const linhas = t.texto.split("\n");
    let no: Node = documento.createDocumentFragment();
    linhas.forEach((linha, i) => {
      if (i > 0) no.appendChild(documento.createElement("br"));
      if (linha) no.appendChild(documento.createTextNode(linha));
    });
    for (const [marca, tag] of [["riscado", "s"], ["sublinhado", "u"], ["italico", "em"], ["negrito", "strong"]] as const) {
      if (!t[marca]) continue;
      const el = documento.createElement(tag);
      el.appendChild(no);
      no = el;
    }
    if (t.cor) {
      const el = documento.createElement("span");
      el.style.color = t.cor;
      el.appendChild(no);
      no = el;
    }
    fragmento.appendChild(no);
  }
  return fragmento;
}

/** rgb(1, 2, 3) ou #abc / #aabbcc → #AABBCC; o resto → null. */
export function corEmHex(valor: string | null | undefined) {
  if (!valor) return null;
  const rgb = valor.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return "#" + rgb.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("").toUpperCase();
  const hex = valor.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return null;
  const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
  return "#" + h.toUpperCase();
}

/**
 * Lê o que está no editor (contentEditable) de volta em trechos. As marcas vêm das tags
 * que o navegador cria ao formatar (b/strong, i/em, u, s/strike, font color, span com
 * estilo) e passam para dentro; <br> e o fim de um <div>/<p> viram quebra de linha.
 */
export function lerEditor(raiz: HTMLElement): Trecho[] {
  const trechos: Trecho[] = [];
  const empurrar = (texto: string, marcas: Marcas) => trechos.push({ texto, ...marcas });
  const terminaEmQuebra = () => trechos.length === 0 || trechos.at(-1)!.texto.endsWith("\n");

  const andar = (no: Node, marcas: Marcas) => {
    if (no.nodeType === Node.TEXT_NODE) {
      empurrar((no.textContent ?? "").replace(/ /g, " "), marcas);
      return;
    }
    if (!(no instanceof HTMLElement)) return;
    const tag = no.tagName;
    if (tag === "BR") {
      empurrar("\n", marcas);
      return;
    }
    const m: Marcas = { ...marcas };
    const estilo = no.style;
    const decoracao = `${estilo.textDecoration} ${estilo.textDecorationLine}`;
    if (tag === "B" || tag === "STRONG" || estilo.fontWeight === "bold" || Number(estilo.fontWeight) >= 600) m.negrito = true;
    if (tag === "I" || tag === "EM" || estilo.fontStyle === "italic") m.italico = true;
    if (tag === "U" || decoracao.includes("underline")) m.sublinhado = true;
    if (tag === "S" || tag === "STRIKE" || tag === "DEL" || decoracao.includes("line-through")) m.riscado = true;
    const cor = corEmHex(no.getAttribute("color") ?? estilo.color);
    if (cor) m.cor = cor;
    const bloco = tag === "DIV" || tag === "P";
    if (bloco && !terminaEmQuebra()) empurrar("\n", marcas);
    no.childNodes.forEach((filho) => andar(filho, m));
  };
  raiz.childNodes.forEach((filho) => andar(filho, {}));
  return normalizarTrechos(trechos);
}
