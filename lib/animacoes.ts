/**
 * Animações dos blocos com imagem, botão ou ícones (link, destaque, WhatsApp, imagem, redes).
 * Todas sutis e com pausa entre uma e outra; quem pede menos movimento no sistema vê tudo
 * parado (pagina.module.css, "Animações"). O painel e a página enxergam a mesma lista.
 */
export const ANIMACOES = [
  { valor: "reflexo", nome: "Reflexo", ajuda: "um brilho passa por cima de tempos em tempos (nos ícones, corre de um a um)" },
  { valor: "pulsar", nome: "Pulsar", ajuda: "cresce um pouquinho e volta, devagar" },
  { valor: "tremer", nome: "Tremida", ajuda: "uma tremidinha curta, de tempos em tempos" },
] as const;

export type Animacao = (typeof ANIMACOES)[number]["valor"];

/** Os tipos de bloco que têm o que animar. */
export const TIPOS_COM_ANIMACAO = ["link", "destaque", "whatsapp", "imagem", "redes"];

export const animacaoValida = (valor: unknown): Animacao | null =>
  ANIMACOES.some((a) => a.valor === valor) ? (valor as Animacao) : null;
