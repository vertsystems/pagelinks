"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { exigirAdmin } from "@/lib/acesso";
import { SLUGS_RESERVADOS, gerarSlug } from "@/lib/slug";
import { REDE_POR_ID, corDosIconesValida } from "@/lib/redes";
import { AJUSTES, TELAS, lerJson, normalizarAjuste, type ChaveAjuste, type Tela, type ValorAjuste } from "@/lib/ajustes";
import { apagarImagensOrfas, guardarImagem, otimizarImagem } from "@/lib/imagens";
import { FORMATOS_ACEITOS, LIMITE_ENVIO, USO_DO_CAMPO, type CampoImagemPagina, type UsoImagem } from "@/lib/imagens-limites";
import { MAXIMO_DE_IMAGENS, TEMPOS, TEMPO_PADRAO } from "@/lib/carrossel";

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
          cards: { select: { imagemUrl: true, imagens: { select: { imagemUrl: true } } } },
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
      ...p.cards.flatMap((card) => [card.imagemUrl, ...card.imagens.map((i) => i.imagemUrl)]),
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
    carrossel: "Carrossel",
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
  if (dados.has("icones")) await salvarIcones(cardId, dados);

  const c = await prisma.card.findUnique({
    where: { id: cardId },
    select: { pagina: { select: { cliente: { select: { slug: true } } } } },
  });
  revalidar(c?.pagina.cliente.slug);
}

/**
 * Ícones do bloco de redes, na ordem da tela. O formulário manda as linhas em
 * campos repetidos (iconeId, iconeRede, iconeUrl). Ícone que já existia é
 * atualizado e guarda o histórico de cliques; o que sumiu da lista é apagado.
 * Só vale id que já é deste bloco: o resto do navegador vira ícone novo.
 */
async function salvarIcones(cardId: string, dados: FormData) {
  const ids = dados.getAll("iconeId").map(String);
  const urls = dados.getAll("iconeUrl").map((v) => String(v).trim());
  const linhas = dados
    .getAll("iconeRede")
    .map((rede, i) => ({ id: ids[i] ?? "", rede: String(rede), url: urls[i] ?? "", ordem: i }))
    .filter((l) => l.url && REDE_POR_ID[l.rede])
    .slice(0, 30);

  const existentes = new Set(
    (await prisma.icone.findMany({ where: { cardId }, select: { id: true } })).map((i) => i.id),
  );
  const manter = linhas.filter((l) => existentes.has(l.id)).map((l) => l.id);

  await prisma.$transaction([
    prisma.icone.deleteMany({ where: { cardId, id: { notIn: manter } } }),
    ...linhas.map(({ id, rede, url, ordem }) =>
      existentes.has(id)
        ? prisma.icone.update({ where: { id }, data: { rede, url, ordem } })
        : prisma.icone.create({ data: { cardId, rede, url, ordem } }),
    ),
  ]);
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
    select: {
      imagemUrl: true,
      imagens: { select: { imagemUrl: true } },
      paginaId: true,
      pagina: { select: { cliente: { select: { slug: true } } } },
    },
  });
  await prisma.card.delete({ where: { id: cardId } });
  // o bloco sumiu e não tem mais data para contar: a página guarda a mudança (a lista
  // de clientes ordena pela última mudança da página e dos blocos)
  if (c) await prisma.pagina.update({ where: { id: c.paginaId }, data: { atualizadoEm: new Date() } });
  await apagarImagensOrfas([c?.imagemUrl, ...(c?.imagens.map((i) => i.imagemUrl) ?? [])]);
  revalidar(c?.pagina.cliente.slug);
}

/**
 * Grava a ordem dos blocos como ficou depois de arrastar: a lista inteira, de uma vez.
 * Só aceita a lista exata dos blocos da página (nenhum a mais, a menos ou repetido);
 * se ela mudou no meio do caminho, recusa em vez de gravar meia ordem. Só os blocos
 * que trocaram de posição são regravados.
 */
