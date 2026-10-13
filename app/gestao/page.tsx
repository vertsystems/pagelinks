import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { COOKIE_VISTA, lerVista } from "@/lib/vista-painel";
import ListaClientes, { type ItemCliente } from "./ListaClientes";
import { quandoMudou } from "./quando";
import estilos from "./gestao.module.css";

export const dynamic = "force-dynamic";

/** Fundo da miniatura: o mesmo da página (lib/tema.ts), sem o "fixed" da imagem. */
function fundoDaCapa(p: { corFundo: string; fundoTipo: string; fundoCorFim: string | null; fundoImagemUrl: string | null }) {
  if (p.fundoTipo === "gradiente" && p.fundoCorFim) return `linear-gradient(160deg, ${p.corFundo} 0%, ${p.fundoCorFim} 100%)`;
  if (p.fundoTipo === "imagem" && p.fundoImagemUrl) return `${p.corFundo} url(${p.fundoImagemUrl}) center/cover no-repeat`;
  return p.corFundo;
}

export default async function ListaClientesPagina({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await exigirAdmin();
  const { q } = await searchParams;
  const busca = (q ?? "").trim();
  const vista = lerVista((await cookies()).get(COOKIE_VISTA)?.value);

  // No Postgres o contains diferencia maiúscula de minúscula: sem o insensitive, "ana"
  // não achava "Ana Julia" pelo nome.
  const clientes = await prisma.cliente.findMany({
    where: busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { slug: { contains: busca, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      paginas: {
        select: {
          publicada: true,
          atualizadoEm: true,
          titulo: true,
          avatarUrl: true,
          avatarFormato: true,
          cabecalhoImagemUrl: true,
          corFundo: true,
          corTexto: true,
          fundoTipo: true,
          fundoCorFim: true,
          fundoImagemUrl: true,
          cards: { select: { atualizadoEm: true, _count: { select: { cliques: true } } } },
        },
      },
    },
  });

  // Última mudança = a mais recente entre a página e os blocos dela (bloco excluído
  // também conta: excluirCard marca a página). A bolinha de conferido não entra:
  // marcar um cliente não pode jogá-lo para o topo da lista.
  const agora = new Date();
  const itens = clientes
    .map((c) => {
      const pagina = c.paginas[0];
      const ultima = Math.max(
        ...c.paginas.flatMap((p) => [p.atualizadoEm.getTime(), ...p.cards.map((card) => card.atualizadoEm.getTime())]),
        c.paginas.length ? 0 : c.criadoEm.getTime(),
      );
      const quando = quandoMudou(new Date(ultima), agora);
      const item: ItemCliente = {
        id: c.id,
        slug: c.slug,
        nome: c.nome,
        conferido: c.conferido,
        situacao: !c.ativo ? "inativo" : pagina?.publicada ? "no-ar" : "rascunho",
        blocos: pagina?.cards.length ?? 0,
        cliques: c.paginas.reduce((soma, p) => soma + p.cards.reduce((s, card) => s + card._count.cliques, 0), 0),
        quando: quando.texto,
        quandoCompleto: quando.completo,
        capa: {
          fundo: pagina ? fundoDaCapa(pagina) : "var(--g-card-2)",
          texto: pagina?.corTexto ?? "inherit",
          avatarUrl: pagina?.avatarUrl ?? null,
          avatarLivre: pagina?.avatarFormato === "livre",
          cabecalhoUrl: pagina?.cabecalhoImagemUrl ?? null,
          titulo: pagina?.titulo ?? c.nome,
        },
      };
      return { item, ultima };
    })
    .sort((a, b) => b.ultima - a.ultima || a.item.nome.localeCompare(b.item.nome, "pt-BR"))
    .map((x) => x.item);

  const publicadas = clientes.filter((c) => c.paginas.some((p) => p.publicada)).length;

  return (
    <main className={estilos.env}>
      <div className={estilos.cabecalho}>
        <div>
          <h1>Clientes</h1>
          <p>
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"} ·{" "}
            {publicadas} com página no ar · {clientes.filter((c) => c.conferido).length} conferidos · os
            atualizados por último primeiro
          </p>
        </div>
        <Link className={estilos.btn} href="/gestao/novo">
          Novo cliente
        </Link>
      </div>

      <ListaClientes itens={itens} busca={busca} vistaInicial={vista} />
    </main>
  );
}
