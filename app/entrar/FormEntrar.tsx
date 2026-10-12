"use client";

import { useActionState } from "react";
import { entrar, type EstadoEntrar } from "./acoes";
import estilos from "../gestao/gestao.module.css";

export default function FormEntrar({ destino }: { destino: string }) {
  const [estado, acao, enviando] = useActionState<EstadoEntrar, FormData>(entrar, {});

  return (
    <form action={acao} className={estilos.bloco}>
      {estado?.erro && <p className={estilos.erro}>{estado.erro}</p>}
      <input type="hidden" name="destino" value={destino} />
      <div className={estilos.campos}>
        <div className={estilos.campo}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="username"
            defaultValue={estado?.email}
          />
        </div>
        <div className={estilos.campo}>
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" name="senha" required autoComplete="current-password" />
        </div>
      </div>
      <div className={estilos.salvarBarra}>
        <button className={estilos.btn} type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </form>
  );
}