export async function reordenarCards(paginaId: string, ids: string[]): Promise<EstadoImagem> {
  await exigirAdmin();
  const pagina = await prisma.pagina.findUnique({
    where: { id: String(paginaId) },
    select: { cliente: { select: { slug: true } }, cards: { select: { id: true, ordem: true } } },
  });
  if (!pagina) return { erro: "Página não encontrada." };

  const lista = Array.isArray(ids) ? ids.map(String) : [];
  const atual = new Map(pagina.cards.map((c) => [c.id, c.ordem]));
  if (lista.length !== atual.size || new Set(lista).size !== lista.length || lista.some((id) => !atual.has(id))) {
    return { erro: "Os blocos mudaram enquanto você arrastava. Recarregue a página e tente de novo." };
  }

  const mudaram = lista.map((id, i) => ({ id, ordem: i + 1 })).filter((c) => atual.get(c.id) !== c.ordem);
  if (mudaram.length) {
    await prisma.$transaction(mudaram.map((c) => prisma.card.update({ where: { id: c.id }, data: { ordem: c.ordem } })));
  }
  revalidar(pagina.cliente.slug);
  return {};
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
  const copia = await prisma.card.create({ data: { ...resto, ordem: card.ordem + 1 } });
  const icones = await prisma.icone.findMany({ where: { cardId }, select: { rede: true, url: true, ordem: true } });
  if (icones.length) await prisma.icone.createMany({ data: icones.map((i) => ({ ...i, cardId: copia.id })) });
  // o carrossel copia os endereços das imagens: os arquivos ficam compartilhados (apagarImagensOrfas confere)
  const imagens = await prisma.imagemCarrossel.findMany({ where: { cardId }, select: { imagemUrl: true, url: true, ordem: true } });
  if (imagens.length) await prisma.imagemCarrossel.createMany({ data: imagens.map((i) => ({ ...i, cardId: copia.id })) });

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
/** O JSON de ajustes de uma tela sem uma chave (null se ficar vazio). */
function semAjuste(texto: string | null, chave: ChaveAjuste) {
  const ajustes = lerJson(texto);
  delete ajustes[chave];
  return Object.keys(ajustes).length ? JSON.stringify(ajustes) : null;
}

async function localizarAlvo(alvo: AlvoImagem) {
  if (alvo?.tipo === "card") {
    const id = String(alvo.id);
    const card = await prisma.card.findUnique({
      where: { id },
      select: {
        imagemUrl: true,
        ajustesTablet: true,
        ajustesComputador: true,
        pagina: { select: { clienteId: true, cliente: { select: { slug: true } } } },
      },
    });
    if (!card) return null;
    return {
      uso: "card" as UsoImagem,
      atual: card.imagemUrl,
      clienteId: card.pagina.clienteId,
      slug: card.pagina.cliente.slug,
      // sem imagem, o tamanho volta ao padrão nas três telas: a próxima imagem não herda o ajuste
      gravar: (url: string | null) =>
        prisma.card.update({
          where: { id },
          data: url
            ? { imagemUrl: url }
            : {
                imagemUrl: null,
                imagemTamanho: null,
                ajustesTablet: semAjuste(card.ajustesTablet, "imagem"),
                ajustesComputador: semAjuste(card.ajustesComputador, "imagem"),
              },
        }),
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
        ajustesTablet: true,
        ajustesComputador: true,
        clienteId: true,
        cliente: { select: { slug: true } },
      },
    });
    if (!pagina) return null;
    const chaveDoTamanho: ChaveAjuste | null = campo === "avatarUrl" ? "avatar" : campo === "cabecalhoImagemUrl" ? "cabecalho" : null;
    return {
      uso: USO_DO_CAMPO[campo],
      atual: pagina[campo],
      clienteId: pagina.clienteId,
      slug: pagina.cliente.slug,
      gravar: (url: string | null) => {
        const data: Prisma.PaginaUpdateInput = {};
        data[campo] = url;
        if (!url && chaveDoTamanho) {
          if (chaveDoTamanho === "avatar") data.avatarTamanho = null;
          else data.cabecalhoTamanho = null;
          data.ajustesTablet = semAjuste(pagina.ajustesTablet, chaveDoTamanho);
          data.ajustesComputador = semAjuste(pagina.ajustesComputador, chaveDoTamanho);
        }
        return prisma.pagina.update({ where: { id }, data });
      },
    };
  }

  return null;
}

