"use client";

import { useId, useRef, useState, useTransition } from "react";
import { FORMATOS_ACEITOS, LIMITE_ENVIO, TAMANHO_MAXIMO, TAMANHO_NA_PAGINA, USO_DO_CAMPO, type UsoImagem } from "@/lib/imagens-limites";
import { enviarImagem, removerImagem, salvarTamanhoImagem, type AlvoImagem } from "../acoes";
import estilos from "../gestao.module.css";

/**
 * Arquivo acima do teto de envio (PNG pesado, em geral): reduz aqui mesmo ao
 * tamanho que a página usa e manda como WebP q95 (q85 se ainda passar do teto).
 * O servidor regrava em WebP q90 do mesmo jeito. Qualidade 1 não serve: no teste,
 * uma arte de 16 MB reduzida saiu acima de 4 MB.
 */
async function reduzirNoNavegador(arquivo: File, uso: UsoImagem): Promise<File> {
  const bitmap = await createImageBitmap(arquivo);
  const { largura, altura } = TAMANHO_MAXIMO[uso];
  const escala = Math.min(1, largura / bitmap.width, altura ? altura / bitmap.height : 1);

  const tela = document.createElement("canvas");
  tela.width = Math.round(bitmap.width * escala);
  tela.height = Math.round(bitmap.height * escala);
  const ctx = tela.getContext("2d");
  if (!ctx) return arquivo;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, tela.width, tela.height);

  let blob: Blob | null = null;
  for (const qualidade of [0.95, 0.85]) {
    blob = await new Promise<Blob | null>((pronto) => tela.toBlob(pronto, "image/webp", qualidade));
    if (!blob || blob.size <= LIMITE_ENVIO) break;
  }
  if (!blob) return arquivo;
  return new File([blob], arquivo.name.replace(/\.\w+$/, "") + (blob.type === "image/webp" ? ".webp" : ".png"), { type: blob.type });
}

/**
 * Campo de imagem do editor: recebe WebP ou PNG e já grava, sem esperar o
 * Salvar do formulário em volta. O input de arquivo não tem name, então não
 * entra no envio desse formulário.
 *
 * Com `tamanho` (foto, cabeçalho, bloco), mostra a barra de tamanho: arrastar
 * muda a prévia na hora, direto no iframe (mesma origem), e o valor é gravado
 * meio segundo depois que a barra para.
 */
export default function CampoImagem({
  alvo,
  url: inicial,
  rotulo,
  dica,
  redonda = false,
  fundo,
  tamanho: tamanhoInicial,
  aoMudar,
}: {
  alvo: AlvoImagem;
  url: string | null;
  rotulo: string;
  dica?: string;
  redonda?: boolean;
  /** cor de fundo da página do cliente, atrás da miniatura: logo branco some no xadrez claro */
  fundo?: string;
  /** tamanho gravado (null = padrão); sem a prop, não há barra */
  tamanho?: number | null;
  aoMudar?: (url: string | null) => void;
}) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const uso: UsoImagem = alvo.tipo === "card" ? "card" : USO_DO_CAMPO[alvo.campo];
  const exibicao = tamanhoInicial !== undefined && uso !== "fundo" ? TAMANHO_NA_PAGINA[uso] : null;
  const [tamanho, setTamanho] = useState(tamanhoInicial ?? exibicao?.padrao ?? 0);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Aplica o tamanho no elemento marcado da prévia, sem recarregar. */
  function aplicarNaPrevia(valor: number) {
    if (!exibicao) return;
    const chave = alvo.tipo === "card" ? `card-${alvo.id}` : uso;
    const quadro = document.querySelector<HTMLIFrameElement>("iframe[data-previa]");
    const alvoNaPrevia = quadro?.contentDocument?.querySelector<HTMLElement>(`[data-pl-tamanho="${chave}"]`);
    if (!alvoNaPrevia) return;
    alvoNaPrevia.style.width = `${valor}${exibicao.unidade}`;
    if (exibicao.unidade === "px") alvoNaPrevia.style.height = `${valor}px`;
  }

  function mudarTamanho(valor: number) {
    setTamanho(valor);
    aplicarNaPrevia(valor);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(async () => {
      const resposta = await salvarTamanhoImagem(alvo, valor);
      setErro(resposta.erro ?? null);
    }, 500);
  }

  function concluir(resposta: { url?: string | null; erro?: string }) {
    if (resposta.erro) {
      setErro(resposta.erro);
      return;
    }
    setUrl(resposta.url ?? null);
    aoMudar?.(resposta.url ?? null);
  }

  function enviar(original: File) {
    setErro(null);
    if (!FORMATOS_ACEITOS.includes(original.type)) return setErro("A imagem precisa estar em WebP ou PNG.");

    iniciar(async () => {
      if (entrada.current) entrada.current.value = "";
      let arquivo = original;
      try {
        if (original.size > LIMITE_ENVIO) arquivo = await reduzirNoNavegador(original, uso);
      } catch {
        setErro("Não consegui abrir essa imagem. Confira se o arquivo não está corrompido.");
        return;
      }
      if (arquivo.size > LIMITE_ENVIO) {
        setErro("Mesmo reduzida, a imagem passa de 4 MB. Exporte de novo num tamanho menor.");
        return;
      }

      const dados = new FormData();
      dados.append("arquivo", arquivo);
      concluir(await enviarImagem(alvo, dados));
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
        <div
          className={`${estilos.imagemMiniatura} ${redonda ? estilos.imagemRedonda : ""}`}
          style={url && fundo ? { background: fundo } : undefined}
        >
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
            accept={FORMATOS_ACEITOS.join(",")}
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
      {url && exibicao && (
        <div className={estilos.tamanho}>
          <span>Tamanho</span>
          <input
            type="range"
            min={exibicao.min}
            max={exibicao.max}
            step={exibicao.passo}
            value={tamanho}
            onChange={(e) => mudarTamanho(Number(e.target.value))}
            aria-label={`Tamanho de: ${rotulo}`}
          />
          <output>{tamanho}{exibicao.unidade === "%" ? "%" : " px"}</output>
          {tamanho !== exibicao.padrao && (
            <button type="button" className={estilos.tamanhoPadrao} onClick={() => mudarTamanho(exibicao.padrao)}>
              voltar ao padrão
            </button>
          )}
        </div>
      )}
      {erro && <span className={estilos.erroCampo} role="alert">{erro}</span>}
      {dica && <span className={estilos.dica}>{dica}</span>}
    </div>
  );
}
