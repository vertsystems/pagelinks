"use client";

import { useState } from "react";
import estilos from "../gestao.module.css";

const COR = /^#[0-9a-fA-F]{6}$/;

/**
 * Cor que pode ficar no padrão: seletor e hex lado a lado, e "usar o padrão" para voltar.
 * Vai no formulário em volta pelo campo escondido `nome` (vazio = padrão) e grava no
 * "Salvar bloco". `aoMudar` serve para a prévia mudar na hora.
 * Quem usa põe key no valor gravado: depois de salvar, recomeça dele (o reset do formulário
 * do React 19 não deixa o campo numa cor antiga).
 */
export default function CorOpcional({
  nome,
  rotulo,
  valor,
  padrao,
  rotuloPadrao,
  aoMudar,
}: {
  nome: string;
  rotulo: string;
  valor: string | null;
  /** a cor que vale sem escolha, para o seletor começar nela */
  padrao: string;
  /** como dizer o padrão no campo vazio ("a da página") */
  rotuloPadrao: string;
  aoMudar?: (cor: string | null) => void;
}) {
  const inicial = valor && COR.test(valor) ? valor.toUpperCase() : null;
  const [cor, setCor] = useState(inicial);
  const [digitada, setDigitada] = useState(inicial ?? "");

  function escolher(texto: string) {
    setDigitada(texto);
    if (COR.test(texto)) {
      setCor(texto.toUpperCase());
      aoMudar?.(texto.toUpperCase());
    }
  }

  return (
    <div className={estilos.campo}>
      <label htmlFor={`${nome}-${rotulo}`}>{rotulo}</label>
      <div className={estilos.cor}>
        <input id={`${nome}-${rotulo}`} type="color" value={cor ?? (COR.test(padrao) ? padrao : "#000000")} onChange={(e) => escolher(e.target.value)} aria-label={`${rotulo}, seletor visual`} />
        <input type="text" value={digitada} placeholder={rotuloPadrao} onChange={(e) => escolher(e.target.value.trim())} aria-label={`${rotulo} em hexadecimal`} spellCheck={false} />
      </div>
      {cor && (
        <button
          type="button"
          className={estilos.tamanhoPadrao}
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            setCor(null);
            setDigitada("");
            aoMudar?.(null);
          }}
        >
          usar o padrão
        </button>
      )}
      <input type="hidden" name={nome} value={cor ?? ""} />
    </div>
  );
}
