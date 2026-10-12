/**
 * Tema do painel (/gestao e /entrar), não das páginas dos clientes: aquelas
 * usam o tema do cadastro de cada um (lib/tema.ts).
 * Fica num cookie para o servidor já entregar a tela no tema certo, sem piscar.
 * Sem import de servidor aqui: o botão do topo, que roda no navegador, também usa.
 */

export const COOKIE_TEMA = "pl_tema";

export type TemaPainel = "claro" | "escuro";

/** O claro é o padrão; só o valor "escuro" troca. */
export function lerTema(valor: string | undefined): TemaPainel {
  return valor === "escuro" ? "escuro" : "claro";
}
