"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { alternarCard, criarCard, duplicarCard, excluirCard, reordenarCards, salvarCard, type LinkProgramadoDoBloco } from "../acoes";
import { BotaoSalvar } from "./Salvar";
import CampoImagem from "./CampoImagem";
import CampoVideo from "./CampoVideo";
import EditorIcones from "./EditorIcones";
import EditorCarrossel from "./EditorCarrossel";
import EditorUnidades from "./EditorUnidades";
import EscolhaAnimacao from "./EscolhaAnimacao";
import { TIPOS_COM_ANIMACAO } from "@/lib/animacoes";
import EscolhaLargura from "./EscolhaLargura";
import ControleAjuste from "./ControleAjuste";
import { naPrevia } from "./BarraAjuste";
import { useTela } from "./Tela";
import { valorNaTela, valoresPorTela, type ValoresTela } from "@/lib/ajustes";
import { MARCADORES, lerItens, lerMarcador } from "@/lib/lista";
import { PADRAO_DA_LETRA } from "@/lib/tema";
import EstiloDoTexto from "./EstiloDoTexto";
import TextoRico from "./TextoRico";
import LinksProgramados from "./LinksProgramados";
import { paraCampoDeHorario } from "@/lib/horario";
import estilos from "../gestao.module.css";

type Card = {
  id: string;
  tipo: string;
  titulo: string | null;
  subtitulo: string | null;
  url: string | null;
  imagemUrl: string | null;
  imagemTamanho: number | null;
  telefone: string | null;
  mensagem: string | null;
  corFundo: string | null;
  corTexto: string | null;
  destaque: boolean;
  largura: string | null;
  ajustesTablet: string | null;
  ajustesComputador: string | null;
  iconeCor: string | null;
  ativo: boolean;
  publicarEm: Date | null;
  despublicarEm: Date | null;
  /** os que ainda não acabaram, do primeiro ao último */
  programados: LinkProgramadoDoBloco[];
  icones: { id: string; rede: string; url: string }[];
  imagens: { id: string; imagemUrl: string; url: string | null }[];
  unidades: { id: string; nome: string; endereco: string | null; url: string | null; imagemUrl: string | null }[];
  carrosselTempo: number | null;
  itens: string | null;
  marcador: string | null;
  fonte: string | null;
  formato: string | null;
  rico: string | null;
  animacao: string | null;
  slideLargura: number | null;
  iconeTamanho: number | null;
  iconeEspaco: number | null;
};

const TIPOS: { valor: string; nome: string; ajuda: string }[] = [
  { valor: "link", nome: "Link", ajuda: "Botão comum que leva para um endereço" },
  { valor: "destaque", nome: "Destaque", ajuda: "Botão maior, para a ação principal" },
  { valor: "whatsapp", nome: "WhatsApp", ajuda: "Abre a conversa já com a mensagem escrita" },
  { valor: "titulo", nome: "Título", ajuda: "Divide a página em seções" },
  { valor: "texto", nome: "Texto", ajuda: "Um parágrafo curto, sem link" },
  { valor: "lista", nome: "Lista", ajuda: "Itens um embaixo do outro (serviços, horários…), um por linha" },
  { valor: "imagem", nome: "Imagem", ajuda: "Foto ou banner, clicável se tiver link" },
  { valor: "video", nome: "Vídeo", ajuda: "Vídeo do YouTube, Vimeo, Instagram, TikTok ou de qualquer serviço com link de incorporação, deitado ou em pé, tocando na página" },
  { valor: "redes", nome: "Redes", ajuda: "Ícones lado a lado (WhatsApp, Instagram…), cada um com o seu link" },
  { valor: "carrossel", nome: "Carrossel", ajuda: "Várias imagens passando sozinhas, cada uma com link se quiser" },
  { valor: "unidades", nome: "Unidades", ajuda: "Cartões com foto, nome e endereço, cada um com o seu link (para quem tem vários endereços)" },
  { valor: "separador", nome: "Separador", ajuda: "Uma linha para dar respiro" },
];