/** Confere o arquivo enviado (WebP ou PNG, até 4 MB) e devolve em WebP q90 no tamanho do uso. */
async function arquivoOtimizado(dados: FormData, uso: UsoImagem): Promise<{ otimizada: Buffer } | { erro: string }> {
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };
  if (arquivo.type && !FORMATOS_ACEITOS.includes(arquivo.type)) return { erro: "A imagem precisa estar em WebP ou PNG." };
  if (arquivo.size > LIMITE_ENVIO) return { erro: "A imagem passa de 4 MB. Exporte de novo num tamanho menor." };
  try {
    return { otimizada: await otimizarImagem(Buffer.from(await arquivo.arrayBuffer()), uso) };
  } catch {
    return { erro: "Esse arquivo não é um WebP nem um PNG válido." };
  }
}

/** Guarda no Storage; o erro volta em texto para a tela. */
async function guardarNoStorage(clienteId: string, uso: UsoImagem, otimizada: Buffer): Promise<{ url: string } | { erro: string }> {
  try {
    return { url: await guardarImagem(clienteId, uso, otimizada) };
  } catch (erro) {
    console.error(erro);
    const desligado = erro instanceof Error && erro.message.startsWith("Envio de imagem desligado");
    return { erro: desligado ? erro.message : "Não consegui guardar a imagem agora. Tente de novo em instantes." };
  }
}

