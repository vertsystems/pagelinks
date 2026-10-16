import { notFound, redirect } from "next/navigation";
import { usuarioLogado } from "@/lib/acesso";
import { destinoDoRedirecionamento } from "@/lib/redirecionamentos";

type Props = {
  params: Promise<{ slug: string; resto: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Endereço de mais de um trecho (dnms.fun/fulano/links): página nenhuma mora aqui, só
 * redirecionamento criado no painel (lib/redirecionamentos.ts). Sem ele, "não encontrada",
 * como antes.
 */
export default async function EnderecoAntigo({ params, searchParams }: Props) {
  const [{ slug, resto }, busca, usuario] = await Promise.all([params, searchParams, usuarioLogado()]);
  const destino = await destinoDoRedirecionamento([slug, ...resto], busca, !usuario);
  if (destino) redirect(destino);
  notFound();
}

export const dynamic = "force-dynamic";
