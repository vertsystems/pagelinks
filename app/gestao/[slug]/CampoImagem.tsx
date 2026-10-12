"use client";

import { useId, useRef, useState, useTransition } from "react";
import { enviarImagem, removerImagem, type AlvoImagem } from "../acoes";
import estilos from "../gestao.module.css";

const LIMITE_ENVIO = 4 * 1024 * 1024; // o mesmo de lib/imagens.ts, conferido de novo no servidor

/**
 * Campo de imagem do editor: envia o WebP e já grava, sem esperar o Salvar do
 * formulário em volta. O input de arquivo não tem name, então não entra no envio
 * desse formulário.
 */
export default function CampoImagem({
  alvo,
  url: inicial,
  rotulo,
  dica,
  redonda = false,
  aoMudar,
}: {
  alvo: AlvoImagem;
  url: string | null;
  rotulo: string;
  dica?: string;
  redonda?: boolean;
  aoMudar?: (url: string | null) => void;
}) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function concluir(resposta: { url?: string | null; erro?: string }) {
    if (resposta.erro) {
      setErro(resposta.erro);
      return;
    }
    setUrl(resposta.url ?? null);
    aoMudar?.(resposta.url ?? null);
  }

  function enviar(arquivo: File) {
    setErro(null);
    if (arquivo.type !== "image/webp") return setErro("A imagem precisa estar em WebP.");
    if (arquivo.size > LIMITE_ENVIO) return setErro("A imagem passa de 4 MB. Exporte de novo num tamanho menor.");

    const dados = new FormData();
    dados.append("arquivo", arquivo);
    iniciar(async () => {
      concluir(await enviarImagem(alvo, dados));
      if (entrada.current) entrada.current.value = "";
    });
  }

  function remover() {
    setErro(null);
    iniciar(async () => concluir(await removerImagem(alvo)));
  }

  return (
    <div className={estilos.campo}>
      <label htmlFor={id}>{rotulo}</label>
      <div className={estilos.imagemCampo}>
        <div className={`${estilos.imagemMiniatura} ${redonda ? estilos.imagemRedonda : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" /> : <span>sem imagem</span>}
        </div>
        <div className={estilos.imagemAcoes}>
          <label htmlFor={id} className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini} ${estilos.botaoArquivo}`} aria-disabled={ocupado}>
            {ocupado ? "Aguarde…" : url ? "Trocar imagem" : "Enviar imagem"}
          </label>
          <input
            ref={entrada}
            id={id}
            type="file"
            accept="image/webp"
            className={estilos.arquivoOculto}
            disabled={ocupado}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) enviar(arquivo);
            }}
          />
          {url && (
            <button
              type="button"
              className={`${estilos.btn} ${estilos.btnPerigo} ${estilos.btnMini}`}
              onClick={remover}
              disabled={ocupado}
            >
              Remover
            </button>
          )}
        </div>
      </div>
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
      {dica && <span className={estilos.dica}>{dica}</span>}
    </div>
  );
}
