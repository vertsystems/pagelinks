"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { exigirAdmin } from "@/lib/acesso";
import { SLUGS_RESERVADOS, gerarSlug } from "@/lib/slug";
import { apagarImagensOrfas, guardarImagem, otimizarImagem } from "@/lib/imagens";
import { FORMATOS_ACEITOS, LIMITE_ENVIO, USO_DO_CAMPO, type CampoImagemPagina, type UsoImagem } from "@/lib/imagens-limites";

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
  const c = await prisma.cliente.findUnique({
    where: { id },
    select: {
      slug: true,
      paginas: {
        select: {
          avatarUrl: true,
          cabecalhoImagemUrl: true,
          fundoImagemUrl: true,
          seoImagemUrl: true,
          faviconUrl: true,
          cards: { select: { imagemUrl: true } },
        },
      },
    },
  });
  await prisma.cliente.delete({ where: { id } });

  const { paginas = [] } = c ?? {};
  await apagarImagensOrfas(
    paginas.flatMap((p) => [
      p.avatarUrl,
      p.cabecalhoImagemUrl,
      p.fundoImagemUrl,
      p.seoImagemUrl,
      p.faviconUrl,
      ...p.cards.map((card) => card.imagemUrl),
    ]),
  );
  revalidar(c?.slug);
  redirect("/gestao");
}

// ---------- página ----------

const CAMPOS_OBRIGATORIOS = ["corFundo", "corTexto", "corDestaque", "corTextoBotao", "fonte", "estiloBotao", "fundoTipo"] as const;
const CAMPOS_OPCIONAIS = ["fundoCorFim", "seoTitulo", "seoDescricao", "seoImagemUrl", "faviconUrl"] as const;

/**
 * O editor tem três formulários para a mesma página (topo, aparência, Google).
 * Cada um manda só os campos dele, e só o que veio é gravado: antes, salvar o
 * topo zerava cores e SEO. As imagens (foto, cabeçalho, fundo) não passam por
 * aqui: têm envio próprio, em enviarImagem/removerImagem.
 */
export async function salvarPagina(paginaId: string, dados: FormData) {
  await exigirAdmin();
  const pagina = await prisma.pagina.findUnique({
    where: { id: paginaId },
    select: { cabecalhoImagemUrl: true, cliente: { select: { slug: true } } },
  });
  if (!pagina) return;

  const texto = (campo: string) => {
    const v = String(dados.get(campo) ?? "").trim();
    return v || null;
  };
  const data: Prisma.PaginaUpdateInput = {};

  // Com imagem no cabeçalho, título e frase ficam travados até a imagem sair.
  if (!pagina.cabecalhoImagemUrl) {
    if (dados.has("titulo")) data.titulo = texto("titulo") ?? "Sem título";
    if (dados.has("bio")) data.bio = texto("bio");
  }
  // O formulário que tem a chave manda também um "publicada" vazio: checkbox
  // desmarcado não vai no envio, e sem isso não daria para distinguir de "não é deste formulário".
  if (dados.has("publicada")) data.publicada = dados.getAll("publicada").includes("on");
  for (const campo of CAMPOS_OBRIGATORIOS) {
    const valor = texto(campo);
    if (valor) data[campo] = valor;
  }
  for (const campo of CAMPOS_OPCIONAIS) if (dados.has(campo)) data[campo] = texto(campo);

  await prisma.pagina.update({ where: { id: paginaId }, data });
  revalidar(pagina.cliente.slug);
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
    select: { imagemUrl: true, pagina: { select: { cliente: { select: { slug: true } } } } },
  });
  await prisma.card.delete({ where: { id: cardId } });
  await apagarImagensOrfas([c?.imagemUrl]);
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

// ---------- imagens ----------

export type AlvoImagem = { tipo: "pagina"; id: string; campo: CampoImagemPagina } | { tipo: "card"; id: string };
export type EstadoImagem = { url?: string | null; erro?: string };

/**
 * Onde a imagem mora, de qual cliente é e qual endereço tem agora. O alvo vem
 * do navegador, então só passa campo que está na lista acima.
 */
async function localizarAlvo(alvo: AlvoImagem) {
  if (alvo?.tipo === "card") {
    const id = String(alvo.id);
    const card = await prisma.card.findUnique({
      where: { id },
      select: { imagemUrl: true, pagina: { select: { clienteId: true, cliente: { select: { slug: true } } } } },
    });
    if (!card) return null;
    return {
      uso: "card" as UsoImagem,
      atual: card.imagemUrl,
      clienteId: card.pagina.clienteId,
      slug: card.pagina.cliente.slug,
      gravar: (url: string | null) => prisma.card.update({ where: { id }, data: { imagemUrl: url } }),
    };
  }

  if (alvo?.tipo === "pagina" && Object.hasOwn(USO_DO_CAMPO, alvo.campo)) {
    const id = String(alvo.id);
    const campo = alvo.campo;
    const pagina = await prisma.pagina.findUnique({
      where: { id },
      select: {
        avatarUrl: true,
        cabecalhoImagemUrl: true,
        fundoImagemUrl: true,
        clienteId: true,
        cliente: { select: { slug: true } },
      },
    });
    if (!pagina) return null;
    return {
      uso: USO_DO_CAMPO[campo],
      atual: pagina[campo],
      clienteId: pagina.clienteId,
      slug: pagina.cliente.slug,
      gravar: (url: string | null) => {
        const data: Prisma.PaginaUpdateInput = {};
        data[campo] = url;
        return prisma.pagina.update({ where: { id }, data });
      },
    };
  }

  return null;
}

/** Recebe WebP ou PNG, converte para WebP q90, guarda no Storage e já grava no banco: não depende de apertar Salvar. */
export async function enviarImagem(alvo: AlvoImagem, dados: FormData): Promise<EstadoImagem> {
  await exigirAdmin();
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };
  if (arquivo.type && !FORMATOS_ACEITOS.includes(arquivo.type)) return { erro: "A imagem precisa estar em WebP ou PNG." };
  if (arquivo.size > LIMITE_ENVIO) return { erro: "A imagem passa de 4 MB. Exporte de novo num tamanho menor." };

  const local = await localizarAlvo(alvo);
  if (!local) return { erro: "Não encontrei onde guardar essa imagem. Recarregue a página." };

  let otimizada: Buffer;
  try {
    otimizada = await otimizarImagem(Buffer.from(await arquivo.arrayBuffer()), local.uso);
  } catch {
    return { erro: "Esse arquivo não é um WebP nem um PNG válido." };
  }

  let url: string;
  try {
    url = await guardarImagem(local.clienteId, local.uso, otimizada);
  } catch (erro) {
    console.error(erro);
    const desligado = erro instanceof Error && erro.message.startsWith("Envio de imagem desligado");
    return { erro: desligado ? erro.message : "Não consegui guardar a imagem agora. Tente de novo em instantes." };
  }

  await local.gravar(url);
  await apagarImagensOrfas([local.atual]);
  revalidar(local.slug);
  return { url };
}

export async function removerImagem(alvo: AlvoImagem): Promise<EstadoImagem> {
  await exigirAdmin();
  const local = await localizarAlvo(alvo);
  if (!local) return { erro: "Não encontrei essa imagem. Recarregue a página." };

  await local.gravar(null);
  await apagarImagensOrfas([local.atual]);
  revalidar(local.slug);
  return { url: null };
}
