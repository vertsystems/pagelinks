"use client";

/* eslint-disable @next/next/no-img-element -- artes do cliente, já em WebP do Storage */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import estilos from "./pagina.module.css";

export type ItemDoCarrossel = { id: string; imagemUrl: string; destino: string | null; novaAba: boolean };

const MENOS_MOVIMENTO = "(prefers-reduced-motion: reduce)";
const assinarMovimento = (avisar: () => void) => {
  const consulta = matchMedia(MENOS_MOVIMENTO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
};

/** A imagem da vez: a de centro mais perto do centro do trilho. */
function daVez(t: HTMLElement) {
  const centro = t.scrollLeft + t.clientWidth / 2;
  let melhor = 0;
  let menor = Infinity;
  [...t.children].forEach((filho, i) => {
    const el = filho as HTMLElement;
    const distancia = Math.abs(el.offsetLeft + el.offsetWidth / 2 - centro);
    if (distancia < menor) [melhor, menor] = [i, distancia];
  });
  return melhor;
}

/** Centraliza a imagem i no trilho. */
function irPara(t: HTMLElement, i: number) {
  const el = t.children[i] as HTMLElement | undefined;
  if (!el) return;
  const suave = matchMedia(MENOS_MOVIMENTO).matches ? "auto" : "smooth";
  t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.offsetWidth) / 2, behavior: suave });
}

/**
 * Carrossel de imagens: a do meio inteira e as vizinhas aparecendo nas pontas (a largura
 * vem de --slide, por tela). É uma rolagem horizontal com encaixe (scroll-snap): o dedo
 * arrasta de graça, sem biblioteca. O JavaScript só faz passar sozinho e marcar a bolinha.
 *
 * Passa sozinho a cada `tempo` segundos e para enquanto: o mouse está em cima, o foco está
 * dentro, alguém acabou de arrastar, o carrossel está fora da tela ou a aba escondida.
 * Quem pede menos movimento no sistema não vê passar sozinho; e o botão de pausa
 * existe para todo mundo (movimento automático precisa poder parar).
 * Da última volta para a primeira.
 */
export default function Carrossel({ titulo, itens, tempo }: { titulo: string; itens: ItemDoCarrossel[]; tempo: number }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [pausadoPeloBotao, setPausadoPeloBotao] = useState<boolean | null>(null);
  const menosMovimento = useSyncExternalStore(assinarMovimento, () => matchMedia(MENOS_MOVIMENTO).matches, () => false);
  const parado = pausadoPeloBotao ?? menosMovimento;
  const emUso = useRef(false);
  const mexeuEm = useRef(0);
  const total = itens.length;

  // bolinha acompanha a rolagem (uma conta por quadro)
  useEffect(() => {
    const t = trilho.current;
    if (!t) return;
    let quadro = 0;
    const aoRolar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => setAtual(daVez(t)));
    };
    t.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      t.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(quadro);
    };
  }, []);

  // passar sozinho
  useEffect(() => {
    const t = trilho.current;
    if (!t || parado || total < 2) return;
    let naTela = true;
    const observar = new IntersectionObserver(([e]) => (naTela = e.isIntersecting));
    observar.observe(t);
    const relogio = setInterval(() => {
      if (!naTela || document.hidden || emUso.current || Date.now() - mexeuEm.current < tempo * 1000) return;
      irPara(t, (daVez(t) + 1) % total);
    }, tempo * 1000);
    return () => {
      clearInterval(relogio);
      observar.disconnect();
    };
  }, [parado, tempo, total]);

  const mexeu = () => {
    mexeuEm.current = Date.now();
  };

  return (
    <div className={estilos.carrossel} role="region" aria-roledescription="carrossel" aria-label={titulo}>
      <div
        ref={trilho}
        className={estilos.trilho}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") emUso.current = true;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") emUso.current = false;
        }}
        onPointerDown={mexeu}
        onWheel={mexeu}
        onFocus={() => {
          emUso.current = true;
        }}
        onBlur={() => {
          emUso.current = false;
        }}
      >
        {itens.map((item, i) => {
          const imagem = (
            <img
              src={item.imagemUrl}
              alt={`${titulo}: imagem ${i + 1} de ${total}`}
              loading={i < 2 ? "eager" : "lazy"}
              draggable={false}
            />
          );
          return (
            <div key={item.id} className={estilos.slide} role="group" aria-roledescription="imagem" aria-label={`${i + 1} de ${total}`}>
              {item.destino ? (
                <a href={item.destino} {...(item.novaAba ? { target: "_blank", rel: "noopener" } : {})}>
                  {imagem}
                </a>
              ) : (
                imagem
              )}
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <div className={estilos.controles}>
          <button
            type="button"
            className={estilos.pausar}
            onClick={() => setPausadoPeloBotao(!parado)}
            aria-label={parado ? "Fazer o carrossel passar sozinho" : "Parar o carrossel"}
            title={parado ? "Passar sozinho" : "Parar"}
          >
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" fill="currentColor">
              {parado ? <path d="M3 1.5v9l7.5-4.5z" /> : <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />}
            </svg>
          </button>
          {itens.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={estilos.bolinha}
              aria-label={`Ver a imagem ${i + 1} de ${total}`}
              aria-current={i === atual ? "true" : undefined}
              onClick={() => {
                mexeu();
                if (trilho.current) irPara(trilho.current, i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
