/**
 * Bloco carrossel: várias imagens que vão passando sozinhas, cada uma com link opcional.
 * As regras que o painel e a página enxergam iguais. Sem import de servidor: o editor,
 * que roda no navegador, também usa.
 */

/** Largura de cada imagem, em % da coluna. Abaixo de 100, as vizinhas aparecem nas pontas. */
export const LARGURA_DO_SLIDE = { min: 40, max: 100, passo: 5, padrao: 80, unidade: "%" } as const;

/** Velocidade da esteira: segundos para cada imagem passar. */
export const TEMPOS = [2, 3, 4, 5, 6, 8, 10] as const;
export const TEMPO_PADRAO = 4;

/** Teto de imagens por carrossel: mais que isso ninguém vê passar, e a página pesa. */
export const MAXIMO_DE_IMAGENS = 20;
