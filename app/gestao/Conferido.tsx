"use client";

import { useState } from "react";
import { marcarConferido } from "./acoes";
import estilos from "./gestao.module.css";

/**
 * Bolinha de revisão do cliente: amarela = falta algo para atualizar, verde (com ✓) =
 * página conferida. Um clique alterna e grava na hora; se a gravação falhar, volta.
 */
export default function Conferido({ clienteId, nome, conferido: inicial }: { clienteId: string; nome: string; conferido: boolean }) {
  const [conferido, setConferido] = useState(inicial);
  const [gravando, setGravando] = useState(false);

  async function alternar() {
    const novo = !conferido;
    setConferido(novo);
    setGravando(true);
    const resposta = await marcarConferido(clienteId, novo);
    if (resposta.erro) setConferido(!novo);
    setGravando(false);
  }

  return (
    <button
      type="button"
      className={estilos.conferido}
      aria-pressed={conferido}
      aria-label={`${nome}: ${conferido ? "conferido" : "pendente"}`}
      title={conferido ? "Conferido. Clique para voltar a pendente" : "Pendente. Clique quando estiver tudo certo"}
      onClick={alternar}
      disabled={gravando}
    >
      <span className={conferido ? estilos.conferidoOk : estilos.conferidoPendente}>
        {conferido && (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
    </button>
  );
}
