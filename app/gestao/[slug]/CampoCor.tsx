"use client";

import { useState } from "react";
import estilos from "../gestao.module.css";

/** Seletor de cor com o hex ao lado, os dois sincronizados. */
export default function CampoCor({
  nome,
  rotulo,
  valor,
}: {
  nome: string;
  rotulo: string;
  valor: string;
}) {
  const [cor, setCor] = useState(valor);
  const valida = /^#[0-9a-fA-F]{6}$/.test(cor);

  return (
    <div className={estilos.campo}>
      <label htmlFor={`cor-${nome}`}>{rotulo}</label>
      <div className={estilos.cor}>
        <input
          id={`cor-${nome}`}
          type="color"
          value={valida ? cor : "#000000"}
          onChange={(e) => setCor(e.target.value.toUpperCase())}
          aria-label={`${rotulo}, seletor visual`}
        />
        <input
          type="text"
          name={nome}
          value={cor}
          onChange={(e) => setCor(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