/** Campos que cada tipo realmente usa. O resto fica escondido para não confundir. */
function camposDoTipo(tipo: string) {
  switch (tipo) {
    case "titulo":
    case "texto":
      return { titulo: true, subtitulo: false, url: false, imagem: false, whatsapp: false, icones: false, carrossel: false, lista: false, unidades: false };
    case "separador":
      return { titulo: false, subtitulo: false, url: false, imagem: false, whatsapp: false, icones: false, carrossel: false, lista: false, unidades: false };
    case "imagem":
      return { titulo: true, subtitulo: false, url: true, imagem: true, whatsapp: false, icones: false, carrossel: false, lista: false, unidades: false };
    // vídeo: o título e a legenda (subtitulo) aparecem embaixo do vídeo
    case "video":
      return { titulo: true, subtitulo: true, url: true, imagem: false, whatsapp: false, icones: false, carrossel: false, lista: false, unidades: false };
    case "unidades":
      return { titulo: true, subtitulo: false, url: false, imagem: false, whatsapp: false, icones: false, carrossel: false, lista: false, unidades: true };
    case "lista":
      return { titulo: true, subtitulo: false, url: false, imagem: false, whatsapp: false, icones: false, carrossel: false, lista: true, unidades: false };
    case "carrossel":
      return { titulo: true, subtitulo: false, url: false, imagem: false, whatsapp: false, icones: false, carrossel: true, lista: false, unidades: false };
    case "redes":
      return { titulo: true, subtitulo: false, url: false, imagem: false, whatsapp: false, icones: true, carrossel: false, lista: false, unidades: false };
    // nos blocos clicáveis, a imagem é opcional e, quando existe, vira o próprio card (banner)
    case "whatsapp":
      return { titulo: true, subtitulo: true, url: false, imagem: true, whatsapp: true, icones: false, carrossel: false, lista: false, unidades: false };
    default:
      return { titulo: true, subtitulo: true, url: true, imagem: true, whatsapp: false, icones: false, carrossel: false, lista: false, unidades: false };
  }
}

/** Um arraste em andamento. Fica num ref: muda a cada movimento do ponteiro e não precisa redesenhar. */
type Arraste = {
  id: string;
  ponteiro: number;
  alca: HTMLElement;
  /** tira os ouvintes da janela e para a rolagem automática */
  parar: () => void;
  /** onde o ponteiro e o bloco estavam no começo, em coordenadas do documento */
  yInicio: number;
  topoInicio: number;
  clientY: number;
  inicial: string[];
  atual: string[];
  quadro: number;
};

// Perto da borda da janela, a página rola sozinha (a de cima desconta a barra fixa do painel).
const BORDA_DE_ROLAGEM = { topo: 150, baixo: 70 };

