import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { FONTES } from "@/lib/tema";
import { valoresPorTela } from "@/lib/ajustes";
import { excluirCliente, salvarPagina } from "../acoes";
import FormCadastro from "./FormCadastro";
import CampoImagem from "./CampoImagem";
import CamposTopo from "./CamposTopo";
import CampoCor from "./CampoCor";
import EditorCards from "./EditorCards";
import Previa from "./Previa";
import { AvisoTela, ProvedorTela } from "./Tela";
import { BotaoSalvar } from "./Salvar";
import estilos from "../gestao.module.css";

export const dynamic = "force-dynamic";

const ESTILOS_BOTAO = [
  { valor: "arredondado", nome: "Cantos suaves" },
  { valor: "pilula", nome: "Totalmente redondo" },
  { valor: "reto", nome: "Cantos vivos" },
  { valor: "contorno", nome: "Só contorno" },
];

export default async function EditorCliente({ params }: { params: Promise<{ slug: string }> }) {
  await exigirAdmin();
  const { slug } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { slug },
    include: {
      paginas: {
        take: 1,
        include: { cards: { orderBy: { ordem: "asc" }, include: { icones: { orderBy: { ordem: "asc" } } } } },
      },
    },
  });
  if (!cliente) notFound();

  const pagina = cliente.paginas[0];
  if (!pagina) notFound();

  // A prévia recarrega quando isto muda: mexer num bloco também conta, não só na página.
  const ultimaMudanca = Math.max(pagina.atualizadoEm.getTime(), ...pagina.cards.map((c) => c.atualizadoEm.getTime()));
  const versaoDaPrevia = `${ultimaMudanca}-${pagina.cards.length}`;

  const cliques = await prisma.clique.count({
    where: { card: { paginaId: pagina.id } },
  });

  return (
    <main className={estilos.env}>
      <div className={estilos.cabecalho}>
        <div>
          <p style={{ marginBottom: 6 }}>
            <Link href="/gestao" style={{ color: "var(--g-suave)", textDecoration: "none", fontSize: 13 }}>
              ← Todos os clientes
            </Link>
          </p>
          <h1>{cliente.nome}</h1>
          <p>
            {pagina.cards.length} {pagina.cards.length === 1 ? "bloco" : "blocos"} ·{" "}
            {cliques} {cliques === 1 ? "clique" : "cliques"} ·{" "}
            {pagina.publicada && cliente.ativo ? "no ar" : "rascunho"}
          </p>
        </div>
      </div>

      {/* A tela escolhida na prévia (celular, tablet, computador) vale para todas as barras
          e larguras do editor: cada tela tem os seus tamanhos e espaços (lib/ajustes.ts). */}
      <ProvedorTela>
      <div className={estilos.editor}>
        <div className={estilos.coluna}>
          <AvisoTela />
          {/* dados da página */}
          <form action={salvarPagina.bind(null, pagina.id)} className={estilos.bloco}>
            <h2>Página<small>o que aparece no topo</small></h2>
            <div className={estilos.campos}>
              <CamposTopo
                paginaId={pagina.id}
                titulo={pagina.titulo}
                bio={pagina.bio}
                avatarUrl={pagina.avatarUrl}
                cabecalhoImagemUrl={pagina.cabecalhoImagemUrl}
                corFundo={pagina.corFundo}
                ajustes={{
                  avatar: valoresPorTela(pagina, "avatar"),
                  cabecalho: valoresPorTela(pagina, "cabecalho"),
                  topo: valoresPorTela(pagina, "topo"),
                }}
              />
              {/* marca que este formulário cuida da chave: desmarcada, ela não iria no envio */}
              <input type="hidden" name="publicada" value="" />
              <label className={estilos.chave}>
                <input type="checkbox" name="publicada" defaultChecked={pagina.publicada} />
                Página no ar
              </label>
            </div>
            <div className={estilos.salvarBarra}>
              <BotaoSalvar />
            </div>
          </form>

          {/* blocos */}
          <EditorCards paginaId={pagina.id} corFundo={pagina.corFundo} corTexto={pagina.corTexto} blocos={valoresPorTela(pagina, "blocos")} lado={valoresPorTela(pagina, "lado")} cards={pagina.cards} />

          {/* aparência. As listas têm key no valor gravado: depois de salvar, o React 19 reseta
              o formulário, e um <select> volta à opção de quando foi montado. Recriado com o
              valor novo, o reset volta para ele (sem isso, salvar de novo desfazia a escolha). */}
          <form action={salvarPagina.bind(null, pagina.id)} className={estilos.bloco}>
            <h2>Aparência<small>cores, fonte e formato dos botões</small></h2>
            <div className={estilos.campos}>
              <div className={estilos.doisCampos}>
                <CampoCor nome="corFundo" rotulo="Fundo" valor={pagina.corFundo} />
                <CampoCor nome="corTexto" rotulo="Texto" valor={pagina.corTexto} />
              </div>
              <div className={estilos.doisCampos}>
                <CampoCor nome="corDestaque" rotulo="Botões" valor={pagina.corDestaque} />
                <CampoCor nome="corTextoBotao" rotulo="Texto dentro do botão" valor={pagina.corTextoBotao} />
              </div>

              <div className={estilos.doisCampos}>
                <div className={estilos.campo}>
                  <label htmlFor="fonte">Fonte</label>
                  <select key={pagina.fonte} id="fonte" name="fonte" defaultValue={pagina.fonte}>
                    {FONTES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className={estilos.campo}>
                  <label htmlFor="estiloBotao">Formato dos botões</label>
                  <select key={pagina.estiloBotao} id="estiloBotao" name="estiloBotao" defaultValue={pagina.estiloBotao}>
                    {ESTILOS_BOTAO.map((e) => <option key={e.valor} value={e.valor}>{e.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className={estilos.doisCampos}>
                <div className={estilos.campo}>
                  <label htmlFor="fundoTipo">Tipo de fundo</label>
                  <select key={pagina.fundoTipo} id="fundoTipo" name="fundoTipo" defaultValue={pagina.fundoTipo}>
                    <option value="solido">Cor única</option>
                    <option value="gradiente">Degradê entre duas cores</option>
                    <option value="imagem">Imagem</option>
                  </select>
                </div>
                <CampoCor nome="fundoCorFim" rotulo="Segunda cor do degradê" valor={pagina.fundoCorFim ?? pagina.corFundo} />
              </div>

              <CampoImagem
                alvo={{ tipo: "pagina", id: pagina.id, campo: "fundoImagemUrl" }}
                url={pagina.fundoImagemUrl}
                rotulo="Imagem de fundo"
                dica="Só é usada quando o tipo de fundo for “Imagem”."
              />
            </div>
            <div className={estilos.salvarBarra}>
              <BotaoSalvar rotulo="Salvar aparência" />
            </div>
          </form>

          {/* busca e compartilhamento */}
          <form action={salvarPagina.bind(null, pagina.id)} className={estilos.bloco}>
            <h2>Google e compartilhamento<small>como a página aparece fora dela</small></h2>
            <div className={estilos.campos}>
              <div className={estilos.campo}>
                <label htmlFor="seoTitulo">Título no Google</label>
                <input id="seoTitulo" type="text" name="seoTitulo" defaultValue={pagina.seoTitulo ?? ""} placeholder={pagina.titulo} />
              </div>
              <div className={estilos.campo}>
                <label htmlFor="seoDescricao">Descrição</label>
                <textarea id="seoDescricao" name="seoDescricao" defaultValue={pagina.seoDescricao ?? ""} rows={2} placeholder={pagina.bio ?? ""} />
              </div>
              <div className={estilos.doisCampos}>
                <div className={estilos.campo}>
                  <label htmlFor="seoImagemUrl">Imagem ao compartilhar</label>
                  <input id="seoImagemUrl" type="url" name="seoImagemUrl" defaultValue={pagina.seoImagemUrl ?? ""} placeholder="https://" />
                  <span className={estilos.dica}>1200×630. É o que aparece no WhatsApp.</span>
                </div>
                <div className={estilos.campo}>
                  <label htmlFor="faviconUrl">Ícone da aba</label>
                  <input id="faviconUrl" type="url" name="faviconUrl" defaultValue={pagina.faviconUrl ?? ""} placeholder="https://" />
                </div>
              </div>
            </div>
            <div className={estilos.salvarBarra}>
              <BotaoSalvar rotulo="Salvar" />
            </div>
          </form>

          <FormCadastro cliente={cliente} />

          <form
            action={excluirCliente.bind(null, cliente.id)}
            className={estilos.bloco}
            style={{ borderColor: "var(--g-perigo-borda)" }}
          >
            <h2>Excluir cliente<small>não tem volta</small></h2>
            <p style={{ color: "var(--g-suave)", fontSize: 14, margin: "0 0 14px" }}>
              Apaga o cliente, a página, os {pagina.cards.length} blocos e o histórico de cliques.
              Se a ideia é só tirar do ar, desmarque “Cliente ativo” acima.
            </p>
            <button className={`${estilos.btn} ${estilos.btnPerigo}`} type="submit">
              Excluir {cliente.nome}
            </button>
          </form>
        </div>

        <Previa slug={cliente.slug} versao={versaoDaPrevia} />
      </div>
      </ProvedorTela>
    </main>
  );
}
