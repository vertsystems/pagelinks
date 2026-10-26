"use client";

import { useRef, useState } from "react";
import { CapaDoVideo, PlayerDoVideo } from "./VideoComCapa";
import estilos from "./pagina.module.css";

export type VideoDaGaleria = {
  /** o player como está, para o vídeo sem capa */
  player: string;
  /** o player já tocando, para quando a capa é apertada */
  tocar: string;
  capa: string | null;
  reserva?: string;
};

/**
 * Vários vídeos no mesmo bloco (pedido do Bruno, 21/10/2026): passam para o lado, um por vez, com
 * o dedo no celular e pelas setas ou bolinhas embaixo. O encaixe é do próprio navegador (scroll-snap,
 * pagina.module.css); aqui só se sabe qual está à vista. Trocou de vídeo, o que tocava volta à capa
 * e para: dois tocando ao mesmo tempo, um fora da tela, não faz sentido. A largura e o formato
 * (deitado ou em pé) vêm do bloco em volta, o .videoBloco da página.
 */
export default function VideoGaleria({ videos, titulo }: { videos: VideoDaGaleria[]; titulo: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const [tocando, setTocando] = useState<number | null>(null);
  const total = videos.length;

  // qual está à vista: o que tem o começo mais perto do ponto onde o trilho está
  function aoRolar() {
    const el = trilho.current;
    if (!el) return;
    const slides = [...el.children] as HTMLElement[];
    let perto = 0;
    slides.forEach((s, i) => {
      if (Math.abs(s.offsetLeft - el.scrollLeft) < Math.abs(slides[perto].offsetLeft - el.scrollLeft)) perto = i;
    });
    if (perto !== atual) {
      setAtual(perto);
      if (tocando !== null && tocando !== perto) setTocando(null);
    }
  }

  function ir(i: number) {
    const el = trilho.current;
    const alvo = el?.children[i] as HTMLElement | undefined;
    if (!el || !alvo) return;
    const suave = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    el.scrollTo({ left: alvo.offsetLeft, behavior: suave });
  }

  return (
    <div className={estilos.videoGaleria} role="group" aria-roledescription="galeria de vídeos" aria-label={titulo}>
      <div ref={trilho} className={estilos.videoTrilho} onScroll={aoRolar}>
        {videos.map((v, i) => {
          const nome = `${titulo}, vídeo ${i + 1} de ${total}`;
          return (
            <div key={i} className={estilos.video} role="group" aria-roledescription="vídeo" aria-label={`${i + 1} de ${total}`}>
              {v.capa && tocando !== i ? (
                <CapaDoVideo capa={v.capa} reserva={v.reserva} rotulo={`Assistir: ${nome}`} aoTocar={() => setTocando(i)} />
              ) : (
                <PlayerDoVideo src={v.capa ? v.tocar : v.player} titulo={nome} adiado={!v.capa} />
              )}
            </div>
          );
        })}
      </div>
      <div className={estilos.videoNavegar}>
        <button type="button" className={estilos.videoSeta} onClick={() => ir(atual - 1)} disabled={atual === 0} aria-label="Vídeo anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        {videos.map((_, i) => (
          <button key={i} type="button" className={estilos.videoPonto} onClick={() => ir(i)} aria-label={`Ir para o vídeo ${i + 1} de ${total}`} aria-current={i === atual ? "true" : undefined} />
        ))}
        <button type="button" className={estilos.videoSeta} onClick={() => ir(atual + 1)} disabled={atual === total - 1} aria-label="Próximo vídeo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  );
}
