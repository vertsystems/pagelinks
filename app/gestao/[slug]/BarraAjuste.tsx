"use client";

import { useRef, useState } from "react";
import estilos from "../gestao.module.css";

export type Faixa = { min: number; max: number; passo: number; padrao: number; unidade: "px" | "%" };

/**
 * Barra de ajuste do editor (tamanho de imagem, de ícone, espaço). Arrastar chama
 * `aoMover` na hora, para a prévia mudar ao vivo, e `aoGravar` meio segundo depois
 * que a barra para: não grava a cada pixel.
 */
export default function BarraAjuste({
  rotulo,
  nomeAcessivel,
  valor: inicial,
  faixa,
  aoMover,
  aoGravar,
}: {
  rotulo: string;
  /** quando o rótulo sozinho não diz de quê ("Tamanho" de qual imagem) */
  nomeAcessivel?: string;
  valor: number | null;
  faixa: Faixa;
  aoMover: (valor: number) => void;
  aoGravar: (valor: number) => void;
}) {
  const [valor, setValor] = useState(inicial ?? faixa.padrao);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  function mudar(novo: number) {
    setValor(novo);
    aoMover(novo);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => aoGravar(novo), 500);
  }

  return (
    <div className={estilos.tamanho}>
      <span>{rotulo}</span>
      <input
        type="range"
        min={faixa.min}
        max={faixa.max}
        step={faixa.passo}
        value={valor}
        onChange={(e) => mudar(Number(e.target.value))}
        aria-label={nomeAcessivel ?? rotulo}
      />
      <output>{valor}{faixa.unidade === "%" ? "%" : " px"}</output>
      {valor !== faixa.padrao && (
        <button type="button" className={estilos.tamanhoPadrao} onClick={() => mudar(faixa.padrao)}>
          voltar ao padrão
        </button>
      )}
    </div>
  );
}

/** Elemento marcado na prévia (iframe da mesma origem), para o ajuste ao vivo. */
export function naPrevia(seletor: string) {
  const quadro = document.querySelector<HTMLIFrameElement>("iframe[data-previa]");
  return quadro?.contentDocument?.querySelector<HTMLElement>(seletor) ?? null;
}
