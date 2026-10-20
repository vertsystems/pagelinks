import { redirect } from "next/navigation";
import { usuarioLogado } from "@/lib/acesso";
import { destinoDoRedirecionamento } from "@/lib/redirecionamentos";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * A raiz do domínio (dnms.fun) não tem página: leva para onde o menu Redirecionamentos do
 * painel mandar (o endereço "/"), no dnms.fun ou em outro site. Sem redirecionamento, vai à
 * página de vendas da Página de Links, como o WordPress fazia. Sempre temporário: mudar o
 * destino no painel vale na hora, nenhum navegador fica preso ao anterior.
 */
export default async function Inicio({ searchParams }: Props) {
  const [busca, usuario] = await Promise.all([searchParams, usuarioLogado()]);
  const destino = await destinoDoRedirecionamento([], busca, !usuario);
  redirect(destino ?? "/paginadelinks/");
}

export const dynamic = "force-dynamic";
