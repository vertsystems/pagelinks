"use client";

import { useEffect, useRef, useState } from "react";
import { FORMATOS_ACEITOS, LIMITE_ENVIO, type UsoImagem } from "@/lib/imagens-limites";
import { dataHoraCurta } from "@/lib/horario";
import { reduzirNoNavegador } from "./CampoImagem";
import { useVer } from "./Tela";
import estilos from "../gestao.module.css";

/**
 * Peças comuns da foto e da aparência programadas (FotosProgramadas.tsx, AparenciasProgramadas.tsx),
 * no jeito dos links programados: uma linha por período, amarela antes de entrar, verde no ar, e
 * cada linha grava no próprio botão. Nenhum campo tem name: as linhas moram dentro dos formulários
 * da página e não podem entrar no Salvar deles.
 */

type Periodo = { inicio: Date | string; fim: Date | string };

/** "nova" (ainda não gravada), "ativa" (no ar agora) ou "futura": a cor da linha. */
export function situacaoDa(programada: Periodo | undefined, agora: number) {
  return !programada ? "nova" : new Date(programada.inicio).getTime() <= agora ? "ativa" : "futura";
}

export function tituloDa(programada: Periodo | undefined, agora: number, nova: string) {
  if (!programada) return nova;
  return situacaoDa(programada, agora) === "ativa"
    ? `No ar agora · até ${dataHoraCurta(programada.fim, agora)}`
    : `Entra em ${dataHoraCurta(programada.inicio, agora)} · vai até ${dataHoraCurta(programada.fim, agora)}`;
}

export const periodoCurto = (programada: Periodo, agora: number) => `${dataHoraCurta(programada.inicio, agora)} a ${dataHoraCurta(programada.fim, agora)}`;

/** A chave de uma linha: muda quando o servidor devolve a versão gravada, e a linha volta a mostrar o que vale. */
export const chaveDaLinha = (programada: Periodo & { id: string }, ...resto: (string | null)[]) =>
  [programada.id, new Date(programada.inicio).getTime(), new Date(programada.fim).getTime(), ...resto].join("|");

/**
 * A linha nova da lista. Fica à vista ("Gravando…") até a gravada chegar do servidor, que vem logo
 * depois da resposta da ação: fechar na hora deixava um vão em que a programação sumia.
 */
export function useLinhaNova(ids: string[]) {
  const [nova, setNova] = useState(false);
  const [esperando, setEsperando] = useState<string | null>(null);
  if (esperando && ids.includes(esperando)) {
    setEsperando(null);
    setNova(false);
  }
  return { nova, abrir: () => setNova(true), terminar: (gravada?: string) => (gravada ? setEsperando(gravada) : setNova(false)) };
}

/**
 * A imagem escolhida numa linha, antes de gravar: mostrada na miniatura direto do aparelho (sem
 * subir nada), e enviada só quando a linha grava.
 */
export function useArquivoEscolhido() {
  const [escolhido, setEscolhido] = useState<{ arquivo: File; previa: string } | null>(null);
  const endereco = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (endereco.current) URL.revokeObjectURL(endereco.current);
    },
    [],
  );
  function escolher(arquivo: File | null) {
    if (endereco.current) URL.revokeObjectURL(endereco.current);
    endereco.current = arquivo ? URL.createObjectURL(arquivo) : null;
    setEscolhido(arquivo && endereco.current ? { arquivo, previa: endereco.current } : null);
  }
  return { escolhido, escolher };
}

/** O arquivo pronto para o envio: acima do teto, reduzido aqui mesmo, como no CampoImagem. */
export async function prepararArquivo(arquivo: File, uso: UsoImagem): Promise<{ arquivo: File } | { erro: string }> {
  let pronto = arquivo;
  try {
    if (arquivo.size > LIMITE_ENVIO) pronto = await reduzirNoNavegador(arquivo, uso);
  } catch {
    return { erro: "Não consegui abrir essa imagem. Confira se o arquivo não está corrompido." };
  }
  if (pronto.size > LIMITE_ENVIO) return { erro: "Mesmo reduzida, a imagem passa de 4 MB. Exporte de novo num tamanho menor." };
  return { arquivo: pronto };
}

/** Confere o formato do arquivo escolhido no campo; devolve o erro, ou null se serve. */
export function erroDoFormato(arquivo: File) {
  return FORMATOS_ACEITOS.includes(arquivo.type) ? null : "A imagem precisa estar em WebP ou PNG.";
}

/** Os campos De e Até, no horário de Brasília. */
export function CamposPeriodo({
  id,
  inicio,
  fim,
  aoMudarInicio,
  aoMudarFim,
}: {
  id: string;
  inicio: string;
  fim: string;
  aoMudarInicio: (valor: string) => void;
  aoMudarFim: (valor: string) => void;
}) {
  return (
    <div className={estilos.programadoCampos}>
      <div className={estilos.campo}>
        <label htmlFor={`${id}-inicio`}>De</label>
        <input id={`${id}-inicio`} type="datetime-local" value={inicio} onChange={(e) => aoMudarInicio(e.target.value)} />
      </div>
      <div className={estilos.campo}>
        <label htmlFor={`${id}-fim`}>Até</label>
        <input id={`${id}-fim`} type="datetime-local" value={fim} min={inicio || undefined} onChange={(e) => aoMudarFim(e.target.value)} />
      </div>
    </div>
  );
}

/** Liga e desliga a programação gravada na prévia ao lado (o ?ver= da página). */
export function BotaoVer({ chave, rotulo }: { chave: string; rotulo: string }) {
  const { ver, setVer } = useVer();
  const vendo = ver?.chave === chave;
  return (
    <button
      type="button"
      className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`}
      aria-pressed={vendo}
      onClick={() => setVer(vendo ? null : { chave, rotulo })}
    >
      {vendo ? "Voltar ao normal" : "Ver na prévia"}
    </button>
  );
}

/** Enter num campo da linha grava a linha, em vez de enviar o formulário da página em volta. */
export function enterGrava(gravar: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      gravar();
    }
  };
}
