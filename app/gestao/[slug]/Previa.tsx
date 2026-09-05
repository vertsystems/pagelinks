"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "../gestao.module.css";

/**
 * Prévia ao vivo da página do cliente.
 * Recarrega sozinha sempre que `versao` muda — que é o timestamp de atualização
 * vindo do banco. Assim, salvar qualquer coisa reflete aqui sem apertar nada.
 */
export default function Previa({ slug, versao }: { slug: string; versao: string }) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const [largura, setLargura] = useState<"celular" | "cheia">("celular");

  useEffect(() => {
    if (quadro.current) quadro.current.src = `/${slug}?previa=${Date.now()}`;
  }, [slug, versao]);

  return (
    <div className={estilos.previa}>
      <div className={estilos.previaBarra}>
        <span>dnms.fun/{slug}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`}
            onClick={() => setLargura(largura === "celular" ? "cheia" : "celular")}
          >
            {largura === "celular" ? "Largura cheia" : "Celular"}
          </button>
          <a
            className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`}
            href={`/${slug}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir ↗
          </a>
        </div>
      </div>
      <div
        className={estilos.previaMoldura}
        style={{ maxWidth: largura === "celular" ? 380 : "100%", marginInline: "auto" }}
      >
        <iframe ref={quadro} src={`/${slug}`} title={`Prévia de ${slug}`} />
      </div>
    </div>
  );
}
