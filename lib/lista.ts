/**
 * Bloco lista: itens um embaixo do outro (serviços, horários…), escritos um por linha.
 * As regras que o painel e a página enxergam iguais.
 */

/** O marcador de cada item. Vazio no banco = bolinha. */
export const MARCADORES = [
  { valor: "ponto", nome: "Bolinha" },
  { valor: "check", nome: "Visto ✓" },
  { valor: "numero", nome: "Número" },
] as const;

export type Marcador = (typeof MARCADORES)[number]["valor"];

export function lerMarcador(valor: string | null | undefined): Marcador {
  return MARCADORES.some((m) => m.valor === valor) ? (valor as Marcador) : "ponto";
}

/**
 * Os itens do texto: uma linha, um item; linha vazia não conta. Quem cola uma lista
 * pronta traz o marcador junto ("- ", "• ", "✓ ", "1. "): sai aqui, senão a página
 * mostraria dois marcadores.
 */
export function lerItens(texto: string | null | undefined) {
  return (texto ?? "")
    .split(/\r?\n/)
    .map((linha) => linha.trim().replace(/^(?:[-–—•·*▪►✓✔☑]|\d{1,3}[.)])\s+/, "").trim())
    .filter(Boolean);
}
