"use client";

import { useState } from "react";
import { ANIMACOES, animacaoValida, type Animacao } from "@/lib/animacoes";
import { salvarAnimacao } from "../acoes";
import { retocarPrevia } from "./BarraAjuste";
import estilos from "../gestao.module.css";

/**
 * Animação do bloco: nenhuma, reflexo, pulsar ou tremida. Mexe na prévia na hora (o atributo
 * data-animacao da célula, que o CSS da página lê) e grava sozinho, como o formato da foto.
 */
export default function EscolhaAnimacao({ cardId, animacao: inicial }: { cardId: string; animacao: string | null }) {
  const [animacao, setAnimacao] = useState<Animacao | null>(animacaoValida(inicial));
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(valor: Animacao | null) {
    const antes = animacao;
    setAnimacao(valor);
    const aplicar = (celula: HTMLElement) => {
      if (valor) celula.dataset.animacao = valor;
      else delete celula.dataset.animacao;
    };
    retocarPrevia(`animacao ${cardId}`, `[data-pl-bloco="${cardId}"]`, aplicar);
    const resposta = await salvarAnimacao(cardId, valor).catch(() => ({ erro: "Não consegui gravar a animação." }));
    if (resposta.erro) {
      setErro(resposta.erro);
      setAnimacao(antes);
    } else setErro(null);
  }

  const atual = ANIMACOES.find((a) => a.valor === animacao);
  return (
    <div className={estilos.campo}>
      <div className={estilos.tamanho}>
        <span>Animação</span>
        <div className={estilos.alternador} role="group" aria-label="Animação do bloco">
          <button type="button" aria-pressed={animacao === null} onClick={() => escolher(null)}>
            Nenhuma
          </button>
          {ANIMACOES.map((a) => (
            <button key={a.valor} type="button" aria-pressed={animacao === a.valor} onClick={() => escolher(a.valor)} title={a.ajuda}>
              {a.nome}
            </button>
          ))}
        </div>
      </div>
      <span className={estilos.dica}>
        {atual ? `${atual.nome}: ${atual.ajuda}. ` : ""}Grava sozinho. Quem pede menos movimento no celular vê o bloco parado.
      </span>
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
    </div>
  );
}
