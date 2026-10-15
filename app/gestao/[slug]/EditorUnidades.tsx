"use client";

import { useState } from "react";
import type { ValoresTela } from "@/lib/ajustes";
import { PADRAO_DA_LETRA } from "@/lib/tema";
import { criarUnidade, ordenarUnidades, removerUnidade, salvarUnidade, type UnidadeDoBloco } from "../acoes";
import { naPrevia } from "./BarraAjuste";
import CampoImagem from "./CampoImagem";
import ControleAjuste from "./ControleAjuste";
import CorOpcional from "./CorOpcional";
import estilos from "../gestao.module.css";

/**
 * As unidades de um bloco "unidades": foto, nome, endereço e link de cada uma. Tudo grava na
 * hora (a foto ao enviar, os textos ao sair do campo), como no carrossel. As cores do cartão
 * e do texto vão no formulário do bloco (corFundo e corTexto) e gravam no "Salvar bloco"; a
 * prévia muda na hora. Unidades por linha é por tela (ControleAjuste).
 */
export default function EditorUnidades({
  cardId,
  unidades: iniciais,
  corCartao,
  corTextoCartao,
  corDaPagina,
  fundoDaPagina,
  valoresColunas,
  valoresLetra,
}: {
  cardId: string;
  unidades: UnidadeDoBloco[];
  corCartao: string | null;
  corTextoCartao: string | null;
  corDaPagina: string;
  fundoDaPagina: string;
  valoresColunas: ValoresTela;
  /** tamanho do texto do cartão (o do endereço; o nome acompanha), por tela */
  valoresLetra: ValoresTela;
}) {
  const [unidades, setUnidades] = useState(iniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [gravado, setGravado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // cor na prévia na hora (a gravação é no "Salvar bloco")
  const corNaPrevia = (variavel: string) => (cor: string | null) => {
    const bloco = naPrevia(`[data-pl-bloco="${cardId}"] > div`);
    if (!bloco) return;
    if (cor) bloco.style.setProperty(variavel, cor);
    else bloco.style.removeProperty(variavel);
  };

  async function adicionar() {
    setErro(null);
    setOcupado(true);
    const r = await criarUnidade(cardId).catch(() => ({ erro: "Não consegui criar a unidade.", unidade: undefined }));
    setOcupado(false);
    if (r.unidade) setUnidades((lista) => [...lista, r.unidade!]);
    else setErro(r.erro ?? "Não consegui criar a unidade.");
  }

  async function gravar(u: UnidadeDoBloco, campo: "nome" | "endereco" | "url", valor: string) {
    const novo = valor.trim() || null;
    if ((u[campo] ?? null) === novo) return;
    if (campo === "nome" && !novo) return setErro("A unidade precisa de um nome.");
    setErro(null);
    const r = await salvarUnidade(u.id, campo, valor).catch(() => ({ erro: "Não consegui gravar." }));
    if (r.erro) return setErro(r.erro);
    setUnidades((lista) => lista.map((x) => (x.id === u.id ? { ...x, [campo]: novo } : x)));
    setGravado(u.id);
    setTimeout(() => setGravado((atual) => (atual === u.id ? null : atual)), 1800);
  }

  async function mover(de: number, passo: -1 | 1) {
    const para = de + passo;
    if (para < 0 || para >= unidades.length) return;
    const antes = unidades;
    const lista = [...antes];
    [lista[de], lista[para]] = [lista[para], lista[de]];
    setUnidades(lista);
    const r = await ordenarUnidades(cardId, lista.map((u) => u.id)).catch(() => ({ erro: "Não consegui gravar a ordem." }));
    if (r.erro) {
      setErro(r.erro);
      setUnidades(antes);
    }
  }

  async function remover(u: UnidadeDoBloco) {
    if (!confirm(`Tirar a unidade “${u.nome}” do bloco?`)) return;
    const antes = unidades;
    setUnidades(antes.filter((x) => x.id !== u.id));
    const r = await removerUnidade(u.id).catch(() => ({ erro: "Não consegui tirar a unidade." }));
    if (r.erro) {
      setErro(r.erro);
      setUnidades(antes);
    }
  }

  const aoSairComEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter grava o campo, em vez de enviar o formulário do bloco
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div className={estilos.campo}>
      <span className={estilos.rotulo}>Unidades</span>
      <ol className={estilos.unidadesEditor}>
        {unidades.map((u, i) => (
          <li key={u.id} className={estilos.unidadeEditor}>
            <div className={estilos.unidadeEditorTopo}>
              <span className={estilos.carrosselNumero}>{i + 1}</span>
              <span className={estilos.carrosselGravado} aria-live="polite">{gravado === u.id ? "gravado" : ""}</span>
              <button type="button" className={estilos.iconeBtn} onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Passar a unidade ${u.nome} para cima`} title="Para cima">↑</button>
              <button type="button" className={estilos.iconeBtn} onClick={() => mover(i, 1)} disabled={i === unidades.length - 1} aria-label={`Passar a unidade ${u.nome} para baixo`} title="Para baixo">↓</button>
              <button type="button" className={estilos.iconeBtn} onClick={() => remover(u)} aria-label={`Tirar a unidade ${u.nome}`} title="Tirar">✕</button>
            </div>
            <div className={estilos.unidadeEditorCorpo}>
              <CampoImagem
                alvo={{ tipo: "unidade", id: u.id }}
                url={u.imagemUrl}
                rotulo="Foto"
                dica="Horizontal. Aparece no formato 16:9, cortada pelo centro."
                fundo={fundoDaPagina}
              />
              <div className={estilos.campos}>
                <div className={estilos.campo}>
                  <label htmlFor={`un-nome-${u.id}`}>Nome da unidade</label>
                  <input id={`un-nome-${u.id}`} type="text" defaultValue={u.nome} onBlur={(e) => gravar(u, "nome", e.currentTarget.value)} onKeyDown={aoSairComEnter} />
                </div>
                <div className={estilos.campo}>
                  <label htmlFor={`un-end-${u.id}`}>Endereço</label>
                  <textarea id={`un-end-${u.id}`} rows={2} defaultValue={u.endereco ?? ""} placeholder="Rua, número, bairro, cidade" onBlur={(e) => gravar(u, "endereco", e.currentTarget.value)} />
                </div>
                <div className={estilos.campo}>
                  <label htmlFor={`un-url-${u.id}`}>Link (na foto e na seta)</label>
                  <input id={`un-url-${u.id}`} type="url" defaultValue={u.url ?? ""} placeholder="https://maps.google.com/…" onBlur={(e) => gravar(u, "url", e.currentTarget.value)} onKeyDown={aoSairComEnter} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} style={{ alignSelf: "flex-start" }} onClick={adicionar} disabled={ocupado}>
        {ocupado ? "Criando…" : "+ Adicionar unidade"}
      </button>
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}

      <div className={estilos.doisCampos}>
        <CorOpcional key={`fundo-${corCartao}`} nome="corFundo" rotulo="Cor do cartão" valor={corCartao} padrao={fundoDaPagina} rotuloPadrao="padrão: um tom do texto da página" aoMudar={corNaPrevia("--cor-cartao")} />
        <CorOpcional key={`texto-${corTextoCartao}`} nome="corTexto" rotulo="Cor do texto do cartão" valor={corTextoCartao} padrao={corDaPagina} rotuloPadrao={`padrão: ${corDaPagina}, a da página`} aoMudar={corNaPrevia("--cor-cartao-texto")} />
      </div>
      <ControleAjuste alvo={{ tipo: "card", id: cardId }} chave="colunas" valores={valoresColunas} rotulo="Unidades por linha" />
      <ControleAjuste alvo={{ tipo: "card", id: cardId }} chave="letra" valores={valoresLetra} rotulo="Tamanho do texto" padrao={PADRAO_DA_LETRA.unidades} />
      <span className={estilos.dica}>
        Foto, nome, endereço e link gravam na hora; as cores, no “Salvar bloco”. Tamanho do texto e unidades por linha valem
        para a tela escolhida na prévia (o nome acompanha o endereço). Em cartão estreito, a seta fica ao lado do nome e o
        endereço usa a largura toda. A seta usa a cor dos botões da página.
      </span>
    </div>
  );
}
