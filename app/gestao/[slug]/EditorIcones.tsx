"use client";

import { useState } from "react";
import { REDES, REDE_POR_ID, redesNoTexto } from "@/lib/redes";
import type { ValoresTela } from "@/lib/ajustes";
import ControleAjuste from "./ControleAjuste";
import CorDosIcones from "./CorDosIcones";
import DesenhoRede from "../../[slug]/DesenhoRede";
import estilos from "../gestao.module.css";

type Icone = { id: string; rede: string; url: string };
type Linha = Icone & { chave: string };

/**
 * Os ícones de um bloco de redes, todos no mesmo formulário do bloco: cada
 * linha é um ícone (rede + link) e "Adicionar ícone" põe mais uma. Salvar o
 * bloco grava a lista inteira, na ordem da tela.
 *
 * Bloco sem ícone ainda: se o nome dele cita redes ("Instagram, WhatsApp", como
 * vieram do WordPress), as linhas já nascem sugeridas, faltando só o link.
 */
export default function EditorIcones({
  cardId,
  icones,
  titulo,
  valoresIcone,
  valoresVao,
  iconeCor,
  corTexto,
}: {
  cardId: string;
  icones: Icone[];
  titulo: string | null;
  /** tamanho dos ícones e espaço entre eles, por tela */
  valoresIcone: ValoresTela;
  valoresVao: ValoresTela;
  /** cor dos ícones gravada (null = cor do texto) e a cor do texto da página */
  iconeCor: string | null;
  corTexto: string;
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() =>
    icones.length
      ? icones.map((i) => ({ ...i, chave: i.id }))
      : redesNoTexto(titulo).map((rede) => ({ id: "", rede, url: "", chave: crypto.randomUUID() })),
  );
  const sugeridas = icones.length === 0 && linhas.length > 0;

  function mudar(chave: string, campo: "rede" | "url", valor: string) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  }

  function mover(indice: number, passo: -1 | 1) {
    setLinhas((atual) => {
      const nova = [...atual];
      [nova[indice], nova[indice + passo]] = [nova[indice + passo], nova[indice]];
      return nova;
    });
  }

  function adicionar() {
    // a próxima rede que ainda não está na lista, para não começar repetido
    const usadas = new Set(linhas.map((l) => l.rede));
    const rede = REDES.find((r) => !usadas.has(r.id))?.id ?? REDES[0].id;
    setLinhas((atual) => [...atual, { id: "", rede, url: "", chave: crypto.randomUUID() }]);
  }

  return (
    <div className={estilos.campo}>
      {/* marca que este formulário cuida dos ícones: lista vazia também é uma resposta */}
      <input type="hidden" name="icones" value="1" />
      <span className={estilos.rotuloSolto}>Ícones, lado a lado na página</span>
      {sugeridas && (
        <span className={estilos.dica}>
          Sugeridos a partir do nome do bloco. Cole o link de cada um e salve; o que não usar, remova.
        </span>
      )}

      <div className={estilos.listaIcones}>
        {linhas.map((linha, i) => {
          const rede = REDE_POR_ID[linha.rede] ?? REDES[0];
          return (
            <div key={linha.chave} className={estilos.iconeLinha}>
              <input type="hidden" name="iconeId" value={linha.id} />
              <span className={estilos.iconePrevia} title={rede.nome}>
                <DesenhoRede rede={rede} />
              </span>
              {/* sem value controlado: depois de salvar, o React 19 reseta o formulário e um
                  <select> controlado volta à primeira opção (todos viravam WhatsApp). Com key na
                  rede e defaultValue, cada troca recria a lista e o reset volta para a rede certa. */}
              <select
                key={linha.rede}
                name="iconeRede"
                defaultValue={linha.rede}
                onChange={(e) => mudar(linha.chave, "rede", e.target.value)}
                aria-label={`Rede do ícone ${i + 1}`}
              >
                {REDES.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
              <input
                type="text"
                name="iconeUrl"
                value={linha.url}
                onChange={(e) => mudar(linha.chave, "url", e.target.value)}
                placeholder={rede.exemplo}
                aria-label={`Link do ícone ${rede.nome}`}
                required
              />
              <div className={estilos.cardAcoes}>
                <button type="button" className={estilos.iconeBtn} disabled={i === 0} onClick={() => mover(i, -1)} title="Antes (mais à esquerda)" aria-label="Mover para a esquerda">↑</button>
                <button type="button" className={estilos.iconeBtn} disabled={i === linhas.length - 1} onClick={() => mover(i, 1)} title="Depois (mais à direita)" aria-label="Mover para a direita">↓</button>
                <button
                  type="button"
                  className={estilos.iconeBtn}
                  onClick={() => setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave))}
                  title="Remover ícone"
                  aria-label={`Remover ${rede.nome}`}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={adicionar}>
          + Adicionar ícone
        </button>
      </div>
      <span className={estilos.dica}>
        WhatsApp aceita só o número com DDD. E-mail e telefone abrem o app certo. A ordem aqui é a ordem na página.
      </span>

      <ControleAjuste alvo={{ tipo: "card", id: cardId }} chave="icone" valores={valoresIcone} rotulo="Tamanho dos ícones" />
      <ControleAjuste alvo={{ tipo: "card", id: cardId }} chave="vao" valores={valoresVao} rotulo="Espaço entre eles" />
      <CorDosIcones cardId={cardId} cor={iconeCor} corTexto={corTexto} />
      <span className={estilos.dica}>As barras e a cor gravam sozinhas; os ícones e os links, no Salvar bloco.</span>
    </div>
  );
}
