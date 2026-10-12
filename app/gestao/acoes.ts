"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { SLUGS_RESERVADOS, gerarSlug } from "@/lib/slug";

export type EstadoForm = { erro?: string; ok?: boolean };

function revalidar(slug?: string) {
  revalidatePath("/gestao");
  if (slug) {
    revalidatePath(`/gestao/${slug}`);
    revalidatePath(`/${slug}`);
  }
}

// ---------- cliente ----------

export async function criarCliente(_anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const nome = String(dados.get("nome") ?? "").trim();
  if (!nome) return { erro: "O nome é obrigatório." };

  const slug = gerarSlug(String(dados.get("slug") ?? "") || nome);
  if (SLUGS_RESERVADOS.includes(slug)) return { erro: `O endereço /${slug} é reservado pelo sistema.` };
  const existe = await prisma.cliente.findUnique({ where: { slug } });
  if (existe) return { erro: `O endereço /${slug} já está em uso por "${existe.nome}".` };

  await prisma.cliente.create({
    data: {
      nome,
      slug,
      paginas: { create: { titulo: nome, publicada: false } },
    },
  });

  revalidar(slug);
  redirect(`/gestao/${slug}`);
}

export async function salvarCliente(id: string, _anterior: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const nome = String(dados.get("nome") ?? "").trim();
  const slugNovo = gerarSlug(String(dados.get("slug") ?? ""));
  if (!nome || !slugNovo) return { erro: "Nome e endereço são obrigatórios." };
  if (SLUGS_RESERVADOS.includes(slugNovo)) return { erro: `O endereço /${slugNovo} é reservado pelo sistema.` };

  const conflito = await prisma.cliente.findFirst({
    where: { slug: slugNovo, NOT: { id } },
  });
  if (conflito) return { erro: `O endereço /${slugNovo} já está em uso por "${conflito.nome}".` };

  const antes = await prisma.cliente.findUnique({ where: { id }, select: { slug: true } });
  await prisma.cliente.update({
    where: { id },
    data: {
      nome,
      slug: slugNovo,
      ativo: dados.get("ativo") === "on",
      observacao: String(dados.get("observacao") ?? "") || null,
    },
  });

  revalidar(antes?.slug);
  revalidar(slugNovo);
  if (antes && antes.slug !== slugNovo) redirect(`/gestao/${slugNovo}`);
  return { ok: true };
}

export async function excluirCliente(id: string) {
  await exigirAdmin();
  const c = await prisma.cliente.findUnique({ where: { id }, select: { slug: true } });
  await prisma.cliente.delete({ where: { id } });
  revalidar(c?.slug);
  redirect("/gestao");
}

// ---------- página ----------

export async function salvarPagina(paginaId: string, dados: FormData) {
  await exigirAdmin();
  const pagina = await prisma.pagina.findUnique({
    where: { id: paginaId },
    select: { cliente: { select: { slug: true } } },
  });

  const texto = (campo: string) => {
    const v = String(dados.get(campo) ?? "").trim();
    return v || null;
  };

  await prisma.pagina.update({
    where: { id: paginaId },
    data: {
      titulo: String(dados.get("titulo") ?? "").trim() || "Sem título",
      bio: texto("bio"),
      avatarUrl: texto("avatarUrl"),
      publicada: dados.get("publicada") === "on",
      corFundo: String(dados.get("corFundo") ?? "#101010"),
      corTexto: String(dados.get("corTexto") ?? "#F2F2F2"),
      corDestaque: String(dados.get("corDestaque") ?? "#FF6F00"),
      corTextoBotao: String(dados.get("corTextoBotao") ?? "#101010"),
      fonte: String(dados.get("fonte") ?? "Inter"),
      estiloBotao: String(dados.get("estiloBotao") ?? "arredondado"),
      fundoTipo: String(dados.get("fundoTipo") ?? "solido"),
      fundoCorFim: texto("fundoCorFim"),
      fundoImagemUrl: texto("fundoImagemUrl"),
      seoTitulo: texto("seoTitulo"),
      seoDescricao: texto("seoDescricao"),
      seoImagemUrl: texto("seoImagemUrl"),
      faviconUrl: texto("faviconUrl"),
    },
  });

  revalidar(pagina?.cliente.slug);
}

// ---------- card ----------

