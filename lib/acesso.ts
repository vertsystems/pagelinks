import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COOKIE_SESSAO, DURACAO_SESSAO, criarToken, lerToken } from "@/lib/sessao";

/**
 * Quem está logado agora. Além do cookie, confere no banco se a conta segue
 * ativa — desativar o usuário corta o acesso na hora, sem esperar a sessão vencer.
 */
export const usuarioLogado = cache(async () => {
  const sessao = lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return null;

  return prisma.usuario.findFirst({
    where: { id: sessao.uid, ativo: true },
    select: { id: true, email: true, nome: true, papel: true, clienteId: true },
  });
});

/**
 * A porta do painel. Chamar no começo de toda página e toda ação de /gestao:
 * o proxy só cobre a navegação, e uma ação de servidor pode ser disparada de
 * qualquer rota.
 */
export async function exigirAdmin() {
  const usuario = await usuarioLogado();
  if (!usuario || usuario.papel !== "admin") redirect("/entrar");
  return usuario;
}

export async function abrirSessao(uid: string) {
  (await cookies()).set(COOKIE_SESSAO, criarToken(uid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SESSAO / 1000,
  });
}

export async function fecharSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}
