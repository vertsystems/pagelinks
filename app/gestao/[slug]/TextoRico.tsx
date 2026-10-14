"use client";

import { useEffect, useId, useRef, useState } from "react";
import { lerEditor, lerTrechos, montarTrechos, textoSimples, trechosDoTexto, type Trecho } from "@/lib/textoRico";
import { naPrevia } from "./BarraAjuste";
import estilos from "../gestao.module.css";

const COMANDOS = [
  { comando: "bold", rotulo: "Negrito", letra: "N", formato: "negrito" },
  { comando: "italic", rotulo: "Itálico", letra: "I", formato: "italico" },
  { comando: "underline", rotulo: "Sublinhado", letra: "S", formato: "sublinhado" },
  { comando: "strikeThrough", rotulo: "Riscado", letra: "R", formato: "riscado" },
] as const;

/** Cores prontas na barra, depois das da página (texto e botões). */
const CORES_FIXAS = ["#FFFFFF", "#111111", "#FFD600", "#FB8C00", "#E53935", "#D81B60", "#43A047", "#1E88E5"];

/**
 * Editor do texto dos blocos de título e de texto, com formatação por trecho: seleciona e
 * marca negrito, itálico, sublinhado, riscado ou cor (Ctrl/⌘+B, I e U também funcionam).
 * Enter quebra a linha; colar traz só o texto, sem a formatação de fora.
 *
 * É um contentEditable que o navegador formata (execCommand) e que o React não controla:
 * ele monta o conteúdo uma vez e, a cada mudança, lê de volta em trechos (lib/textoRico.ts),
 * que vão no campo escondido "rico" e gravam no "Salvar bloco". A prévia muda na hora.
 * A seleção fica guardada: ao clicar numa cor ou no seletor de cor, o foco sai do texto,
 * e a formatação volta para o trecho que estava selecionado.
 */
export default function TextoRico({
  cardId,
  rotulo,
  rico,
  titulo,
  fundo,
  corDaPagina,
  corDosBotoes,
}: {
  cardId: string;
  rotulo: string;
  rico: string | null;
  titulo: string | null;
  /** o editor tem o fundo e a cor do texto da página: trecho amarelo não some no painel claro */
  fundo: string;
  corDaPagina: string;
  corDosBotoes: string;
}) {
  const id = useId();
  const editor = useRef<HTMLDivElement>(null);
  const corLivre = useRef<HTMLInputElement>(null);
  const selecao = useRef<Range | null>(null);
  const [inicio] = useState<Trecho[]>(() => lerTrechos(rico) ?? trechosDoTexto(titulo));
  const [trechos, setTrechos] = useState<Trecho[]>(inicio);
  const [ativos, setAtivos] = useState<string[]>([]);
  const cores = [...new Set([corDaPagina.toUpperCase(), corDosBotoes.toUpperCase(), ...CORES_FIXAS])];

  // o conteúdo é montado uma vez; depois, quem cuida dele é o navegador
  useEffect(() => {
    editor.current?.replaceChildren(montarTrechos(document, inicio));
  }, [inicio]);

  // guarda a seleção dentro do editor e acende os botões do que já está aplicado ali
  useEffect(() => {
    const aoMudar = () => {
      const s = document.getSelection();
      const el = editor.current;
      if (!s || !el || s.rangeCount === 0 || !el.contains(s.anchorNode)) return;
      selecao.current = s.getRangeAt(0).cloneRange();
      setAtivos(COMANDOS.filter((c) => document.queryCommandState(c.comando)).map((c) => c.comando));
    };
    document.addEventListener("selectionchange", aoMudar);
    return () => document.removeEventListener("selectionchange", aoMudar);
  }, []);

  function atualizar() {
    const el = editor.current;
    if (!el) return;
    const novos = lerEditor(el);
    setTrechos(novos);
    const naPagina = naPrevia(`[data-pl-bloco="${cardId}"] > p`);
    naPagina?.replaceChildren(montarTrechos(naPagina.ownerDocument, novos));
  }

  function aplicar(comando: string, valor?: string) {
    const el = editor.current;
    if (!el) return;
    el.focus();
    if (selecao.current) {
      const s = document.getSelection();
      s?.removeAllRanges();
      s?.addRange(selecao.current);
    }
    document.execCommand(comando, false, valor);
    atualizar();
    setAtivos(COMANDOS.filter((c) => document.queryCommandState(c.comando)).map((c) => c.comando));
  }

  // o seletor de cor aplica quando fecha (o "change" nativo), não a cada arrastada
  useEffect(() => {
    const entrada = corLivre.current;
    if (!entrada) return;
    const aoEscolher = () => aplicar("foreColor", entrada.value);
    entrada.addEventListener("change", aoEscolher);
    return () => entrada.removeEventListener("change", aoEscolher);
  });

  const manterSelecao = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className={estilos.campo}>
      <span className={estilos.rotulo} id={`${id}-rotulo`}>
        {rotulo}
      </span>
      <div className={estilos.textoRico}>
        <div className={estilos.barraTexto} role="toolbar" aria-label="Formatar o trecho selecionado">
          {COMANDOS.map((c) => (
            <button
              key={c.comando}
              type="button"
              data-formato={c.formato}
              aria-pressed={ativos.includes(c.comando)}
              aria-label={`${c.rotulo} no trecho selecionado`}
              title={`${c.rotulo} no trecho selecionado`}
              onMouseDown={manterSelecao}
              onClick={() => aplicar(c.comando)}
            >
              {c.letra}
            </button>
          ))}
          <span className={estilos.barraSeparador} aria-hidden="true" />
          {cores.map((cor) => (
            <button
              key={cor}
              type="button"
              className={estilos.amostraCor}
              style={{ background: cor }}
              aria-label={`Cor ${cor} no trecho selecionado`}
              title={cor}
              onMouseDown={manterSelecao}
              onClick={() => aplicar("foreColor", cor)}
            />
          ))}
          <input ref={corLivre} type="color" className={estilos.corLivre} defaultValue={corDaPagina} aria-label="Outra cor no trecho selecionado" title="Outra cor" />
          <button type="button" className={estilos.limparFormato} onMouseDown={manterSelecao} onClick={() => aplicar("removeFormat")} title="Tira negrito, itálico, sublinhado, riscado e cor do trecho selecionado">
            Limpar formatação
          </button>
        </div>
        <div
          ref={editor}
          className={estilos.editorTexto}
          style={{ background: fundo, color: corDaPagina }}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-labelledby={`${id}-rotulo`}
          onInput={atualizar}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            document.execCommand("insertLineBreak");
            atualizar();
          }}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
            atualizar();
          }}
        />
      </div>
      <span className={estilos.dica}>
        Selecione um trecho e use a barra (ou Ctrl/⌘ + B, I, U). Sem nada selecionado, vale para o que você digitar dali em diante.
        Enter quebra a linha. Grava no “Salvar bloco”.
      </span>
      <input type="hidden" name="rico" value={JSON.stringify(trechos)} />
      <input type="hidden" name="titulo" value={textoSimples(trechos)} />
    </div>
  );
}
