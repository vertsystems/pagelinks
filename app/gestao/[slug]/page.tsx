import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/acesso";
import { FONTES } from "@/lib/tema";
import { excluirCliente, salvarPagina } from "../acoes";
import FormCadastro from "./FormCadastro";
import CampoCor from "./CampoCor";
import EditorCards from "./EditorCards";
import Previa from "./Previa";
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
    include: { paginas: { take: 1, include: { cards: { orderBy: { ordem: "asc" } } } } },
  });
  if (!cliente) notFound();

  const pagina = cliente.paginas[0];
  if (!pagina) notFound();

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

      <div className={estilos.editor}>
        <div className={estilos.coluna}>
          {/* dados da página */}
          <form action={salvarPagina.bind(null, pagina.id)} className={estilos.bloco}>
            <h2>Página<small>o que aparece no topo</small></h2>
            <div className={estilos.campos}>
              <div className={estilos.campo}>
                <label htmlFor="titulo">Título</label>
                <input id="titulo" type="text" name="titulo" defaultValue={pagina.titulo} required />
              </div>
              <div className={estilos.campo}>
                <label htmlFor="bio">Frase de apresentação</label>
                <textarea id="bio" name="bio" defaultValue={pagina.bio ?? ""} rows={2} />
              </div>
              <div className={estilos.campo}>
                <label htmlFor="avatarUrl">Endereço da foto ou logo</label>
                <input id="avatarUrl" type="url" name="avatarUrl" defaultValue={pagina.avatarUrl ?? ""} placeholder="https://" />
                <span className={estilos.dica}>Aparece redonda no topo. Deixe vazio para não mostrar.</span>
              </div>
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
          <EditorCards paginaId={pagina.id} cards={pagina.cards} />

          {/* aparência */}
          <form action={salvarPagina.bind(null, pagina.id)} className={estilos.bloco}>
            <h2>Aparência<small>cores, fonte e formato dos botões</small></h2>
            <input type="hidden" name="titulo" value={pagina.titulo} />
            <input type="hidden" name="bio" value={pagina.bio ?? ""} />
            <input type="hidden" name="avatarUrl" value={pagina.avatarUrl ?? ""} />
            {pagina.publicada && <input type="hidden" name="publicada" value="on" />}
            <input type="hidden" name="seoTitulo" value={pagina.seoTitulo ?? ""} />
            <input type="hidden" name="seoDescricao" value={pagina.seoDescricao ?? ""} />
            <input type="hidden" name="seoImagemUrl" value={pagina.seoImagemUrl ?? ""} />
            <input type="hidden" name="faviconUrl" value={pagina.faviconUrl ?? ""} />

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
                  <select id="fonte" name="fonte" defaultValue={pagina.fonte}>
                    {FONTES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className={estilos.campo}>
                  <label htmlFor="estiloBotao">Formato dos botões</label>
                  <select id="estiloBotao" name="estiloBotao" defaultValue={pagina.estiloBotao}>
                    {ESTILOS_BOTAO.map((e) => <option key={e.valor} value={e.valor}>{e.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className={estilos.doisCampos}>
                <div className={estilos.campo}>
                  <label htmlFor="fundoTipo">Tipo de fundo</label>
                  <select id="fundoTipo" name="fundoTipo" defaultValue={pagina.fundoTipo}>
                    <option value="solido">Cor única</option>
                    <option value="gradiente">Degradê entre duas cores</option>
                    <option value="imagem">Imagem</option>
                  </select>
                </div>
                <CampoCor nome="fundoCorFim" rotulo="Segunda cor do degradê" valor={pagina.fundoCorFim ?? pagina.corFundo} />
              </div>

              <div className={estilos.campo}>
                <label htmlFor="fundoImagemUrl">Endereço da imagem de fundo</label>
                <input id="fundoImagemUrl" type="url" name="fundoImagemUrl" defaultValue={pagina.fundoImagemUrl ?? ""} placeholder="https://" />
                <span className={estilos.dica}>Só é usada quando o tipo de fundo for “Imagem”.</span>
              </div>
            </div>
            <div className={estilos.salvarBarra}>
              <BotaoSalvar rotulo="Salvar aparência" />
            </div>
          </form>

          {/* busca e compartilhamento */}
          <form action={salvarPagina.bind(null, pagina.id)} className={estilos.bloco}>
            <h2>Google e compartilhamento<small>como a página aparece fora dela</small></h2>
            <input type="hidden" name="titulo" value={pagina.titulo} />
            <input type="hidden" name="bio" value={pagina.bio ?? ""} />
            <input type="hidden" name="avatarUrl" value={pagina.avatarUrl ?? ""} />
            {pagina.publicada && <input type="hidden" name="publicada" value="on" />}
            <input type="hidden" name="corFundo" value={pagina.corFundo} />
            <input type="hidden" name="corTexto" value={pagina.corTexto} />
            <input type="hidden" name="corDestaque" value={pagina.corDestaque} />
            <input type="hidden" name="corTextoBotao" value={pagina.corTextoBotao} />
            <input type="hidden" name="fonte" value={pagina.fonte} />
            <input type="hidden" name="estiloBotao" value={pagina.estiloBotao} />
            <input type="hidden" name="fundoTipo" value={pagina.fundoTipo} />
            <input type="hidden" name="fundoCorFim" value={pagina.fundoCorFim ?? ""} />
            <input type="hidden" name="fundoImagemUrl" value={pagina.fundoImagemUrl ?? ""} />

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
            style={{ borderColor: "rgba(248,113,113,.25)" }}
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

        <Previa slug={cliente.slug} versao={pagina.atualizadoEm.toISOString()} />
      </div>
    </main>
  );
}
