"use client";

import { useState } from "react";
import { COOKIE_TEMA, type TemaPainel } from "@/lib/tema-painel";
import estilos from "./gestao.module.css";

/**
 * Alterna claro/escuro na hora, sem recarregar: troca o data-tema do invólucro
 * da tela e grava o cookie, que o servidor lê nas próximas páginas.
 */
export default function BotaoTema({ inicial }: { inicial: TemaPainel }) {
  const [tema, setTema] = useState(inicial);
  const proximo: TemaPainel = tema === "claro" ? "escuro" : "claro";
  const rotulo = proximo === "escuro" ? "Usar o modo escuro" : "Usar o modo claro";

  function alternar(evento: React.MouseEvent<HTMLButtonElement>) {
    document.cookie = `${COOKIE_TEMA}=${proximo}; path=/; max-age=31536000; samesite=lax`;
    evento.currentTarget.closest("[data-tema]")?.setAttribute("data-tema", proximo);
    setTema(proximo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnIcone}`}
      aria-label={rotulo}
      title={rotulo}
    >
      {proximo === "escuro" ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
