import { redirect } from "next/navigation";

/**
 * A raiz do domínio (dnms.fun) leva à página de vendas da Página de Links, como o
 * WordPress fazia. Redirecionamento temporário: se a home ganhar conteúdo próprio
 * um dia, nenhum navegador fica preso a este destino.
 */
export default function Inicio() {
  redirect("/paginadelinks/");
}
