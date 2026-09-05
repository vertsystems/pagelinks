import Link from "next/link";
import { prisma } from "@/lib/prisma";
import estilos from "./gestao.module.css";

export const dynamic = "force-dynamic";

export default async function ListaClientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const clientes = await prisma.cliente.findMany({
    where: busca
      ? { OR: [{ nome: { contains: busca } }, { slug: { contains: busca } }] }
      : undefined,
    orderBy: { nome: "asc" },
    include: {
      paginas: {
        select: {
          id: true,
          publicada: true,
          _count: { select: { cards: true } },
          cards: { select: { _count: { select: { cliques: true } } } },
        },
      },
    },
  });

  const totalCliques = (c: (typeof clientes)[number]) =>
    c.paginas.reduce(
      (soma, p) => soma + p.cards.reduce((s, card) => s + card._count.cliques, 0),
      0,
    );

  const publicadas = clientes.filter((c) => c.paginas.some((p) => p.publicada)).length;

  return (
    <main className={estilos.env}>
      <div className={estilos.cabecalho}>
        <div>
          <h1>Clientes</h1>
          <p>
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"} ·{" "}
            {publicadas} com página no ar
          </p>
        </div>
        <Link className={estilos.btn} href="/gestao/novo">
          Novo cliente
        </Link>
      </div>

      <form>
        <input
          className={estilos.busca}
          type="text"
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome ou endereço…"
          aria-label="Buscar cliente"
        />
      </form>

      {clientes.length === 0 ? (
        <p className={estilos.vazio}>
          {busca ? (
            <>Nenhum cliente encontrado para “{busca}”.</>
          ) : (
            <>Nenhum cliente ainda. Comece cadastrando o primeiro.</>
          )}
        </p>
      ) : (
        <table className={estilos.tabela}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Endereço</th>
              <th>Situação</th>
              <th style={{ textAlign: "right" }}>Blocos</th>
              <th style={{ textAlign: "right" }}>Cliques</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const pagina = c.paginas[0];
              const noAr = c.ativo && pagina?.publicada;
              return (
                <tr key={c.id}>
                  <td>
                    <Link className={estilos.nomeCliente} href={`/gestao/${c.slug}`}>
                      {c.nome}
                    </Link>
                  </td>
                  <td>
                    <a
                      className={estilos.endereco}
                      href={`/${c.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      dnms.fun/{c.slug} ↗
                    </a>
                  </td>
                  <td>
                    {!c.ativo ? (
                      <span className={`${estilos.selo} ${estilos.seloInativo}`}>Inativo</span>
                    ) : noAr ? (
                      <span className={`${estilos.selo} ${estilos.seloAtivo}`}>No ar</span>
                    ) : (
                      <span className={`${estilos.selo} ${estilos.seloRascunho}`}>Rascunho</span>
                    )}
                  </td>
                  <td className={estilos.num} style={{ textAlign: "right" }}>
                    {pagina?._count.cards ?? 0}
                  </td>
                  <td className={estilos.num} style={{ textAlign: "right" }}>
                    {totalCliques(c)}
                  </td>
                  <td>
                    <div className={estilos.acoesLinha}>
                      <Link
                        className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`}
                        href={`/gestao/${c.slug}`}
                      >
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
