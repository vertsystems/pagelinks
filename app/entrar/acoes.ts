"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { conferirSenha } from "@/lib/senha";
import { abrirSessao, fecharSessao } from "@/lib/acesso";

export type EstadoEntrar = { erro?: string; email?: string };

export async function entrar(_anterior: EstadoEntrar, dados: FormData): Promise<EstadoEntrar> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  const destino = String(dados.get("destino") ?? "");

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Mesma mensagem para e-mail inexistente e senha errada: o formulário não
  // confirma quem tem conta. Só admin entra enquanto o acesso do cliente não for liberado.
  if (
    !usuario ||
    !usuario.ativo ||
    usuario.papel !== "admin" ||
    !usuario.senhaHash ||
    !(await conferirSenha(senha, usuario.senhaHash))
  ) {
    return { erro: "E-mail ou senha incorretos.", email };
  }

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAcessoEm: new Date() } });
  await abrirSessao(usuario.id);
  redirect(destino.startsWith("/gestao") ? destino : "/gestao");
}

export async function sair() {
  await fecharSessao();
  redirect("/entrar");
}
