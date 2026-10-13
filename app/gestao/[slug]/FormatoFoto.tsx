"use client";

import { useState } from "react";
import { salvarFormatoFoto } from "../acoes";
import { retocarPrevia } from "./BarraAjuste";
import estilos from "../gestao.module.css";

/**
 * Formato da foto do topo: redonda (com a borda na cor dos botões) ou sem cortar,
 * para logo que não é quadrado (com nome escrito, largo ou comprido). Mexe na prévia
 * na hora e grava sozinho.
 */
export default function FormatoFoto({ paginaId, formato: inicial }: { paginaId: string; formato: string | null }) {
  const [formato, setFormato] = useState(inicial === "livre" ? "livre" : "redonda");
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(valor: "redonda" | "livre") {
    setFormato(valor);
    retocarPrevia("formato da foto", "[data-pl-avatar]", (foto) => {
      if (valor === "livre") foto.dataset.formato = "livre";
      else delete foto.dataset.formato;
    });
    setErro((await salvarFormatoFoto(paginaId, valor)).erro ?? null);
  }

  return (
    <div className={estilos.tamanho}>
      <span>Formato</span>
      <div className={estilos.alternador} role="group" aria-label="Formato da foto do topo">
        <button type="button" aria-pressed={formato === "redonda"} onClick={() => escolher("redonda")}>
          Redonda
        </button>
        <button type="button" aria-pressed={formato === "livre"} onClick={() => escolher("livre")}>
          Sem cortar
        </button>
      </div>
      {formato === "livre" && <span className={estilos.notaTela}>o tamanho vira a largura do logo</span>}
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
    </div>
  );
}
