"use client";

import { useRef, useState } from "react";
import { corDosIconesValida } from "@/lib/redes";
import { salvarCorIcones } from "../acoes";
import { retocarPrevia } from "./BarraAjuste";
import estilos from "../gestao.module.css";

/**
 * Cor dos ícones de um bloco de redes: a cor do texto da página (padrão), a cor de
 * cada marca, ou uma cor só para todos. Mexe na prévia na hora e grava sozinho; a cor
 * escolhida no seletor espera ele parar (meio segundo) para gravar.
 */
export default function CorDosIcones({ cardId, cor: inicial, corTexto }: { cardId: string; cor: string | null; corTexto: string }) {
  const [cor, setCor] = useState(inicial);
  const [personalizada, setPersonalizada] = useState(inicial?.startsWith("#") ? inicial : corTexto.toUpperCase());
  const [digitada, setDigitada] = useState(personalizada);
  const [erro, setErro] = useState<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modo = cor === null ? "texto" : cor === "marcas" ? "marcas" : "uma";

  function aplicar(valor: string | null) {
    retocarPrevia(`cor dos ícones ${cardId}`, `[data-pl-bloco="${cardId}"] nav`, (fileira) => {
      if (valor === "marcas") fileira.dataset.cor = "marcas";
      else delete fileira.dataset.cor;
      if (valor?.startsWith("#")) fileira.style.color = valor;
      else fileira.style.removeProperty("color");
    });
  }

  function escolher(valor: string | null, esperar = false) {
    if (!corDosIconesValida(valor)) return;
    setCor(valor);
    aplicar(valor);
    if (espera.current) clearTimeout(espera.current);
    const gravar = async () => setErro((await salvarCorIcones(cardId, valor)).erro ?? null);
    if (esperar) espera.current = setTimeout(gravar, 500);
    else gravar();
  }

  function mudarPersonalizada(valor: string) {
    const hex = valor.toUpperCase();
    setDigitada(hex);
    if (!/^#[0-9A-F]{6}$/.test(hex)) return;
    setPersonalizada(hex);
    escolher(hex, true);
  }

  return (
    <div className={estilos.campo}>
      <span className={estilos.rotuloSolto}>Cor dos ícones</span>
      <div className={estilos.tamanho}>
        <div className={estilos.alternador} role="group" aria-label="Cor dos ícones">
          <button type="button" aria-pressed={modo === "texto"} onClick={() => escolher(null)}>
            Cor do texto
          </button>
          <button type="button" aria-pressed={modo === "marcas"} onClick={() => escolher("marcas")}>
            Cores das marcas
          </button>
          <button type="button" aria-pressed={modo === "uma"} onClick={() => escolher(personalizada)}>
            Uma cor
          </button>
        </div>
        {modo === "uma" && (
          <span className={estilos.cor}>
            <input
              type="color"
              value={personalizada}
              onChange={(e) => mudarPersonalizada(e.target.value)}
              aria-label="Escolher a cor dos ícones"
            />
            <input
              type="text"
              value={digitada}
              onChange={(e) => mudarPersonalizada(e.target.value)}
              aria-label="Código da cor dos ícones"
              maxLength={7}
              style={{ width: 100 }}
            />
          </span>
        )}
      </div>
      {modo === "marcas" && (
        <span className={estilos.dica}>
          TikTok, X, Threads e os ícones de site, e-mail, telefone e localização ficam na cor do texto: a marca deles é
          preto e branco.
        </span>
      )}
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
    </div>
  );
}
