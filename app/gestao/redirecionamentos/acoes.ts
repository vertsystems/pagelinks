"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { SLUGS_RESERVADOS } from "@/lib/slug";
import { DOMINIO, caminhoDoDestino, destinoParaGravar, destinoParaMostrar, lerDestino, lerEndereco } from "@/lib/redirecionamentos";

export type EstadoRedirecionamento = { erro?: string; ok?: string };

const TELA = "/gestao/redirecionamentos";
const endereco = (caminho: string) => `${DOMINIO}/${caminho ? `${caminho}/` : ""}`;

/**
 * Segue os redirecionamentos a partir do endereço antigo, já com o destino novo. Se passar
 * duas vezes pelo mesmo endereço, é laço: quem chegasse ficaria rodando sem parar em página
 * nenhuma. Destino em outro site encerra a corrente. Devolve o caminho do laço, para a
 * mensagem, ou null.
 */
async function laco(de: string, destino: string, editando: string | null) {
  const todos = await prisma.redirecionamento.findMany({ select: { id: true, de: true, para: true } });
  const proximo = new Map(todos.filter((r) => r.id !== editando).map((r) => [r.de, caminhoDoDestino(r.para)]));
  proximo.set(de, destino);

  const caminho: string[] = [];
  let atual: string | null | undefined = de;
  while (atual !== undefined && atual !== null) {
    caminho.push(atual);
    if (caminho.indexOf(atual) !== caminho.length - 1) return caminho;
    atual = proximo.get(atual);
  }
  return null;
}

export async function salvarRedirecionamento(_anterior: EstadoRedirecionamento, dados: FormData): Promise<EstadoRedirecionamento> {
  await exigirAdmin();
  const id = String(dados.get("id") ?? "") || null;

  // vazio é esquecimento; a página inicial se pede com "/" (ou "dnms.fun")
  const digitado = String(dados.get("de") ?? "").trim();
  if (!digitado) return { erro: `Digite o endereço antigo. Para a página inicial do ${DOMINIO}, digite só /.` };
  const origem = lerEndereco(digitado);
  if ("erro" in origem) return { erro: `Endereço antigo: ${origem.erro}` };
  const de = origem.caminho;
  if (de && SLUGS_RESERVADOS.includes(de.split("/")[0])) return { erro: `${endereco(de)} é do próprio sistema e não pode ser redirecionado.` };

  const destino = lerDestino(String(dados.get("para") ?? ""));
  if ("erro" in destino) return { erro: `Destino: ${destino.erro}` };
  if (destino.tipo === "interno" && destino.caminho === de) return { erro: "O destino é o próprio endereço antigo." };

  const existente = await prisma.redirecionamento.findUnique({ where: { de }, select: { id: true, para: true } });
  if (existente && existente.id !== id) {
    return { erro: `${endereco(de)} já leva para ${destinoParaMostrar(existente.para)}. Para mudar o destino, use Editar na lista.` };
  }

  if (destino.tipo === "interno") {
    const ciclo = await laco(de, destino.caminho, id);
    if (ciclo) return { erro: `Isso faria um laço (${ciclo.map(endereco).join(" → ")}): quem chegasse não pararia em página nenhuma.` };
  }

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
  return { ok: `Pronto: ${endereco(de)} agora leva para ${destinoParaMostrar(para)}.` };
}

export async function excluirRedirecionamento(id: string) {
  await exigirAdmin();
  await prisma.redirecionamento.deleteMany({ where: { id } });
  revalidatePath(TELA);
}
