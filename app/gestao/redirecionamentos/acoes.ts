"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { SLUGS_RESERVADOS } from "@/lib/slug";
import { DOMINIO, caminhoDoDestino, destinoParaGravar, lerEndereco } from "@/lib/redirecionamentos";

export type EstadoRedirecionamento = { erro?: string; ok?: string };

const TELA = "/gestao/redirecionamentos";
const endereco = (caminho: string) => `${DOMINIO}/${caminho ? `${caminho}/` : ""}`;

/**
 * Segue os redirecionamentos a partir do endereço antigo, já com o destino novo. Se passar
 * duas vezes pelo mesmo endereço, é laço: quem chegasse ficaria rodando sem parar em página
 * nenhuma. Devolve o caminho do laço, para a mensagem, ou null.
 */
async function laco(de: string, destino: string, editando: string | null) {
  const todos = await prisma.redirecionamento.findMany({ select: { id: true, de: true, para: true } });
  const proximo = new Map(todos.filter((r) => r.id !== editando).map((r) => [r.de, caminhoDoDestino(r.para)]));
  proximo.set(de, destino);

  const caminho: string[] = [];
  let atual: string | undefined = de;
  while (atual !== undefined) {
    caminho.push(atual);
    if (caminho.indexOf(atual) !== caminho.length - 1) return caminho;
    atual = proximo.get(atual);
  }
  return null;
}

export async function salvarRedirecionamento(_anterior: EstadoRedirecionamento, dados: FormData): Promise<EstadoRedirecionamento> {
  await exigirAdmin();
  const id = String(dados.get("id") ?? "") || null;

  const origem = lerEndereco(String(dados.get("de") ?? ""));
  if ("erro" in origem) return { erro: `Endereço antigo: ${origem.erro}` };
  const de = origem.caminho;
  if (!de) return { erro: `O endereço antigo não pode ser a página inicial do ${DOMINIO}.` };
  if (SLUGS_RESERVADOS.includes(de.split("/")[0])) return { erro: `${endereco(de)} é do próprio sistema e não pode ser redirecionado.` };

  const destino = lerEndereco(String(dados.get("para") ?? ""));
  if ("erro" in destino) return { erro: `Destino: ${destino.erro}` };
  if (destino.caminho === de) return { erro: "O destino é o próprio endereço antigo." };

  const existente = await prisma.redirecionamento.findUnique({ where: { de }, select: { id: true, para: true } });
  if (existente && existente.id !== id) {
    return { erro: `${endereco(de)} já leva para ${DOMINIO}${existente.para}. Para mudar o destino, use Editar na lista.` };
  }

  const ciclo = await laco(de, destino.caminho, id);
  if (ciclo) return { erro: `Isso faria um laço (${ciclo.map(endereco).join(" → ")}): quem chegasse não pararia em página nenhuma.` };

  const para = destinoParaGravar(destino);
  if (id) {
    const antes = await prisma.redirecionamento.findUnique({ where: { id }, select: { de: true } });
    if (!antes) return { erro: "Esse redirecionamento não existe mais. Recarregue a página." };
    await prisma.redirecionamento.update({
      where: { id },
      // endereço antigo trocado é outro link: a contagem recomeça
      data: antes.de === de ? { para } : { de, para, acessos: 0, ultimoAcessoEm: null },
    });
  } else {
    await prisma.redirecionamento.create({ data: { de, para } });
  }

  revalidatePath(TELA);
  return { ok: `Pronto: ${endereco(de)} agora leva para ${DOMINIO}${para}.` };
}

export async function excluirRedirecionamento(id: string) {
  await exigirAdmin();
  await prisma.redirecionamento.deleteMany({ where: { id } });
  revalidatePath(TELA);
}
