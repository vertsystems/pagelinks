"use client";

import { useEffect, useRef, useState } from "react";
import type { Faixa } from "@/lib/ajustes";
import estilos from "../gestao.module.css";

export type { Faixa };

/**
 * Barra de ajuste do editor (tamanho de imagem, de ícone, espaço). Arrastar chama
 * `aoMover` na hora, para a prévia mudar ao vivo, e `aoGravar` meio segundo depois
 * que a barra para: não grava a cada pixel.
 *
 * `voltar` é o link que tira o valor próprio da tela: no celular volta ao padrão, no
 * tablet e no computador volta a seguir a tela menor. Aparece quando a tela tem valor
 * próprio. `nota` diz de onde vem o valor quando não é próprio ("segue o celular").
 *
 * Se a barra sai da tela com gravação pendente (troca de tela, saída do editor),
 * grava na hora: senão, quem mexe e troca de tela em menos de meio segundo perde a mudança.
 */
export default function BarraAjuste({
  rotulo,
  nomeAcessivel,
  valor: inicial,
  faixa,
  proprio: proprioInicial,
  nota,
  aoMover,
  aoGravar,
  voltar,
}: {
  rotulo: string;
  /** quando o rótulo sozinho não diz de quê ("Tamanho" de qual imagem) */
  nomeAcessivel?: string;
  valor: number;
  faixa: Faixa;
  proprio: boolean;
  nota?: string;
  aoMover: (valor: number) => void;
  aoGravar: (valor: number) => void;
  voltar: { rotulo: string; valor: number; aoVoltar: () => void };
}) {
  const [valor, setValor] = useState(inicial);
  const [proprio, setProprio] = useState(proprioInicial);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<number | null>(null);
  const gravarAoSair = useRef(aoGravar);

  useEffect(() => {
    gravarAoSair.current = aoGravar;
  });

  useEffect(
    () => () => {
      if (espera.current) clearTimeout(espera.current);
      if (pendente.current !== null) gravarAoSair.current(pendente.current);
    },
    [],
  );

  function mudar(novo: number) {
    setValor(novo);
    setProprio(true);
    aoMover(novo);
    pendente.current = novo;
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      pendente.current = null;
      aoGravar(novo);
    }, 500);
  }

  function voltarAgora() {
    pendente.current = null;
    if (espera.current) clearTimeout(espera.current);
    setValor(voltar.valor);
    setProprio(false);
    voltar.aoVoltar();
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
      <output>{valor}{faixa.unidade === "%" ? "%" : faixa.unidade === "px" ? " px" : ""}</output>
      {proprio ? (
        <button type="button" className={estilos.tamanhoPadrao} onClick={voltarAgora}>
          {voltar.rotulo}
        </button>
      ) : (
        nota && <span className={estilos.notaTela}>{nota}</span>
      )}
    </div>
  );
}

/** Elemento marcado na prévia (iframe da mesma origem), para o ajuste ao vivo. */
export function naPrevia(seletor: string) {
  const quadro = document.querySelector<HTMLIFrameElement>("iframe[data-previa]");
  return quadro?.contentDocument?.querySelector<HTMLElement>(seletor) ?? null;
}

/**
 * Retoques ao vivo: o que o editor mudou direto na prévia (tamanho, espaço, cor, formato
 * da foto). Cada um fica guardado pela chave (o último vence) e é refeito na prévia nova
 * antes de ela aparecer (ver Previa.tsx): a recarga de uma gravação chega segundos
 * depois, e sem isso trazia de volta o valor de antes de quem continuou mexendo.
 * A prévia esquece tudo quando sai da tela (outro cliente, outro editor).
 */
const retoques = new Map<string, { seletor: string; aplicar: (elemento: HTMLElement) => void }>();

export function retocarPrevia(chave: string, seletor: string, aplicar: (elemento: HTMLElement) => void) {
  retoques.set(chave, { seletor, aplicar });
  const elemento = naPrevia(seletor);
  if (elemento) aplicar(elemento);
}

export function refazerRetoques(documento: Document) {
  for (const { seletor, aplicar } of retoques.values()) {
    const elemento = documento.querySelector<HTMLElement>(seletor);
    if (elemento) aplicar(elemento);
  }
}

export function esquecerRetoques() {
  retoques.clear();
}