export default function EditorCards({
  paginaId,
  corFundo,
  corTexto,
  corDestaque,
  blocos,
  lado,
  cards,
  agora,
}: {
  paginaId: string;
  corFundo: string;
  corTexto: string;
  corDestaque: string;
  /** espaço entre os blocos e entre blocos lado a lado, por tela */
  blocos: ValoresTela;
  lado: ValoresTela;
  cards: Card[];
  /** a hora em que o servidor montou a página: diz se um link programado já está no ar */
  agora: number;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  // Bloco aberto: o editor rola até ele (o topo fica logo abaixo da barra fixa, ver
  // scroll-margin em .cardAberto) e a prévia rola até o mesmo bloco, no centro. Só leva
  // a rolagem até lá, não trava: dá para continuar rolando à vontade.
  useEffect(() => {
    if (!aberto) return;
    const suave: ScrollBehavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.querySelector(`[data-editor-bloco="${aberto}"]`)?.scrollIntoView({ behavior: suave, block: "start" });

    // na prévia, rola só a página de dentro: scrollIntoView ali puxaria o editor junto
    const naPagina = naPrevia(`[data-pl-bloco="${aberto}"]`);
    const janela = naPagina?.ownerDocument.defaultView;
    if (naPagina && janela) {
      const caixa = naPagina.getBoundingClientRect();
      janela.scrollTo({ top: janela.scrollY + caixa.top - (janela.innerHeight - caixa.height) / 2, behavior: suave });
    }
  }, [aberto]);
  const { tela } = useTela();

  // Ordem na tela: muda na hora ao arrastar e é gravada ao soltar. A ordem que vem do
  // servidor (bloco novo, duplicado, excluído, ordem gravada) só é absorvida fora de um
  // arraste e sem gravação pendente; senão, a resposta de um arraste anterior desfazia
  // o seguinte no meio do caminho. Gravação recusada zera `vista` e volta à do servidor.
  const doServidor = cards.map((c) => c.id);
  const [ordem, setOrdem] = useState(doServidor);
  const [vista, setVista] = useState(doServidor.join());
  const [gravando, setGravando] = useState(0);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [erroOrdem, setErroOrdem] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  if (vista !== doServidor.join() && !gravando && !arrastando) {
    setVista(doServidor.join());
    setOrdem(doServidor);
  }
  const porId = new Map(cards.map((c) => [c.id, c]));
  const lista = [...ordem.filter((id) => porId.has(id)), ...doServidor.filter((id) => !ordem.includes(id))].map((id) => porId.get(id)!);

  const listaRef = useRef<HTMLDivElement>(null);
  const arraste = useRef<Arraste | null>(null);
  const elemento = (id: string, atributo = "data-editor-bloco") =>
    listaRef.current?.querySelector<HTMLElement>(`[${atributo}="${id}"]`) ?? null;
  const nomeDoBloco = (id: string) => porId.get(id)?.titulo || TIPOS.find((t) => t.valor === porId.get(id)?.tipo)?.nome || "Bloco";

  async function gravarOrdem(ids: string[], movido: string) {
    setGravando((n) => n + 1);
    setErroOrdem(null);
    const r = await reordenarCards(paginaId, ids).catch(() => ({ erro: "Não consegui gravar a nova ordem. Tente de novo." }));
    setGravando((n) => n - 1);
    if (r.erro) {
      setErroOrdem(r.erro);
      setVista("");
    } else {
      setAviso(`${nomeDoBloco(movido)}: posição ${ids.indexOf(movido) + 1} de ${ids.length}.`);
    }
  }

  // A posição do ponteiro decide o lugar: o bloco vai para depois de todos os outros
  // cujo meio já ficou acima dele. A lista se reorganiza na hora (flushSync, para medir
  // o novo lugar no mesmo movimento) e o bloco segue o ponteiro com um translate que
  // desconta onde ele foi parar. Medido em coordenadas do documento: a rolagem
  // automática move a página sem mover o ponteiro.
  function acompanhar() {
    const a = arraste.current;
    if (!a) return;
    const outros = a.atual.filter((id) => id !== a.id);
    const indice = outros.filter((id) => {
      const caixa = elemento(id)?.getBoundingClientRect();
      return caixa && caixa.top + caixa.height / 2 < a.clientY;
    }).length;
    const nova = [...outros.slice(0, indice), a.id, ...outros.slice(indice)];
    if (nova.join() !== a.atual.join()) {
      a.atual = nova;
      flushSync(() => setOrdem(nova));
      // o React move os nós para reordenar, e nó movido perde a captura do ponteiro:
      // recaptura, para o arraste não escapar para a prévia (outro documento)
      try {
        a.alca.setPointerCapture(a.ponteiro);
      } catch {}
    }
    const el = elemento(a.id);
    if (el) el.style.transform = `translateY(${a.clientY + window.scrollY - a.yInicio - (el.offsetTop - a.topoInicio)}px)`;
  }

  function rolarNaBorda() {
    const a = arraste.current;
    if (!a) return;
    const { topo, baixo } = BORDA_DE_ROLAGEM;
    const passo =
      a.clientY < topo ? -Math.ceil((topo - a.clientY) / 6)
      : a.clientY > innerHeight - baixo ? Math.ceil((a.clientY - (innerHeight - baixo)) / 6)
      : 0;
    if (passo) {
      window.scrollBy(0, passo);
      acompanhar();
    }
    a.quadro = requestAnimationFrame(rolarNaBorda);
  }

  // O movimento e a soltura são ouvidos na janela, não na alça: a captura do ponteiro
  // cai toda vez que a lista se reorganiza, e o arraste não pode acabar por isso.
  function pegar(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (e.button !== 0 || arraste.current || lista.length < 2) return;
    const el = elemento(id);
    if (!el) return;
    e.preventDefault();
    const alca = e.currentTarget;
    alca.setPointerCapture(e.pointerId);
    const ids = lista.map((c) => c.id);
    const ponteiro = e.pointerId;
    const aoMover = (ev: PointerEvent) => {
      const a = arraste.current;
      if (!a || ev.pointerId !== ponteiro) return;
      a.clientY = ev.clientY;
      acompanhar();
    };
    const aoSoltar = (ev: PointerEvent) => {
      if (ev.pointerId === ponteiro) soltar();
    };
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
    window.addEventListener("pointercancel", aoSoltar);
    arraste.current = {
      id,
      ponteiro,
      alca,
      parar: () => {
        window.removeEventListener("pointermove", aoMover);
        window.removeEventListener("pointerup", aoSoltar);
        window.removeEventListener("pointercancel", aoSoltar);
        cancelAnimationFrame(arraste.current?.quadro ?? 0);
      },
      yInicio: e.clientY + window.scrollY,
      topoInicio: el.offsetTop,
      clientY: e.clientY,
      inicial: ids,
      atual: ids,
      quadro: requestAnimationFrame(rolarNaBorda),
    };
    setErroOrdem(null);
    setArrastando(id);
  }

  function soltar() {
    const a = arraste.current;
    if (!a) return;
    a.parar();
    arraste.current = null;
    const el = elemento(a.id);
    if (el) el.style.transform = "";
    setArrastando(null);
    if (a.atual.join() !== a.inicial.join()) gravarOrdem(a.atual, a.id);
  }

  // Pelo teclado: com a alça em foco, ↑ e ↓ andam uma posição (e gravam).
  function teclado(e: React.KeyboardEvent, id: string) {
    const passo = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (!passo || arraste.current) return;
    e.preventDefault();
    const ids = lista.map((c) => c.id);
    const de = ids.indexOf(id);
    const para = de + passo;
    if (para < 0 || para >= ids.length) return;
    ids.splice(de, 1);
    ids.splice(para, 0, id);
    flushSync(() => setOrdem(ids));
    // mover o nó na página pode tirar o foco dele: devolve, e mantém o bloco à vista
    elemento(id, "data-alca")?.focus();
    elemento(id)?.scrollIntoView({ block: "nearest" });
    gravarOrdem(ids, id);
  }

  // saiu da tela no meio de um arraste: solta a janela e para a rolagem automática
  useEffect(() => () => arraste.current?.parar(), []);

  return (
    <div className={estilos.bloco}>
      <h2>
        Blocos da página
        <small>
          {cards.length} {cards.length === 1 ? "bloco" : "blocos"} · clique para editar
          {cards.length > 1 && " · arraste pela alça para mudar a ordem"}
        </small>
      </h2>

      <div className={estilos.campo} style={{ marginBottom: 14 }}>
        <ControleAjuste alvo={{ tipo: "pagina", id: paginaId }} chave="blocos" valores={blocos} rotulo="Espaço entre os blocos" />
        <ControleAjuste
          alvo={{ tipo: "pagina", id: paginaId }}
          chave="lado"
          valores={lado}
          rotulo="Espaço entre blocos lado a lado"
          padraoDe={{ chave: "blocos", valores: blocos }}
          rotuloPadrao="igual ao espaço entre os blocos"
        />
      </div>

      {erroOrdem && <p className={estilos.erro} role="alert">{erroOrdem}</p>}
      <p className={estilos.somenteLeitor} aria-live="polite">{aviso}</p>

      <div ref={listaRef} className={`${estilos.listaCards} ${arrastando ? estilos.listaArrastando : ""}`}>
        {lista.map((card) => {
          const usa = camposDoTipo(card.tipo);
          const estaAberto = aberto === card.id;
          const nomeTipo = TIPOS.find((t) => t.valor === card.tipo)?.nome ?? card.tipo;

          return (
            <div
              key={card.id}
              data-editor-bloco={card.id}
              className={`${estilos.card} ${card.ativo ? "" : estilos.cardInativo} ${estaAberto ? estilos.cardAberto : ""} ${arrastando === card.id ? estilos.cardArrastando : ""}`}
            >
              <div className={estilos.cardTopo}>
                {lista.length > 1 && (
                  <button
                    type="button"
                    className={estilos.alca}
                    data-alca={card.id}
                    title="Arraste para mudar a ordem"
                    aria-label={`Mover ${nomeDoBloco(card.id)}: arraste, ou use as setas para cima e para baixo`}
                    onPointerDown={(e) => pegar(e, card.id)}
                    onKeyDown={(e) => teclado(e, card.id)}
                  >
                    <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
                      {[2, 8, 14].flatMap((y) => [2, 8].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />))}
                    </svg>
                  </button>
                )}
                <span className={estilos.cardTipo} data-tipo={card.tipo}>{nomeTipo}</span>
                {(() => {
                  // largura do bloco na tela que está sendo editada
                  const largura = String(valorNaTela(valoresPorTela(card, "largura"), "largura", tela).valor);
                  return largura !== "inteira" && <span className={estilos.cardLargura} title="Largura na linha">{largura}</span>;
                })()}
                <button
                  type="button"
                  className={estilos.cardTitulo}
                  onClick={() => setAberto(estaAberto ? null : card.id)}
                  style={{ background: "none", border: 0, color: "inherit", textAlign: "left", cursor: "pointer", font: "inherit" }}
                >
                  {card.titulo || (card.tipo === "lista" && lerItens(card.itens)[0]) || <em>{card.tipo === "lista" ? "sem itens" : "sem texto"}</em>}
                </button>

                <div className={estilos.cardAcoes}>
                  <form action={alternarCard.bind(null, card.id)}>
                    <button className={estilos.iconeBtn} title={card.ativo ? "Esconder da página" : "Mostrar na página"} aria-label={card.ativo ? "Esconder" : "Mostrar"}>
                      {card.ativo ? "👁" : "🚫"}
                    </button>
                  </form>
                  <form action={duplicarCard.bind(null, card.id)}>
                    <button className={estilos.iconeBtn} title="Duplicar" aria-label="Duplicar">⧉</button>
                  </form>
                  <button
                    type="button"
                    className={estilos.iconeBtn}
                    onClick={() => setAberto(estaAberto ? null : card.id)}
                    title={estaAberto ? "Fechar" : "Editar"}
                    aria-label={estaAberto ? "Fechar" : "Editar"}
                  >
                    {estaAberto ? "−" : "✎"}
                  </button>
                </div>
              </div>

              {estaAberto && (
                <div className={estilos.cardCorpo}>
                  <form action={salvarCard.bind(null, card.id)}>
                    <div className={estilos.campos}>
                      <div className={estilos.doisCampos}>
                        <div className={estilos.campo}>
                          <label htmlFor={`tipo-${card.id}`}>Tipo de bloco</label>
                          <select key={card.tipo} id={`tipo-${card.id}`} name="tipo" defaultValue={card.tipo}>
                            {TIPOS.map((t) => (
                              <option key={t.valor} value={t.valor}>{t.nome}</option>
                            ))}
                          </select>
                          <span className={estilos.dica}>
                            {TIPOS.find((t) => t.valor === card.tipo)?.ajuda}
                          </span>
                        </div>

                        {usa.titulo && card.tipo !== "titulo" && card.tipo !== "texto" && (
                          <div className={estilos.campo}>
                            <label htmlFor={`titulo-${card.id}`}>
                              {card.tipo === "texto" ? "Texto" : card.tipo === "redes" || card.tipo === "unidades" ? "Nome do bloco (só no painel)" : card.tipo === "carrossel" ? "Nome do carrossel (vira o texto alternativo das imagens)" : card.tipo === "lista" ? "Título da lista (opcional)" : card.tipo === "video" ? "Título (opcional)" : "Título"}
                            </label>
                            <input id={`titulo-${card.id}`} type="text" name="titulo" defaultValue={card.titulo ?? ""} />
                            {card.tipo === "video" && <span className={estilos.dica}>Aparece embaixo do vídeo, em letra maior que a legenda.</span>}
                          </div>
                        )}
                      </div>

                      {/* título e texto: editor com formatação por trecho (negrito, cor… numa palavra) */}
                      {(card.tipo === "titulo" || card.tipo === "texto") && (
                        <TextoRico
                          key={card.id}
                          cardId={card.id}
                          rotulo={card.tipo === "texto" ? "Texto" : "Título"}
                          rico={card.rico}
                          titulo={card.titulo}
                          fundo={corFundo}
                          corDaPagina={corTexto}
                          corDosBotoes={corDestaque}
                        />
                      )}

                      {/* tamanho da letra do título e do texto, por tela; grava sozinho */}
                      {(card.tipo === "titulo" || card.tipo === "texto") && (
                        <EstiloDoTexto
                          key={`${card.fonte}|${card.corTexto}|${card.formato}`}
                          cardId={card.id}
                          tipo={card.tipo}
                          fonte={card.fonte}
                          cor={card.corTexto}
                          formato={card.formato}
                          corDaPagina={corTexto}
                        />
                      )}
                      {(card.tipo === "titulo" || card.tipo === "texto") && (
                        <div className={estilos.campo}>
                          <ControleAjuste
                            alvo={{ tipo: "card", id: card.id }}
                            chave="letra"
                            valores={valoresPorTela(card, "letra")}
                            rotulo="Tamanho do texto"
                            padrao={PADRAO_DA_LETRA[card.tipo]}
                          />
                        </div>
                      )}

                      {/* no vídeo, a legenda: embaixo do título, em letra menor, e pode ter mais de uma linha */}
                      {usa.subtitulo && card.tipo === "video" && (
                        <div className={estilos.campo}>
                          <label htmlFor={`sub-${card.id}`}>Legenda (opcional)</label>
                          <textarea id={`sub-${card.id}`} name="subtitulo" rows={2} defaultValue={card.subtitulo ?? ""} />
                          <span className={estilos.dica}>Aparece embaixo do título, em letra um pouco menor. Com vários vídeos no bloco, o título e a legenda valem para todos.</span>
                        </div>
                      )}
                      {usa.subtitulo && card.tipo !== "video" && (
                        <div className={estilos.campo}>
                          <label htmlFor={`sub-${card.id}`}>Linha de apoio (opcional)</label>
                          <input id={`sub-${card.id}`} type="text" name="subtitulo" defaultValue={card.subtitulo ?? ""} />
                        </div>
                      )}

                      {/* vídeo: link ou código <iframe>, horizontal ou vertical e o tamanho (CampoVideo) */}
                      {card.tipo === "video" && (
                        <CampoVideo
                          // refaz só quando os links gravados mudam (depois do Salvar bloco): o formato grava
                          // sozinho, e refazer junto com ele apagava o link colado e ainda não salvo
                          key={`${card.id}|${card.url}|${card.itens}`}
                          cardId={card.id}
                          url={card.url}
                          itens={card.itens}
                          formato={card.formato}
                          valoresTamanho={valoresPorTela(card, "imagem")}
                          programados={card.programados}
                          agora={agora}
                        />
                      )}

                      {usa.url && card.tipo !== "video" && (
                        <div className={estilos.campo}>
                          <label htmlFor={`url-${card.id}`}>Endereço de destino</label>
                          <input id={`url-${card.id}`} type="url" name="url" defaultValue={card.url ?? ""} placeholder="https://" />
                          {/* outro link num período, no lugar deste (grava sozinho, fora do Salvar bloco) */}
                          <LinksProgramados cardId={card.id} programados={card.programados} agora={agora} />
                        </div>
                      )}

                      {usa.imagem && (
                        <CampoImagem
                          alvo={{ tipo: "card", id: card.id }}
                          url={card.imagemUrl}
                          rotulo={card.tipo === "imagem" ? "Imagem" : "Imagem do card (opcional)"}
                          dica={
                            card.tipo === "imagem"
                              ? "O título vira o texto alternativo."
                              : "Com imagem, o card vira a própria arte, clicável, no lugar do botão. O título não aparece na página: fica como texto alternativo e como nome do bloco aqui."
                          }
                          fundo={corFundo}
                          ajuste={{ chave: "imagem", valores: valoresPorTela(card, "imagem") }}
                        />
                      )}

                      {usa.icones && (
                        <EditorIcones
                          cardId={card.id}
                          icones={card.icones}
                          titulo={card.titulo}
                          valoresIcone={valoresPorTela(card, "icone")}
                          valoresVao={valoresPorTela(card, "vao")}
                          iconeCor={card.iconeCor}
                          corTexto={corTexto}
                        />
                      )}

                      {usa.lista && (
                        <div className={estilos.doisCampos}>
                          <div className={estilos.campo}>
                            <label htmlFor={`itens-${card.id}`}>Itens, um por linha</label>
                            <textarea
                              id={`itens-${card.id}`}
                              name="itens"
                              rows={Math.min(12, Math.max(4, lerItens(card.itens).length + 1))}
                              defaultValue={card.itens ?? ""}
                              placeholder={"Treino personalizado\nAvaliação física\nAcompanhamento online"}
                            />
                            <span className={estilos.dica}>
                              Pode colar uma lista pronta: marcadores como “-”, “•” ou “1.” saem sozinhos. Sem nenhum item, o bloco não aparece na página.
                            </span>
                          </div>
                          <div className={estilos.campo}>
                            <label htmlFor={`marcador-${card.id}`}>Marcador</label>
                            <select key={card.marcador ?? "ponto"} id={`marcador-${card.id}`} name="marcador" defaultValue={lerMarcador(card.marcador)}>
                              {MARCADORES.map((m) => (
                                <option key={m.valor} value={m.valor}>{m.nome}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {usa.unidades && (
                        <EditorUnidades
                          key={card.id}
                          cardId={card.id}
                          unidades={card.unidades}
                          corCartao={card.corFundo}
                          corTextoCartao={card.corTexto}
                          corDaPagina={corTexto}
                          fundoDaPagina={corFundo}
                          valoresColunas={valoresPorTela(card, "colunas")}
                          valoresLetra={valoresPorTela(card, "letra")}
                        />
                      )}

                      {usa.carrossel && (
                        <EditorCarrossel
                          cardId={card.id}
                          imagens={card.imagens}
                          tempo={card.carrosselTempo}
                          valoresSlide={valoresPorTela(card, "slide")}
                          fundo={corFundo}
                        />
                      )}

                      {usa.whatsapp && (
                        <div className={estilos.doisCampos}>
                          <div className={estilos.campo}>
                            <label htmlFor={`tel-${card.id}`}>Número com DDI e DDD</label>
                            <input id={`tel-${card.id}`} type="text" name="telefone" defaultValue={card.telefone ?? ""} placeholder="5513997287738" />
                          </div>
                          <div className={estilos.campo}>
                            <label htmlFor={`msg-${card.id}`}>Mensagem que já vem escrita</label>
                            <input id={`msg-${card.id}`} type="text" name="mensagem" defaultValue={card.mensagem ?? ""} />
                          </div>
                        </div>
                      )}

                      {/* imagem, botão ou ícones: reflexo, pulsar ou tremida (grava sozinho) */}
                      {TIPOS_COM_ANIMACAO.includes(card.tipo) && <EscolhaAnimacao key={card.id} cardId={card.id} animacao={card.animacao} />}

                      <EscolhaLargura cardId={card.id} valores={valoresPorTela(card, "largura")} />

                      <div className={estilos.doisCampos}>
                        <div className={estilos.campo}>
                          <label htmlFor={`pub-${card.id}`}>Aparecer a partir de (opcional)</label>
                          <input id={`pub-${card.id}`} type="datetime-local" name="publicarEm" defaultValue={paraCampoDeHorario(card.publicarEm)} />
                        </div>
                        <div className={estilos.campo}>
                          <label htmlFor={`desp-${card.id}`}>Sumir em (opcional)</label>
                          <input id={`desp-${card.id}`} type="datetime-local" name="despublicarEm" defaultValue={paraCampoDeHorario(card.despublicarEm)} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        <label className={estilos.chave}>
                          <input type="checkbox" name="ativo" defaultChecked={card.ativo} />
                          Visível na página
                        </label>
                        <label className={estilos.chave}>
                          <input type="checkbox" name="destaque" defaultChecked={card.destaque} />
                          Dar destaque
                        </label>
                      </div>
                    </div>

                    <div className={estilos.salvarBarra}>
                      <BotaoSalvar rotulo="Salvar bloco" />
                      <button
                        type="button"
                        className={`${estilos.btn} ${estilos.btnPerigo} ${estilos.btnMini}`}
                        onClick={() => {
                          if (confirm(`Excluir o bloco "${card.titulo ?? "sem texto"}"? Isso não volta.`)) {
                            excluirCard(card.id);
                            setAberto(null);
                          }
                        }}
                      >
                        Excluir bloco
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={estilos.adicionar}>
        {TIPOS.map((t) => (
          <form key={t.valor} action={criarCard.bind(null, paginaId, t.valor)}>
            <button type="submit" title={t.ajuda}>+ {t.nome}</button>
          </form>
        ))}
      </div>
    </div>
  );
}
