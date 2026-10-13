"use client";

import { useState } from "react";
import { LARGURAS, fracaoDaLargura } from "@/lib/tema";
import { salvarLarguraCard } from "../acoes";
import { naPrevia } from "./BarraAjuste";
import estilos from "../gestao.module.css";

/**
 * Largura do bloco na linha. Clicar já mexe na prévia (a célula do bloco lê
 * --fracao) e grava na hora, sem esperar o Salvar bloco.
 */
export default function EscolhaLargura({ cardId, largura }: { cardId: string; largura: string | null }) {
  const [atual, setAtual] = useState(largura ?? "inteira");
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(valor: string) {
    setAtual(valor);
    const celula = naPrevia(`[data-pl-bloco="${cardId}"]`);
    const fracao = fracaoDaLargura(valor);
    if (fracao === 1) celula?.style.removeProperty("--fracao");
    else celula?.style.setProperty("--fracao", String(fracao));
    setErro((await salvarLarguraCard(cardId, valor)).erro ?? null);
  }

  return (
    <div className={estilos.campo}>
      <span className={estilos.rotuloSolto}>Largura na linha</span>
      <div className={estilos.alternador} role="group" aria-label="Largura do bloco na linha">
        {LARGURAS.map((l) => (
          <button key={l.valor} type="button" aria-pressed={atual === l.valor} onClick={() => escolher(l.valor)}>
            {l.rotulo}
          </button>
        ))}
      </div>
      <span className={estilos.dica}>
        Blocos seguidos que somam uma linha ficam lado a lado: 1/2 + 1/2, 1/3 + 2/3, três de 1/3. Grava na hora.
      </span>
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
    </div>
  );
}
