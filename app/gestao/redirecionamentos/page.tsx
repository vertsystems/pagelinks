import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { DOMINIO, caminhoDoDestino, destinoParaMostrar } from "@/lib/redirecionamentos";
import { quandoMudou } from "../quando";
import Redirecionamentos, { type ItemRedirecionamento } from "./Redirecionamentos";
import gestao from "../gestao.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Redirecionamentos — PageLinks" };

const inteiro = new Intl.NumberFormat("pt-BR");

/**
 * Redirecionamentos: endereço do dnms.fun (ou a página inicial) que leva para outro lugar, no
 * dnms.fun ou em qualquer site. Cada um vem com a situação de verdade, olhando as páginas de
 * hoje: se vale (o endereço antigo não tem página no ar) e se o destino aqui dentro abre
 * alguma coisa. Site de fora não dá para conferir daqui: aparece como está.
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
    const destino = caminhoDoDestino(r.para); // null: outro site
    const naOrigem = r.de ? porSlug.get(r.de) : undefined;
    const noDestino = destino ? porSlug.get(destino) : undefined;

    let nivel: ItemRedirecionamento["nivel"] = "ok";
    let situacao: string;
    let acao: ItemRedirecionamento["acao"];
    if (naOrigem?.noAr) {
      nivel = "atencao";
      situacao = `Sem efeito por enquanto: ${DOMINIO}/${r.de}/ é a página no ar de ${naOrigem.nome}, e a página ganha. Para o redirecionamento valer, tire a página do ar (desmarque "Cliente ativo" no cadastro) ou mude o endereço dela.`;
      acao = { href: `/gestao/${r.de}`, rotulo: `Abrir o cadastro de ${naOrigem.nome}` };
    } else if (destino === null) {
      situacao = `Leva para outro site: ${destinoParaMostrar(r.para).split(/[/?#]/)[0]}.`;
    } else if (!destino) {
      situacao = redirecionados.has("")
        ? `Leva para a página inicial do ${DOMINIO}, que tem redirecionamento próprio: a pessoa passa por ele antes de chegar.`
        : `Leva para a página inicial do ${DOMINIO}.`;
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
      paraMostrar: destinoParaMostrar(r.para),
      externo: destino === null,
      nivel,
      situacao,
      acao,
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
            Um endereço do {DOMINIO}, inclusive a página inicial, leva quem chega para outro lugar: aqui ou em qualquer site.{" "}
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
