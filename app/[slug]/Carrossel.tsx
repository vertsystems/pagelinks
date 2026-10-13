"use client";

/* eslint-disable @next/next/no-img-element -- artes do cliente, já em WebP do Storage */

import { useState } from "react";
import estilos from "./pagina.module.css";

export type ItemDoCarrossel = { id: string; imagemUrl: string; destino: string | null; novaAba: boolean };

/**
 * Com poucas imagens, a volta repete o conjunto até ter pelo menos 3: uma volta precisa
 * passar da largura do carrossel (3 imagens na largura mínima, 40%, já passam), senão
 * abria um buraco antes de a primeira voltar.
 */
const MINIMO_NA_VOLTA = 3;

/**
 * Carrossel em esteira: as imagens deslizam sem parar e voltam à primeira sem emenda
 * (a conta está no pagina.module.css, "Carrossel (esteira)"). Aqui só se monta a esteira,
 * a volta duas vezes, e o botão de pausa. As cópias são só visuais: aria-hidden e fora do
 * Tab, para leitor de tela e teclado verem cada imagem uma vez.
 */
export default function Carrossel({ titulo, itens, tempo }: { titulo: string; itens: ItemDoCarrossel[]; tempo: number }) {
  const [parado, setParado] = useState(false);
  const volta = Array.from({ length: Math.ceil(MINIMO_NA_VOLTA / itens.length) }, () => itens).flat();
  const esteira = [...volta, ...volta];

  return (
    <div
      className={estilos.carrossel}
      role="region"
      aria-roledescription="carrossel"
      aria-label={titulo}
      data-parado={parado || undefined}
      style={{ "--n": volta.length, "--tempo": tempo } as React.CSSProperties}
    >
      <div className={estilos.janela}>
        <div className={estilos.trilho}>
          {esteira.map((item, i) => {
            const copia = i >= itens.length;
            const imagem = (
              <img src={item.imagemUrl} alt={copia ? "" : `${titulo}: imagem ${i + 1} de ${itens.length}`} draggable={false} />
            );
            return (
              <div key={i} className={estilos.slide} aria-hidden={copia || undefined} data-copia={copia || undefined}>
                {item.destino ? (
                  <a href={item.destino} tabIndex={copia ? -1 : undefined} {...(item.novaAba ? { target: "_blank", rel: "noopener" } : {})}>
                    {imagem}
                  </a>
                ) : (
                  imagem
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className={estilos.controles}>
        <button
          type="button"
          className={estilos.pausar}
          onClick={() => setParado(!parado)}
          aria-label={parado ? "Fazer o carrossel deslizar" : "Parar o carrossel"}
          title={parado ? "Deslizar" : "Parar"}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" fill="currentColor">
            {parado ? <path d="M3 1.5v9l7.5-4.5z" /> : <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
