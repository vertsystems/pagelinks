"use client";

import { useState } from "react";
import { valorCss, valorNaTela, variavelDaLinha, type Tela, type ValoresTela } from "@/lib/ajustes";
import { LARGURAS } from "@/lib/tema";
import { salvarAjuste } from "../acoes";
import { naPrevia } from "./BarraAjuste";
import { nomeDaTela, useTela } from "./Tela";
import estilos from "../gestao.module.css";

/**
 * Largura do bloco na linha, na tela que está sendo editada. Clicar já mexe na prévia
 * (a variável de largura dessa tela na célula do bloco) e grava na hora.
 */
export default function EscolhaLargura({ cardId, valores }: { cardId: string; valores: ValoresTela }) {
  const { tela } = useTela();
  // o que já foi gravado nesta sessão vale por cima do servidor (ver ControleAjuste)
  const [locais, setLocais] = useState<Partial<ValoresTela>>({});
  return (
    <EscolhaNaTela
      key={tela}
      cardId={cardId}
      valores={{ ...valores, ...locais }}
      aoGravar={(naTela, valor) => setLocais((atual) => ({ ...atual, [naTela]: valor }))}
    />
  );
}

function EscolhaNaTela({
  cardId,
  valores,
  aoGravar,
}: {
  cardId: string;
  valores: ValoresTela;
  aoGravar: (tela: Tela, valor: string | null) => void;
}) {
  const { tela } = useTela();
  const inicio = valorNaTela(valores, "largura", tela);
  const [atual, setAtual] = useState(String(inicio.valor));
  const [proprio, setProprio] = useState(inicio.proprio);
  const [erro, setErro] = useState<string | null>(null);
  const variavel = variavelDaLinha(tela);

  // Na prévia, mostra na hora a fração escolhida; quem divide a linha com quem (3/4 + 3/4
  // vira metade e metade) sai certo quando a prévia recarrega, logo depois de gravar.
  async function gravar(valor: string | null) {
    const celula = naPrevia(`[data-pl-bloco="${cardId}"]`);
    celula?.style.setProperty(variavel, valorCss("largura", valor ?? inicio.seguiria.valor));
    aoGravar(tela, valor);
    setErro((await salvarAjuste({ tipo: "card", id: cardId }, "largura", tela, valor)).erro ?? null);
  }

  const seguiria = inicio.seguiria;

  return (
    <div className={estilos.campo}>
      <span className={estilos.rotuloSolto}>Largura na linha {tela !== "celular" && `(no ${nomeDaTela(tela)})`}</span>
      <div className={estilos.tamanho}>
        <div className={estilos.alternador} role="group" aria-label="Largura do bloco na linha">
          {LARGURAS.map((l) => (
            <button
              key={l.valor}
              type="button"
              aria-pressed={atual === l.valor}
              onClick={() => {
                setAtual(l.valor);
                setProprio(true);
                gravar(l.valor);
              }}
            >
              {l.rotulo}
            </button>
          ))}
        </div>
        {tela !== "celular" &&
          (proprio ? (
            <button
              type="button"
              className={estilos.tamanhoPadrao}
              onClick={() => {
                setAtual(String(seguiria.valor));
                setProprio(false);
                gravar(null);
              }}
            >
              {seguiria.de ? `seguir o ${nomeDaTela(seguiria.de)}` : "voltar ao padrão"}
            </button>
          ) : (
            <span className={estilos.notaTela}>{seguiria.de ? `segue o ${nomeDaTela(seguiria.de)}` : "padrão"}</span>
          ))}
      </div>
      <span className={estilos.dica}>
        Blocos seguidos que não são inteiros ficam lado a lado, pelo menos dois por linha. Se passarem da linha, dividem
        na mesma proporção: 3/4 + 3/4 vira metade e metade. Grava na hora.
      </span>
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
    </div>
  );
}
