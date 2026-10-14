"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import estilos from "../gestao.module.css";

/** Mede tudo de novo sem recarregar a página (a página é dinâmica: o servidor refaz as medições). */
export default function BotaoMedir() {
  const router = useRouter();
  const [medindo, iniciar] = useTransition();
  return (
    <button
      type="button"
      className={`${estilos.btn} ${estilos.btnFantasma}`}
      onClick={() => iniciar(() => router.refresh())}
      disabled={medindo}
      aria-live="polite"
    >
      {medindo ? "Medindo…" : "Medir de novo"}
    </button>
  );
}