export async function criarCard(paginaId: string, tipo: string) {
  await exigirAdmin();
  const ultimo = await prisma.card.findFirst({
    where: { paginaId },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  const rotuloPadrao: Record<string, string> = {
    link: "Novo link",
    destaque: "Botão em destaque",
    whatsapp: "Chamar no WhatsApp",
    titulo: "Título da seção",
    texto: "Escreva o texto aqui",
    imagem: "",
    video: "",
    redes: "Redes sociais",
    separador: "",
  };

  const card = await prisma.card.create({
    data: {
      paginaId,
      tipo,
      titulo: rotuloPadrao[tipo] ?? "Novo bloco",
      ordem: (ultimo?.ordem ?? 0) + 1,
    },
  });

  const p = await prisma.pagina.findUnique({
    where: { id: paginaId },
    select: { cliente: { select: { slug: true } } },
  });
  revalidar(p?.cliente.slug);
}

export async function salvarCard(cardId: string, dados: FormData) {
  await exigirAdmin();
  const texto = (campo: string) => {
    const v = String(dados.get(campo) ?? "").trim();
    return v || null;
  };
  const data = (campo: string) => {
    const v = String(dados.get(campo) ?? "").trim();
    return v ? new Date(v) : null;
  };

  await prisma.card.update({
    where: { id: cardId },
    data: {
      tipo: String(dados.get("tipo") ?? "link"),
      titulo: texto("titulo"),
      subtitulo: texto("subtitulo"),
      url: texto("url"),
      imagemUrl: texto("imagemUrl"),
      telefone: texto("telefone"),
      mensagem: texto("mensagem"),
      corFundo: texto("corFundo"),
      corTexto: texto("corTexto"),
      destaque: dados.get("destaque") === "on",
      ativo: dados.get("ativo") === "on",
      publicarEm: data("publicarEm"),
      despublicarEm: data("despublicarEm"),
    },
  });

  const c = await prisma.card.findUnique({
    where: { id: cardId },
    select: { pagina: { select: { cliente: { select: { slug: true } } } } },
  });
  revalidar(c?.pagina.cliente.slug);
}

export async function alternarCard(cardId: string) {
  await exigirAdmin();
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { ativo: true } });
  if (!card) return;
  await prisma.card.update({ where: { id: cardId }, data: { ativo: !card.ativo } });

  const c = await prisma.card.findUnique({
    where: { id: cardId },
    select: { pagina: { select: { cliente: { select: { slug: true } } } } },
  });
  revalidar(c?.pagina.cliente.slug);
}

export async function excluirCard(cardId: string) {
  await exigirAdmin();
  const c = await prisma.card.findUnique({
    where: { id: cardId },
    select: { pagina: { select: { cliente: { select: { slug: true } } } } },
  });
  await prisma.card.delete({ where: { id: cardId } });
  revalidar(c?.pagina.cliente.slug);
}

/** Move o card uma posição para cima ou para baixo, trocando a ordem com o vizinho. */
export async function moverCard(cardId: string, direcao: "cima" | "baixo") {
  await exigirAdmin();
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, ordem: true, paginaId: true, pagina: { select: { cliente: { select: { slug: true } } } } },
  });
  if (!card) return;

  const vizinho = await prisma.card.findFirst({
    where:
      direcao === "cima"
        ? { paginaId: card.paginaId, ordem: { lt: card.ordem } }
        : { paginaId: card.paginaId, ordem: { gt: card.ordem } },
    orderBy: { ordem: direcao === "cima" ? "desc" : "asc" },
    select: { id: true, ordem: true },
  });
  if (!vizinho) return;

  await prisma.$transaction([
    prisma.card.update({ where: { id: card.id }, data: { ordem: vizinho.ordem } }),
    prisma.card.update({ where: { id: vizinho.id }, data: { ordem: card.ordem } }),
  ]);

  revalidar(card.pagina.cliente.slug);
}

/** Duplica um card logo abaixo do original. */
export async function duplicarCard(cardId: string) {
  await exigirAdmin();
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return;

  const { id, criadoEm, atualizadoEm, ...resto } = card;
  await prisma.card.updateMany({
    where: { paginaId: card.paginaId, ordem: { gt: card.ordem } },
    data: { ordem: { increment: 1 } },
  });
  await prisma.card.create({ data: { ...resto, ordem: card.ordem + 1 } });

  const c = await prisma.pagina.findUnique({
    where: { id: card.paginaId },
    select: { cliente: { select: { slug: true } } },
  });
  revalidar(c?.cliente.slug);
}