/** Recebe WebP ou PNG, converte para WebP q90, guarda no Storage e já grava no banco: não depende de apertar Salvar. */
export async function enviarImagem(alvo: AlvoImagem, dados: FormData): Promise<EstadoImagem> {
  await exigirAdmin();
  const local = await localizarAlvo(alvo);
  if (!local) return { erro: "Não encontrei onde guardar essa imagem. Recarregue a página." };

  const arquivo = await arquivoOtimizado(dados, local.uso);
  if ("erro" in arquivo) return arquivo;
  const guardada = await guardarNoStorage(local.clienteId, local.uso, arquivo.otimizada);
  if ("erro" in guardada) return guardada;

  await local.gravar(guardada.url);
  await apagarImagensOrfas([local.atual]);
  revalidar(local.slug);
  return { url: guardada.url };
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

/**
 * Grava um ajuste de layout (tamanho, espaço, largura) numa tela. No celular vai para
 * a coluna de sempre, e o padrão do celular fica gravado como vazio. No tablet e no
 * computador vai para o JSON da tela, e null apaga: a tela volta a seguir a menor.
 * Valor fora do intervalo encosta no limite (lib/ajustes.ts).
 */
export async function salvarAjuste(
  alvo: { tipo: "pagina" | "card"; id: string },
  chave: ChaveAjuste,
  tela: Tela,
  valor: ValorAjuste | null,
): Promise<EstadoImagem> {
  await exigirAdmin();
  const def = Object.hasOwn(AJUSTES, chave) ? AJUSTES[chave] : null;
  if (!def || def.alvo !== alvo?.tipo || !TELAS.some((t) => t.id === tela)) return { erro: "Esse ajuste não pode ser gravado." };
  const normal = normalizarAjuste(chave, valor);
  if (!normal.ok) return { erro: "Esse valor não serve para esse ajuste." };
  // o padrão do celular vira vazio, menos em ajuste que segue outro (o "lado" segue o
  // espaço entre os blocos): ali vazio quer dizer "igual ao outro", não o número padrão
  const segueOutro = "segue" in def && def.segue;
  const gravar = tela === "celular" && !segueOutro && normal.valor === def.padrao.celular ? null : normal.valor;
  const id = String(alvo.id);

  try {
    const atual =
      alvo.tipo === "pagina"
        ? await prisma.pagina.findUnique({
            where: { id },
            select: { ajustesTablet: true, ajustesComputador: true, cliente: { select: { slug: true } } },
          })
        : await prisma.card.findUnique({
            where: { id },
            select: { ajustesTablet: true, ajustesComputador: true, pagina: { select: { cliente: { select: { slug: true } } } } },
          });
    if (!atual) return { erro: "Não encontrei o que ajustar. Recarregue a página." };

    const data: Record<string, ValorAjuste | null> = {};
    if (tela === "celular") {
      data[def.coluna] = gravar;
    } else {
      const coluna = tela === "tablet" ? "ajustesTablet" : "ajustesComputador";
      const ajustes = lerJson(atual[coluna]);
      if (gravar === null) delete ajustes[chave];
      else ajustes[chave] = gravar;
      data[coluna] = Object.keys(ajustes).length ? JSON.stringify(ajustes) : null;
    }

    if (alvo.tipo === "pagina") await prisma.pagina.update({ where: { id }, data: data as Prisma.PaginaUpdateInput });
    else await prisma.card.update({ where: { id }, data: data as Prisma.CardUpdateInput });

    revalidar("cliente" in atual ? atual.cliente.slug : atual.pagina.cliente.slug);
    return {};
  } catch {
    return { erro: "Não consegui gravar o ajuste. Recarregue a página." };
  }
}

/** Cor dos ícones de um bloco de redes: null (cor do texto), "marcas" ou "#RRGGBB". Grava na hora. */
export async function salvarCorIcones(cardId: string, cor: string | null): Promise<EstadoImagem> {
  await exigirAdmin();
  if (!corDosIconesValida(cor)) return { erro: "Essa cor não serve." };
  try {
    const card = await prisma.card.update({
      where: { id: String(cardId) },
      data: { iconeCor: cor },
      select: { pagina: { select: { cliente: { select: { slug: true } } } } },
    });
    revalidar(card.pagina.cliente.slug);
    return {};
  } catch {
    return { erro: "Não consegui gravar a cor. Recarregue a página." };
  }
}

/** Formato da foto do topo: "redonda" (padrão, fica vazio) ou "livre" (o logo inteiro, sem cortar). */
export async function salvarFormatoFoto(paginaId: string, formato: string): Promise<EstadoImagem> {
  await exigirAdmin();
  if (formato !== "redonda" && formato !== "livre") return { erro: "Esse formato não existe." };
  try {
    const pagina = await prisma.pagina.update({
      where: { id: String(paginaId) },
      data: { avatarFormato: formato === "livre" ? "livre" : null },
      select: { cliente: { select: { slug: true } } },
    });
    revalidar(pagina.cliente.slug);
    return {};
  } catch {
    return { erro: "Não consegui gravar o formato. Recarregue a página." };
  }
}

/** Marcação de revisão do cliente: conferido (verde) ou faltando algo (amarelo). Recebe o valor, não alterna: dois cliques seguidos não se atropelam. */
export async function marcarConferido(clienteId: string, conferido: boolean): Promise<EstadoImagem> {
  await exigirAdmin();
  try {
    const cliente = await prisma.cliente.update({ where: { id: String(clienteId) }, data: { conferido: conferido === true }, select: { slug: true } });
    revalidar(cliente.slug);
    return {};
  } catch {
    return { erro: "Não consegui gravar a marcação." };
  }
}

// ---------- carrossel ----------

export type ImagemDoCarrossel = { id: string; imagemUrl: string; url: string | null };

/**
 * Bloco de carrossel com o cliente dele. Toda mudança nas imagens marca o bloco
 * (atualizadoEm): é por essa data que a prévia recarrega e a lista de clientes ordena.
 */
async function carrossel(cardId: string) {
  return prisma.card.findFirst({
    where: { id: String(cardId), tipo: "carrossel" },
    select: { id: true, pagina: { select: { clienteId: true, cliente: { select: { slug: true } } } } },
  });
}
const marcarBloco = (cardId: string) => prisma.card.update({ where: { id: cardId }, data: { atualizadoEm: new Date() } });

/** Uma imagem nova no fim do carrossel. Grava na hora, como o campo de imagem. */
export async function adicionarImagemCarrossel(cardId: string, dados: FormData): Promise<{ imagem?: ImagemDoCarrossel; erro?: string }> {
  await exigirAdmin();
  const card = await carrossel(cardId);
  if (!card) return { erro: "Não encontrei esse carrossel. Recarregue a página." };
  const ultima = await prisma.imagemCarrossel.findFirst({ where: { cardId: card.id }, orderBy: { ordem: "desc" }, select: { ordem: true } });
  if ((await prisma.imagemCarrossel.count({ where: { cardId: card.id } })) >= MAXIMO_DE_IMAGENS) {
    return { erro: `O carrossel já tem ${MAXIMO_DE_IMAGENS} imagens, o máximo.` };
  }

  const arquivo = await arquivoOtimizado(dados, "card");
  if ("erro" in arquivo) return arquivo;
  const guardada = await guardarNoStorage(card.pagina.clienteId, "card", arquivo.otimizada);
  if ("erro" in guardada) return guardada;

  const imagem = await prisma.imagemCarrossel.create({
    data: { cardId: card.id, imagemUrl: guardada.url, ordem: (ultima?.ordem ?? 0) + 1 },
    select: { id: true, imagemUrl: true, url: true },
  });
  await marcarBloco(card.id);
  revalidar(card.pagina.cliente.slug);
  return { imagem };
}

/** Tira uma imagem do carrossel (e o arquivo, se nada mais usa). */
export async function removerImagemCarrossel(imagemId: string): Promise<EstadoImagem> {
  await exigirAdmin();
  const imagem = await prisma.imagemCarrossel.findUnique({
    where: { id: String(imagemId) },
    select: { imagemUrl: true, cardId: true, card: { select: { pagina: { select: { cliente: { select: { slug: true } } } } } } },
  });
  if (!imagem) return { erro: "Essa imagem já não está no carrossel. Recarregue a página." };
  await prisma.imagemCarrossel.delete({ where: { id: String(imagemId) } });
  await marcarBloco(imagem.cardId);
  await apagarImagensOrfas([imagem.imagemUrl]);
  revalidar(imagem.card.pagina.cliente.slug);
  return {};
}

/** Para onde a imagem leva. Vazio = a imagem só aparece, sem link. */
export async function salvarLinkCarrossel(imagemId: string, link: string): Promise<EstadoImagem> {
  await exigirAdmin();
  const url = String(link ?? "").trim().slice(0, 2000) || null;
  try {
    const imagem = await prisma.imagemCarrossel.update({
      where: { id: String(imagemId) },
      data: { url },
      select: { cardId: true, card: { select: { pagina: { select: { cliente: { select: { slug: true } } } } } } },
    });
    await marcarBloco(imagem.cardId);
    revalidar(imagem.card.pagina.cliente.slug);
    return {};
  } catch {
    return { erro: "Não consegui gravar o link. Recarregue a página." };
  }
}

/** A ordem das imagens como ficou no painel: a lista inteira, como a dos blocos (reordenarCards). */
export async function ordenarImagensCarrossel(cardId: string, ids: string[]): Promise<EstadoImagem> {
  await exigirAdmin();
  const card = await carrossel(cardId);
  if (!card) return { erro: "Não encontrei esse carrossel. Recarregue a página." };
  const atuais = new Map((await prisma.imagemCarrossel.findMany({ where: { cardId: card.id }, select: { id: true, ordem: true } })).map((i) => [i.id, i.ordem]));
  const lista = Array.isArray(ids) ? ids.map(String) : [];
  if (lista.length !== atuais.size || new Set(lista).size !== lista.length || lista.some((id) => !atuais.has(id))) {
    return { erro: "As imagens mudaram enquanto você mexia. Recarregue a página e tente de novo." };
  }
  const mudaram = lista.map((id, i) => ({ id, ordem: i + 1 })).filter((i) => atuais.get(i.id) !== i.ordem);
  if (mudaram.length) {
    await prisma.$transaction(mudaram.map((i) => prisma.imagemCarrossel.update({ where: { id: i.id }, data: { ordem: i.ordem } })));
    await marcarBloco(card.id);
  }
  revalidar(card.pagina.cliente.slug);
  return {};
}

/** Segundos em cada imagem. O padrão (4) fica gravado como vazio. */
export async function salvarTempoCarrossel(cardId: string, segundos: number): Promise<EstadoImagem> {
  await exigirAdmin();
  if (!TEMPOS.includes(segundos as (typeof TEMPOS)[number])) return { erro: "Esse tempo não está na lista." };
  const card = await carrossel(cardId);
  if (!card) return { erro: "Não encontrei esse carrossel. Recarregue a página." };
  await prisma.card.update({ where: { id: card.id }, data: { carrosselTempo: segundos === TEMPO_PADRAO ? null : segundos } });
  revalidar(card.pagina.cliente.slug);
  return {};
}
