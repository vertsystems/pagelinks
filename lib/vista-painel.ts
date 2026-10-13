/**
 * Modo de ver a lista de clientes do painel: lista, grade ou compacto.
 * Fica num cookie, como o tema, para o servidor já entregar a lista no modo escolhido.
 * Sem import de servidor aqui: a lista, que roda no navegador, também usa.
 */

export const COOKIE_VISTA = "pl_vista";

export const VISTAS = [
  { id: "lista", nome: "Lista", dica: "Uma linha por cliente, com todos os números" },
  { id: "grade", nome: "Grade", dica: "Cartões lado a lado, com a cara de cada página" },
  { id: "compacto", nome: "Compacto", dica: "Cartões pequenos, só o essencial" },
] as const;

export type Vista = (typeof VISTAS)[number]["id"];

/** A lista é o padrão; valor desconhecido também volta para ela. */
export function lerVista(valor: string | undefined): Vista {
  return VISTAS.some((v) => v.id === valor) ? (valor as Vista) : "lista";
}
