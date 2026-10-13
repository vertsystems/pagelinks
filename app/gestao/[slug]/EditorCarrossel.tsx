"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas das imagens, já em WebP do Storage */

import { useId, useRef, useState } from "react";
import { FORMATOS_ACEITOS, LIMITE_ENVIO } from "@/lib/imagens-limites";
import { MAXIMO_DE_IMAGENS, TEMPOS, TEMPO_PADRAO } from "@/lib/carrossel";
import type { ValoresTela } from "@/lib/ajustes";
import {
  adicionarImagemCarrossel,
  ordenarImagensCarrossel,
  removerImagemCarrossel,
  salvarLinkCarrossel,
  salvarTempoCarrossel,
  type ImagemDoCarrossel,
} from "../acoes";
import { reduzirNoNavegador } from "./CampoImagem";
import ControleAjuste from "./ControleAjuste";
import estilos from "../gestao.module.css";

/**
 * As imagens de um bloco carrossel. Tudo grava na hora, sem o Salvar bloco: enviar (várias
 * de uma vez, uma depois da outra), tirar, mudar a ordem, o link de cada uma (ao sair do
 * campo), a velocidade e a largura de cada uma (por tela). Os campos não têm
 * name: não entram no formulário do bloco em volta.
 */
export default function EditorCarrossel({
  cardId,
  imagens: iniciais,
  tempo: tempoInicial,
  valoresSlide,
  fundo,
}: {
  cardId: string;
  imagens: ImagemDoCarrossel[];
  tempo: number | null;
  valoresSlide: ValoresTela;
  /** cor de fundo da página, atrás das miniaturas */
  fundo: string;
}) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [imagens, setImagens] = useState(iniciais);
  const [tempo, setTempo] = useState(tempoInicial ?? TEMPO_PADRAO);
  const [andamento, setAndamento] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gravado, setGravado] = useState<string | null>(null);
  const cabem = MAXIMO_DE_IMAGENS - imagens.length;

  async function enviar(arquivos: File[]) {
    setErro(null);
    const fila = arquivos.slice(0, cabem);
    const erros: string[] = arquivos.length > cabem ? [`Só cabem mais ${cabem}: o carrossel vai até ${MAXIMO_DE_IMAGENS} imagens.`] : [];
    for (const [i, original] of fila.entries()) {
      setAndamento(`Enviando ${i + 1} de ${fila.length}…`);
      if (!FORMATOS_ACEITOS.includes(original.type)) {
        erros.push(`${original.name}: precisa estar em WebP ou PNG.`);
        continue;
      }
      let arquivo = original;
      try {
        if (original.size > LIMITE_ENVIO) arquivo = await reduzirNoNavegador(original, "card");
      } catch {
        erros.push(`${original.name}: não consegui abrir a imagem.`);
        continue;
      }
      if (arquivo.size > LIMITE_ENVIO) {
        erros.push(`${original.name}: mesmo reduzida, passa de 4 MB.`);
        continue;
      }
      const dados = new FormData();
      dados.append("arquivo", arquivo);
      const resposta = await adicionarImagemCarrossel(cardId, dados).catch(() => ({ erro: "não consegui enviar.", imagem: undefined }));
      if (resposta.imagem) setImagens((lista) => [...lista, resposta.imagem!]);
      else erros.push(`${original.name}: ${resposta.erro}`);
    }
    setAndamento(null);
    if (erros.length) setErro(erros.join(" "));
    if (entrada.current) entrada.current.value = "";
  }

  async function remover(imagem: ImagemDoCarrossel, posicao: number) {
    if (!confirm(`Tirar a imagem ${posicao} do carrossel?`)) return;
    const antes = imagens;
    setErro(null);
    setImagens(antes.filter((i) => i.id !== imagem.id));
    const resposta = await removerImagemCarrossel(imagem.id).catch(() => ({ erro: "Não consegui tirar a imagem." }));
    if (resposta.erro) {
      setErro(resposta.erro);
      setImagens(antes);
    }
  }

  async function mover(de: number, passo: -1 | 1) {
    const para = de + passo;
    if (para < 0 || para >= imagens.length) return;
    const antes = imagens;
    const lista = [...antes];
    [lista[de], lista[para]] = [lista[para], lista[de]];
    setErro(null);
    setImagens(lista);
    const resposta = await ordenarImagensCarrossel(cardId, lista.map((i) => i.id)).catch(() => ({ erro: "Não consegui gravar a ordem." }));
    if (resposta.erro) {
      setErro(resposta.erro);
      setImagens(antes);
    }
  }

  async function gravarLink(imagem: ImagemDoCarrossel, valor: string) {
    const link = valor.trim() || null;
    if (link === imagem.url) return;
    setErro(null);
    const resposta = await salvarLinkCarrossel(imagem.id, valor).catch(() => ({ erro: "Não consegui gravar o link." }));
    if (resposta.erro) return setErro(resposta.erro);
    setImagens((lista) => lista.map((i) => (i.id === imagem.id ? { ...i, url: link } : i)));
    setGravado(imagem.id);
    setTimeout(() => setGravado((atual) => (atual === imagem.id ? null : atual)), 1800);
  }

  async function escolherTempo(segundos: number) {
    const antes = tempo;
    setTempo(segundos);
    const resposta = await salvarTempoCarrossel(cardId, segundos).catch(() => ({ erro: "Não consegui gravar o tempo." }));
    if (resposta.erro) {
      setErro(resposta.erro);
      setTempo(antes);
    }
  }

  return (
    <div className={estilos.campo}>
      <label htmlFor={id}>Imagens do carrossel</label>
      <div className={estilos.carrosselGrade}>
        {imagens.map((imagem, i) => (
          <div key={imagem.id} className={estilos.carrosselItem}>
            <div className={estilos.carrosselFoto} style={{ background: fundo }}>
              <img src={imagem.imagemUrl} alt="" />
              <span className={estilos.carrosselNumero}>{i + 1}</span>
            </div>
            <input
              key={imagem.url ?? ""}
              type="url"
              defaultValue={imagem.url ?? ""}
              placeholder="Link (opcional)"
              aria-label={`Link da imagem ${i + 1}`}
              onBlur={(e) => gravarLink(imagem, e.currentTarget.value)}
              onKeyDown={(e) => {
                // Enter grava o link aqui, em vez de enviar o formulário do bloco
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
            <div className={estilos.carrosselBotoes}>
              <button type="button" className={estilos.iconeBtn} onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Passar a imagem ${i + 1} para antes`} title="Antes">←</button>
              <button type="button" className={estilos.iconeBtn} onClick={() => mover(i, 1)} disabled={i === imagens.length - 1} aria-label={`Passar a imagem ${i + 1} para depois`} title="Depois">→</button>
              <span className={estilos.carrosselGravado} aria-live="polite">{gravado === imagem.id ? "link gravado" : ""}</span>
              <button type="button" className={estilos.iconeBtn} onClick={() => remover(imagem, i + 1)} aria-label={`Tirar a imagem ${i + 1}`} title="Tirar">✕</button>
            </div>
          </div>
        ))}
        {cabem > 0 && (
          <label htmlFor={id} className={estilos.carrosselAdicionar} aria-disabled={!!andamento}>
            {andamento ?? (
              <>
                <b>+ Adicionar imagens</b>
                <small>WebP ou PNG, várias de uma vez</small>
              </>
            )}
          </label>
        )}
      </div>
      <input
        ref={entrada}
        id={id}
        type="file"
        multiple
        accept={FORMATOS_ACEITOS.join(",")}
        className={estilos.arquivoOculto}
        disabled={!!andamento || cabem <= 0}
        onChange={(e) => {
          const arquivos = [...(e.target.files ?? [])];
          if (arquivos.length) enviar(arquivos);
        }}
      />
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}

      <div className={estilos.carrosselOpcoes}>
        <label>
          Velocidade
          <select value={tempo} onChange={(e) => escolherTempo(Number(e.target.value))}>
            {TEMPOS.map((s) => (
              <option key={s} value={s}>
                {s} segundos por imagem{s === TEMPO_PADRAO ? " (padrão)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ControleAjuste alvo={{ tipo: "card", id: cardId }} chave="slide" valores={valoresSlide} rotulo="Largura de cada imagem" />
      <span className={estilos.dica}>
        Na página as imagens deslizam sem parar e, depois da última, vem a primeira de novo. Param com o mouse em
        cima e têm botão de pausa. Abaixo de 100%, aparecem várias ao mesmo tempo. Tudo aqui grava na hora.
      </span>
    </div>
  );
}
