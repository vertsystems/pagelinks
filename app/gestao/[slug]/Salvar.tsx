"use client";

import { useFormStatus } from "react-dom";
import estilos from "../gestao.module.css";

export function BotaoSalvar({ rotulo = "Salvar" }: { rotulo?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={estilos.btn} type="submit" disabled={pending}>
      {pending ? "Salvando…" : rotulo}
    </button>
  );
}
