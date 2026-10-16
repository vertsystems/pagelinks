import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { DOMINIO, caminhoDoDestino } from "@/lib/redirecionamentos";
import { quandoMudou } from "../quando";
import Redirecionamentos, { type ItemRedirecionamento } from "./Redirecionamentos";
import gestao from "../gestao.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Redirecionamentos — PageLinks" };

const inteiro = new Intl.NumberFormat("pt-BR");

/**
 * Redirecionamentos: endereço antigo do dnms.fun que leva para outro do mesmo domínio.
 * Cada um vem com a situação de verdade, olhando as páginas de hoje: se vale (o endereço
 * antigo não tem página no ar) e se o destino abre alguma coisa.
 */
export default async function PaginaRedirecionamentos() {
  await exigirAdmin();
  const [redirecionamentos, clientes] = await Promise.all([
    prisma.redirecionamento.findMany({ orderBy: { criadoEm: "desc" } }),
    prisma.cliente.findMany({
      select: { nome: true, slug: true, ativo: true, paginas: { select: { publicada: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  // "No ar" do mesmo jeito que a página pública decide: cliente ativo com página publicada.
  const porSlug = new Map(clientes.map((c) => [c.slug, { nome: c.nome, noAr: c.ativo && c.paginas.some((p) => p.publicada) }]));
  const redirecionados = new Set(redirecionamentos.map((r) => r.de));
  const agora = new Date();

  const itens: ItemRedirecionamento[] = redirecionamentos.map((r) => {
    const destino = caminhoDoDestino(r.para);
    const naOrigem = porSlug.get(r.de);
    const noDestino = porSlug.get(destino);

    let nivel: ItemRedirecionamento["nivel"] = "ok";
    let situacao: string;
    if (naOrigem?.noAr) {
      nivel = "atencao";
      situacao = `Sem efeito por enquanto: ${DOMINIO}/${r.de}/ é a página no ar de ${naOrigem.nome}, e a página ganha. Passa a valer quando ela sair do ar ou mudar de endereço.`;
    } else if (!destino) {
      situacao = `Leva para a página inicial do ${DOMINIO}.`;
    } else if (noDestino?.noAr) {
      situacao = `Leva para a página de ${noDestino.nome}.`;
    } else if (redirecionados.has(destino)) {
      situacao = `O destino tem outro redirecionamento: a pessoa passa por ele antes de chegar.`;
    } else {
      nivel = "atencao";
      situacao = noDestino
        ? `O destino é a página de ${noDestino.nome}, que está fora do ar: quem chegar vê "página não encontrada".`
        : `Nenhuma página mora em ${DOMINIO}/${destino}/: quem chegar vê "página não encontrada".`;
    }

    const ultimo = r.ultimoAcessoEm ? quandoMudou(r.ultimoAcessoEm, agora) : null;
    return {
      id: r.id,
      de: r.de,
      para: r.para,
      nivel,
      situacao,
      acessos: r.acessos,
      ultimoAcesso: ultimo?.texto ?? null,
      ultimoAcessoCompleto: ultimo?.completo ?? null,
      criado: quandoMudou(r.criadoEm, agora).completo,
    };
  });

  const acessos = redirecionamentos.reduce((soma, r) => soma + r.acessos, 0);
  const sugestoes = clientes.filter((c) => porSlug.get(c.slug)?.noAr).map((c) => ({ slug: c.slug, nome: c.nome }));

  return (
    <main className={gestao.env} style={{ maxWidth: 980 }}>
      <div className={gestao.cabecalho}>
        <div>
          <p style={{ marginBottom: 6 }}>
            <Link href="/gestao" style={{ color: "var(--g-suave)", textDecoration: "none", fontSize: 13 }}>
              ← Todos os clientes
            </Link>
          </p>
          <h1>Redirecionamentos</h1>
          <p>
            Link antigo do {DOMINIO} que não existe mais leva para outro endereço do {DOMINIO}.{" "}
            {redirecionamentos.length
              ? `${redirecionamentos.length} ${redirecionamentos.length === 1 ? "redirecionamento" : "redirecionamentos"} · ${inteiro.format(acessos)} ${acessos === 1 ? "acesso" : "acessos"}`
              : "Nenhum ainda."}
          </p>
        </div>
      </div>

      <Redirecionamentos itens={itens} sugestoes={sugestoes} dominio={DOMINIO} />
    </main>
  );
}
