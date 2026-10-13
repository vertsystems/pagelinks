"use client";

import { useState } from "react";
import {
  AJUSTES,
  valorCss,
  valorNaTela,
  variavelCss,
  type ChaveAjuste,
  type Faixa,
  type Tela,
  type ValorAjuste,
  type ValoresTela,
} from "@/lib/ajustes";
import { salvarAjuste } from "../acoes";
import BarraAjuste, { naPrevia } from "./BarraAjuste";
import { nomeDaTela, useTela } from "./Tela";
import estilos from "../gestao.module.css";

export type AlvoAjuste = { tipo: "pagina" | "card"; id: string };

/** Onde o ajuste mora na prévia: a página toda ou a célula do bloco. */
export const seletorDoAlvo = (alvo: AlvoAjuste) => (alvo.tipo === "pagina" ? "[data-pl-tela]" : `[data-pl-bloco="${alvo.id}"]`);

/**
 * Barra de um ajuste numérico na tela que está sendo editada. Mostra o valor da tela
 * (próprio ou herdado), mexe só na variável dessa tela na prévia e grava só nela.
 *
 * Guarda o que já gravou nesta sessão (`locais`) e usa isso por cima do que veio do
 * servidor: quem troca de tela logo depois de mexer não pode ver o valor de antes
 * enquanto a página ainda não voltou atualizada.
 */
export default function ControleAjuste({
  alvo,
  chave,
  valores,
  rotulo,
  nomeAcessivel,
  padraoDe,
  rotuloPadrao,
}: {
  alvo: AlvoAjuste;
  chave: ChaveAjuste;
  valores: ValoresTela;
  rotulo: string;
  nomeAcessivel?: string;
  /** sem valor, segue outro ajuste (o "lado" segue o espaço entre os blocos) */
  padraoDe?: { chave: ChaveAjuste; valores: ValoresTela };
  /** como chamar o padrão, quando não é o número fixo ("igual ao espaço entre os blocos") */
  rotuloPadrao?: string;
}) {
  const { tela } = useTela();
  const [erro, setErro] = useState<string | null>(null);
  const [locais, setLocais] = useState<Partial<ValoresTela>>({});
  const def = AJUSTES[chave];
  if (def.tipo !== "numero") return null;

  const padrao = padraoDe ? valorNaTela(padraoDe.valores, padraoDe.chave, tela).valor : undefined;
  const { valor, proprio, seguiria } = valorNaTela({ ...valores, ...locais }, chave, tela, padrao);

  function aplicar(v: ValorAjuste | null, naTela: Tela) {
    const variavel = variavelCss(chave, naTela);
    const elemento = naPrevia(seletorDoAlvo(alvo));
    if (v === null) elemento?.style.removeProperty(variavel);
    else elemento?.style.setProperty(variavel, valorCss(chave, v));
  }

  // a tela vai junto: a gravação sai meio segundo depois, e a tela pode já ter mudado
  async function gravar(v: ValorAjuste | null, naTela: Tela) {
    setLocais((atual) => ({ ...atual, [naTela]: v }));
    setErro((await salvarAjuste(alvo, chave, naTela, v)).erro ?? null);
  }

  const voltarPara = seguiria.de ? `seguir o ${nomeDaTela(seguiria.de)}` : (rotuloPadrao ?? "voltar ao padrão");

  return (
    <>
      <BarraAjuste
        key={tela}
        rotulo={rotulo}
        nomeAcessivel={nomeAcessivel}
        valor={Number(valor)}
        faixa={def.faixa as Faixa}
        proprio={proprio}
        nota={seguiria.de ? (tela === "celular" ? undefined : `segue o ${nomeDaTela(seguiria.de)}`) : (rotuloPadrao ?? (tela === "celular" ? undefined : "padrão"))}
        aoMover={(v) => aplicar(v, tela)}
        aoGravar={(v) => gravar(v, tela)}
        voltar={{ rotulo: voltarPara, valor: Number(seguiria.valor), aoVoltar: () => (aplicar(null, tela), gravar(null, tela)) }}
      />
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
    </>
  );
}
