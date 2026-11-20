"use client";

import { createContext, useContext, useState } from "react";
import { TELAS, type Tela } from "@/lib/ajustes";
import estilos from "../gestao.module.css";

/**
 * A tela que está sendo editada (celular, tablet, computador). A prévia troca, e
 * todas as barras e larguras do editor passam a ler e gravar os valores dessa tela.
 */
const Contexto = createContext<{ tela: Tela; setTela: (tela: Tela) => void }>({ tela: "celular", setTela: () => {} });

/**
 * A foto ou aparência programada que a prévia está mostrando antes de entrar no ar (o ?ver= da
 * página, lib/programacoes.ts), com o texto do aviso em cima da prévia. null = a página como
 * está agora. Quem liga é o "Ver na prévia" de cada programação (Programacoes.tsx).
 */
export type ProgramacaoVista = { chave: string; rotulo: string };
const ContextoVer = createContext<{ ver: ProgramacaoVista | null; setVer: (ver: ProgramacaoVista | null) => void }>({ ver: null, setVer: () => {} });

export function ProvedorTela({ children }: { children: React.ReactNode }) {
  const [tela, setTela] = useState<Tela>("celular");
  const [ver, setVer] = useState<ProgramacaoVista | null>(null);
  return (
    <Contexto.Provider value={{ tela, setTela }}>
      <ContextoVer.Provider value={{ ver, setVer }}>{children}</ContextoVer.Provider>
    </Contexto.Provider>
  );
}

export const useTela = () => useContext(Contexto);
export const useVer = () => useContext(ContextoVer);

export const nomeDaTela = (tela: Tela) => TELAS.find((t) => t.id === tela)!.nome.toLowerCase();

/** Aviso no topo do editor quando a tela editada não é o celular. */
export function AvisoTela() {
  const { tela, setTela } = useTela();
  if (tela === "celular") return null;
  return (
    <div className={estilos.avisoTela} role="status">
      <strong>Editando o layout do {nomeDaTela(tela)}.</strong> Tamanhos, espaços e larguras que você mexer agora
      valem só para essa tela; o que não mexer segue a tela menor. Textos, links, imagens e cores são os mesmos nas
      três.{" "}
      <button type="button" onClick={() => setTela("celular")}>
        Voltar ao celular
      </button>
    </div>
  );
}
