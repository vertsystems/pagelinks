"use client";

/* eslint-disable @next/next/no-img-element -- a capa vem do YouTube ou do Vimeo, não do nosso Storage */

import { useState } from "react";
import estilos from "./pagina.module.css";

/**
 * Vídeo com capa (pedido do Bruno, 21/10/2026): antes do play, só a imagem do vídeo e um play
 * cinza-claro translúcido, sem o nome do canal, o título e o botão vermelho do YouTube. O player
 * só carrega quando a pessoa aperta o play, e entra já tocando (a página fica mais leve até lá).
 * Depois disso, os controles são os do próprio serviço.
 */
export default function VideoComCapa({ player, capa, reserva, titulo }: { player: string; capa: string; reserva?: string; titulo: string }) {
  const [tocando, setTocando] = useState(false);
  const [imagem, setImagem] = useState(capa);
  // a capa grande do YouTube nem todo vídeo tem: no lugar dela vem uma cinza de 120 px, ou um erro
  const trocarPelaReserva = () => reserva && imagem !== reserva && setImagem(reserva);

  if (tocando) {
    return (
      <iframe
        src={player}
        title={titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }
  return (
    <button type="button" className={estilos.videoCapa} onClick={() => setTocando(true)} aria-label={`Assistir: ${titulo}`}>
      <img
        src={imagem}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={(e) => e.currentTarget.naturalWidth <= 120 && trocarPelaReserva()}
        onError={trocarPelaReserva}
      />
      <span className={estilos.videoPlay} aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
      </span>
    </button>
  );
}
