"use client";

import { useState } from "react";
import { alternarCard, criarCard, duplicarCard, excluirCard, moverCard, salvarCard } from "../acoes";
import { BotaoSalvar } from "./Salvar";
import CampoImagem from "./CampoImagem";
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
  ativo: boolean;
  publicarEm: Date | null;
  despublicarEm: Date | null;
};

const TIPOS: { valor: string; nome: string; ajuda: string }[] = [
  { valor: "link", nome: "Link", ajuda: "Botão comum que leva para um endereço" },
  { valor: "destaque", nome: "Destaque", ajuda: "Botão maior, para a ação principal" },
  { valor: "whatsapp", nome: "WhatsApp", ajuda: "Abre a conversa já com a mensagem escrita" },
  { valor: "titulo", nome: "Título", ajuda: "Divide a página em seções" },
  { valor: "texto", nome: "Texto", ajuda: "Um parágrafo curto, sem link" },
  { valor: "imagem", nome: "Imagem", ajuda: "Foto ou banner, clicável se tiver link" },
  { valor: "video", nome: "Vídeo", ajuda: "YouTube ou Vimeo, tocando na página" },
  { valor: "redes", nome: "Redes", ajuda: "Botão discreto para o perfil social" },
  { valor: "separador", nome: "Separador", ajuda: "Uma linha para dar respiro" },
];

/** Campos que cada tipo realmente usa. O resto fica escondido para não confundir. */
function camposDoTipo(tipo: string) {
  switch (tipo) {
    case "titulo":
    case "texto":
      return { titulo: true, subtitulo: false, url: false, imagem: false, whatsapp: false };
    case "separador":
      return { titulo: false, subtitulo: false, url: false, imagem: false, whatsapp: false };
    case "imagem":
      return { titulo: true, subtitulo: false, url: true, imagem: true, whatsapp: false };
    case "video":
      return { titulo: true, subtitulo: false, url: true, imagem: false, whatsapp: false };
    case "whatsapp":
      return { titulo: true, subtitulo: true, url: false, imagem: false, whatsapp: true };
    default:
      return { titulo: true, subtitulo: true, url: true, imagem: false, whatsapp: false };
  }
}

function paraInput(d: Date | null) {
  if (!d) return "";
  const iso = new Date(d).toISOString();
  return iso.slice(0, 16);
}

export default function EditorCards({ paginaId, corFundo, cards }: { paginaId: string; corFundo: string; cards: Card[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <div className={estilos.bloco}>
      <h2>
        Blocos da página
        <small>
          {cards.length} {cards.length === 1 ? "bloco" : "blocos"} · clique para editar
        </small>
      </h2>

      <div className={estilos.listaCards}>
        {cards.map((card, i) => {
          const usa = camposDoTipo(card.tipo);
          const estaAberto = aberto === card.id;
          const nomeTipo = TIPOS.find((t) => t.valor === card.tipo)?.nome ?? card.tipo;

          return (
            <div
              key={card.id}
              className={`${estilos.card} ${card.ativo ? "" : estilos.cardInativo}`}
            >
              <div className={estilos.cardTopo}>
                <span className={estilos.cardTipo}>{nomeTipo}</span>
                <button
                  type="button"
                  className={estilos.cardTitulo}
                  onClick={() => setAberto(estaAberto ? null : card.id)}
                  style={{ background: "none", border: 0, color: "inherit", textAlign: "left", cursor: "pointer", font: "inherit" }}
                >
                  {card.titulo || <em>sem texto</em>}
                </button>

                <div className={estilos.cardAcoes}>
                  <form action={moverCard.bind(null, card.id, "cima")}>
                    <button className={estilos.iconeBtn} disabled={i === 0} title="Subir" aria-label="Subir">↑</button>
                  </form>
                  <form action={moverCard.bind(null, card.id, "baixo")}>
                    <button className={estilos.iconeBtn} disabled={i === cards.length - 1} title="Descer" aria-label="Descer">↓</button>
                  </form>
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
                          <select id={`tipo-${card.id}`} name="tipo" defaultValue={card.tipo}>
                            {TIPOS.map((t) => (
                              <option key={t.valor} value={t.valor}>{t.nome}</option>
                            ))}
                          </select>
                          <span className={estilos.dica}>
                            {TIPOS.find((t) => t.valor === card.tipo)?.ajuda}
                          </span>
                        </div>

                        {usa.titulo && (
                          <div className={estilos.campo}>
                            <label htmlFor={`titulo-${card.id}`}>
                              {card.tipo === "texto" ? "Texto" : "Título"}
                            </label>
                            <input id={`titulo-${card.id}`} type="text" name="titulo" defaultValue={card.titulo ?? ""} />
                          </div>
                        )}
                      </div>

                      {usa.subtitulo && (
                        <div className={estilos.campo}>
                          <label htmlFor={`sub-${card.id}`}>Linha de apoio (opcional)</label>
                          <input id={`sub-${card.id}`} type="text" name="subtitulo" defaultValue={card.subtitulo ?? ""} />
                        </div>
                      )}

                      {usa.url && (
                        <div className={estilos.campo}>
                          <label htmlFor={`url-${card.id}`}>Endereço de destino</label>
                          <input id={`url-${card.id}`} type="url" name="url" defaultValue={card.url ?? ""} placeholder="https://" />
                        </div>
                      )}

                      {usa.imagem && (
                        <CampoImagem
                          alvo={{ tipo: "card", id: card.id }}
                          url={card.imagemUrl}
                          rotulo="Imagem"
                          dica="O título vira o texto alternativo."
                          fundo={corFundo}
                          tamanho={card.imagemTamanho}
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

                      <div className={estilos.doisCampos}>
                        <div className={estilos.campo}>
                          <label htmlFor={`pub-${card.id}`}>Aparecer a partir de (opcional)</label>
                          <input id={`pub-${card.id}`} type="datetime-local" name="publicarEm" defaultValue={paraInput(card.publicarEm)} />
                        </div>
                        <div className={estilos.campo}>
                          <label htmlFor={`desp-${card.id}`}>Sumir em (opcional)</label>
                          <input id={`desp-${card.id}`} type="datetime-local" name="despublicarEm" defaultValue={paraInput(card.despublicarEm)} />
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
