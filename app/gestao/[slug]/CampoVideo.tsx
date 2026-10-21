"use client";

import { useState } from "react";
import { lerVideo, orientacaoDoVideo, type Orientacao } from "@/lib/video";
import type { ValoresTela } from "@/lib/ajustes";
import { salvarOrientacao, type LinkProgramadoDoBloco } from "../acoes";
import { retocarPrevia } from "./BarraAjuste";
import ControleAjuste from "./ControleAjuste";
import LinksProgramados from "./LinksProgramados";
import estilos from "../gestao.module.css";

/**
 * O vídeo do bloco: o link (ou o código <iframe>) do serviço onde ele está, deitado ou em pé,
 * e o tamanho por tela (lib/video.ts). Enquanto digita, diz se reconheceu o vídeo. O link vai
 * no Salvar bloco; o formato e o tamanho gravam sozinhos, como a animação e os ajustes por tela.
 */
export default function CampoVideo({
  cardId,
  url,
  formato,
  valoresTamanho,
  programados,
  agora,
}: {
  cardId: string;
  url: string | null;
  formato: string | null;
  valoresTamanho: ValoresTela;
  programados: LinkProgramadoDoBloco[];
  agora: number;
}) {
  const [colado, setColado] = useState(url ?? "");
  const [orientacao, setOrientacao] = useState<Orientacao>(orientacaoDoVideo(formato, url));
  const [erro, setErro] = useState<string | null>(null);
  const video = lerVideo(colado);
  const vazio = !colado.trim();
  const conhecido = video && !video.servico.includes(".");

  async function escolher(valor: Orientacao) {
    const antes = orientacao;
    setOrientacao(valor);
    // a prévia muda na hora: o data-orientacao da moldura do vídeo é o que o CSS da página lê
    retocarPrevia(`orientacao ${cardId}`, `[data-pl-bloco="${cardId}"]`, (celula) => {
      const player = celula.querySelector<HTMLElement>("[data-video]");
      if (!player) return;
      if (valor === "vertical") player.dataset.orientacao = "vertical";
      else delete player.dataset.orientacao;
    });
    const resposta = await salvarOrientacao(cardId, valor).catch(() => ({ erro: "Não consegui gravar o formato do vídeo." }));
    if (resposta.erro) {
      setErro(resposta.erro);
      setOrientacao(antes);
    } else setErro(null);
  }

  return (
    <div className={estilos.campo}>
      <label htmlFor={`url-${cardId}`}>Link do vídeo</label>
      {/* texto, e não url: o código <iframe> inteiro também vale, e o campo de url o recusaria */}
      <input
        id={`url-${cardId}`}
        type="text"
        name="url"
        value={colado}
        onChange={(e) => setColado(e.target.value)}
        placeholder="https://youtu.be/… ou o código <iframe> do serviço"
        autoComplete="off"
        spellCheck={false}
      />
      <span className={vazio || video ? estilos.dica : estilos.erroCampo} aria-live="polite">
        {vazio
          ? "YouTube, Vimeo, Instagram, TikTok, Google Drive, Loom ou o link de incorporação (embed) de qualquer outro serviço. Pode colar o código <iframe> inteiro: fica só o link dele. O vídeo continua lá, não vem para o PageLinks."
          : video
            ? conhecido
              ? `Reconhecido: ${video.servico}. Depois de salvar, ele toca na página.`
              : `Link de incorporação de ${video.servico}: aparece na página do jeito que esse serviço deixar. Se não aparecer, use o link que o serviço dá para incorporar (embed).`
            : "Esse link não toca na página. Use o link do vídeo (no TikTok, o completo, com /video/ no endereço) ou o link de incorporação do serviço, começando com https://."}
      </span>

      <div className={estilos.tamanho} style={{ marginTop: 6 }}>
        <span>Formato</span>
        <div className={estilos.alternador} role="group" aria-label="Formato do vídeo">
          <button type="button" aria-pressed={orientacao === "horizontal"} onClick={() => escolher("horizontal")} title="Deitado, como no YouTube">
            Horizontal (16:9)
          </button>
          <button type="button" aria-pressed={orientacao === "vertical"} onClick={() => escolher("vertical")} title="Em pé, como Reels, Shorts e TikTok">
            Vertical (9:16)
          </button>
        </div>
      </div>
      <span className={estilos.dica}>
        {orientacao === "vertical"
          ? "Em pé, como Reels, Shorts e TikTok. Nunca fica mais alto que a tela."
          : "Deitado, como os vídeos do YouTube."}{" "}
        Grava sozinho.
      </span>
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}

      <ControleAjuste alvo={{ tipo: "card", id: cardId }} chave="imagem" valores={valoresTamanho} rotulo="Tamanho" nomeAcessivel="Tamanho do vídeo" />

      {/* outro vídeo num período, no lugar deste (grava sozinho, fora do Salvar bloco) */}
      <LinksProgramados cardId={cardId} programados={programados} agora={agora} />
    </div>
  );
}
