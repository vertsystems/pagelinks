"use client";

import { useEffect, useState } from "react";
import {
  FONTES_DO_TEXTO,
  FORMATOS,
  GRUPOS_DE_FONTE,
  corValida,
  estiloDoTexto,
  fonteDoTexto,
  lerFormato,
  urlDaFonteDoTexto,
  type Formato,
} from "@/lib/fontes";
import { naPrevia } from "./BarraAjuste";
import estilos from "../gestao.module.css";

/** Põe a <link> da fonte no documento (o do painel ou o da prévia), uma vez só. */
function carregarFonte(documento: Document, nome: string) {
  const fonte = fonteDoTexto(nome);
  if (!fonte || documento.querySelector(`link[data-fonte="${CSS.escape(nome)}"]`)) return;
  const link = documento.createElement("link");
  link.rel = "stylesheet";
  link.href = urlDaFonteDoTexto(fonte);
  link.dataset.fonte = nome;
  documento.head.appendChild(link);
}

/**
 * Fonte, cor e formato (negrito, itálico, sublinhado, riscado) de um bloco de título ou de
 * texto. Gravam no "Salvar bloco", pelos campos name="fonte", "corTexto" e "formato"; o que
 * muda aparece na hora na prévia (sem guardar como retoque: o que não foi salvo some
 * quando a prévia recarrega, e é o certo, porque não está gravado).
 * O componente tem key nos valores gravados (EditorCards): depois de salvar, recomeça
 * deles, e o reset do formulário do React 19 não deixa a lista numa fonte antiga.
 */
export default function EstiloDoTexto({
  cardId,
  tipo,
  fonte: fonteInicial,
  cor: corInicial,
  formato: formatoInicial,
  corDaPagina,
}: {
  cardId: string;
  tipo: string;
  fonte: string | null;
  cor: string | null;
  formato: string | null;
  corDaPagina: string;
}) {
  const [fonte, setFonte] = useState(fonteDoTexto(fonteInicial)?.nome ?? "");
  const [cor, setCor] = useState<string | null>(corValida(corInicial));
  const [digitada, setDigitada] = useState(corValida(corInicial) ?? "");
  const [formato, setFormato] = useState<Formato[]>(lerFormato(formatoInicial, tipo));

  useEffect(() => {
    const elemento = naPrevia(`[data-pl-bloco="${cardId}"] > p`);
    if (!elemento) return;
    if (fonte) carregarFonte(elemento.ownerDocument, fonte);
    const e = estiloDoTexto(fonte || null, cor, formato);
    elemento.style.fontFamily = e.fontFamily ?? "";
    elemento.style.color = e.color ?? "";
    elemento.style.opacity = e.opacity ? String(e.opacity) : "";
    elemento.style.fontWeight = String(e.fontWeight);
    elemento.style.fontStyle = e.fontStyle ?? "";
    elemento.style.textDecorationLine = e.textDecorationLine ?? "";
  }, [cardId, fonte, cor, formato]);

  function escolherCor(valor: string) {
    setDigitada(valor);
    if (corValida(valor)) setCor(valor.toUpperCase());
  }

  function alternar(marca: Formato) {
    setFormato((atual) => (atual.includes(marca) ? atual.filter((m) => m !== marca) : FORMATOS.map((f) => f.valor).filter((v) => v === marca || atual.includes(v))));
  }

  return (
    <div className={estilos.estiloTexto}>
      <div className={estilos.campo}>
        <label htmlFor={`fonte-${cardId}`}>Fonte</label>
        <select id={`fonte-${cardId}`} name="fonte" value={fonte} onChange={(e) => setFonte(e.target.value)}>
          <option value="">A fonte da página</option>
          {GRUPOS_DE_FONTE.map((grupo) => (
            <optgroup key={grupo} label={grupo}>
              {FONTES_DO_TEXTO.filter((f) => f.grupo === grupo).map((f) => (
                <option key={f.nome} value={f.nome}>{f.nome}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className={estilos.campo}>
        <label htmlFor={`cor-texto-${cardId}`}>Cor</label>
        <div className={estilos.cor}>
          <input
            id={`cor-texto-${cardId}`}
            type="color"
            value={cor ?? corDaPagina}
            onChange={(e) => escolherCor(e.target.value)}
            aria-label="Cor do texto, seletor visual"
          />
          <input
            type="text"
            value={digitada}
            placeholder={`${corDaPagina}, a da página`}
            onChange={(e) => escolherCor(e.target.value.trim())}
            aria-label="Cor do texto em hexadecimal"
            spellCheck={false}
          />
        </div>
        {cor && (
          <button
            type="button"
            className={estilos.tamanhoPadrao}
            onClick={() => {
              setCor(null);
              setDigitada("");
            }}
          >
            usar a cor da página
          </button>
        )}
        <input type="hidden" name="corTexto" value={cor ?? ""} />
      </div>

      <div className={estilos.campo}>
        <span className={estilos.rotulo}>Formato</span>
        <div className={estilos.formatos} role="group" aria-label="Formato do texto">
          {FORMATOS.map((f) => (
            <button
              key={f.valor}
              type="button"
              data-formato={f.valor}
              aria-pressed={formato.includes(f.valor)}
              aria-label={f.rotulo}
              title={f.rotulo}
              onClick={() => alternar(f.valor)}
            >
              {f.letra}
            </button>
          ))}
        </div>
        <input type="hidden" name="formato" value={formato.join(" ")} />
      </div>
    </div>
  );
}
