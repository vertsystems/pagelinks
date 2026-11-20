"use client";

import { useId, useState } from "react";
import { removerFotoProgramada, salvarFotoProgramada, type FotoProgramadaDaPagina } from "../acoes";
import { MAXIMO_DE_PROGRAMACOES } from "@/lib/programacoes";
import { FORMATOS_ACEITOS } from "@/lib/imagens-limites";
import { paraCampoDeHorario } from "@/lib/horario";
import {
  BotaoVer,
  CamposPeriodo,
  chaveDaLinha,
  enterGrava,
  erroDoFormato,
  periodoCurto,
  prepararArquivo,
  situacaoDa,
  tituloDa,
  useArquivoEscolhido,
  useLinhaNova,
} from "./Programacoes";
import { useVer } from "./Tela";
import estilos from "../gestao.module.css";

/**
 * Fotos programadas, logo abaixo da foto ou logo do topo (lib/programacoes.ts): no período de cada
 * uma, a página mostra ela no lugar da de cima, no mesmo formato e tamanho, e volta sozinha quando
 * acaba. A foto escolhida só sobe quando a linha grava.
 */
export default function FotosProgramadas({
  paginaId,
  programadas,
  agora,
  redonda,
  fundo,
  temFoto,
}: {
  paginaId: string;
  programadas: FotoProgramadaDaPagina[];
  agora: number;
  /** o formato da foto do topo, para a miniatura sair como na página */
  redonda: boolean;
  /** cor de fundo da página, atrás da miniatura */
  fundo: string;
  /** a página tem foto fora dos períodos */
  temFoto: boolean;
}) {
  const { nova, abrir, terminar } = useLinhaNova(programadas.map((p) => p.id));
  const cabe = programadas.length < MAXIMO_DE_PROGRAMACOES;
  const fora = temFoto ? "Fora dos períodos, vale a foto de cima." : "Fora dos períodos, a página fica sem foto.";

  return (
    <div className={estilos.campo}>
      <span className={estilos.rotuloSolto}>Foto programada</span>
      <div className={estilos.programados}>
        {programadas.map((p) => (
          <Linha key={chaveDaLinha(p, p.imagemUrl)} paginaId={paginaId} programada={p} agora={agora} redonda={redonda} fundo={fundo} />
        ))}
        {nova && <Linha paginaId={paginaId} agora={agora} redonda={redonda} fundo={fundo} aoTerminar={terminar} />}

        <div className={estilos.programadosRodape}>
          {!nova && cabe && (
            <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={abrir}>
              {programadas.length ? "+ Programar outra foto" : "+ Programar uma foto"}
            </button>
          )}
          <span className={estilos.dica}>
            {programadas.length
              ? `${programadas.length} de ${MAXIMO_DE_PROGRAMACOES} programações. ${cabe ? "" : "Quando uma acabar, abre espaço. "}${fora}`
              : `Troca a foto ou logo sozinha num período (uma campanha, uma data especial), no mesmo formato e tamanho. ${fora}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function Linha({
  paginaId,
  programada,
  agora,
  redonda,
  fundo,
  aoTerminar,
}: {
  paginaId: string;
  programada?: FotoProgramadaDaPagina;
  agora: number;
  redonda: boolean;
  fundo: string;
  /** linha nova: gravou (com o id, para sumir quando a gravada chegar na lista) ou cancelou (sem) */
  aoTerminar?: (gravada?: string) => void;
}) {
  const id = useId();
  const inicial = { inicio: paraCampoDeHorario(programada?.inicio), fim: paraCampoDeHorario(programada?.fim) };
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const { escolhido, escolher } = useArquivoEscolhido();
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  // tirada: some na hora, sem esperar a lista nova do servidor
  const [tirada, setTirada] = useState(false);
  const { ver, setVer } = useVer();
  const mudou = !!escolhido || inicio !== inicial.inicio || fim !== inicial.fim;
  const situacao = situacaoDa(programada, agora);
  const imagem = escolhido?.previa ?? programada?.imagemUrl ?? null;

  async function gravar() {
    if (gravando || (programada && !mudou)) return;
    setErro(null);
    if (!programada && !escolhido) return setErro("Escolha a foto que vai aparecer no período.");
    setGravando(true);
    const dados = new FormData();
    dados.append("inicio", inicio);
    dados.append("fim", fim);
    if (escolhido) {
      const pronto = await prepararArquivo(escolhido.arquivo, "avatar");
      if ("erro" in pronto) {
        setGravando(false);
        return setErro(pronto.erro);
      }
      dados.append("arquivo", pronto.arquivo);
    }
    const resposta: { erro?: string; id?: string } = await salvarFotoProgramada(paginaId, programada?.id ?? null, dados).catch(() => ({
      erro: "Não consegui gravar. Tente de novo.",
    }));
    if (resposta.erro) {
      setGravando(false);
      return setErro(resposta.erro);
    }
    // a linha nova continua em "Gravando…" até sumir; a que já existia volta ao normal
    if (programada) setGravando(false);
    else aoTerminar?.(resposta.id);
  }

  async function tirar() {
    if (!programada) return aoTerminar?.();
    const aviso = situacao === "ativa" ? "\n\nEla está no ar: a página volta na hora para a foto de sempre." : "";
    if (!confirm(`Tirar a foto programada de ${periodoCurto(programada, agora)}?${aviso}`)) return;
    setErro(null);
    setGravando(true);
    const resposta = await removerFotoProgramada(programada.id).catch(() => ({ erro: "Não consegui tirar. Tente de novo." }));
    setGravando(false);
    if (resposta.erro) return setErro(resposta.erro);
    setTirada(true);
    if (ver?.chave === `foto.${programada.id}`) setVer(null);
  }

  if (tirada) return null;

  return (
    <div className={estilos.programado} data-situacao={situacao} onKeyDown={enterGrava(gravar)}>
      <p className={estilos.programadoTitulo}>
        <span className={estilos.programadoSinal} aria-hidden="true" />
        {tituloDa(programada, agora, "Nova foto programada")}
      </p>
      <div className={estilos.imagemCampo}>
        <div className={`${estilos.imagemMiniatura} ${redonda ? estilos.imagemRedonda : ""}`} style={imagem ? { background: fundo } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imagem ? <img src={imagem} alt="" /> : <span>sem foto</span>}
        </div>
        <div className={estilos.imagemAcoes}>
          <label htmlFor={`${id}-arquivo`} className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini} ${estilos.botaoArquivo}`} aria-disabled={gravando}>
            {imagem ? "Trocar foto" : "Escolher foto"}
          </label>
          <input
            id={`${id}-arquivo`}
            type="file"
            accept={FORMATOS_ACEITOS.join(",")}
            className={estilos.arquivoOculto}
            disabled={gravando}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (!arquivo) return;
              const problema = erroDoFormato(arquivo);
              setErro(problema);
              if (!problema) escolher(arquivo);
            }}
          />
          {escolhido && <span className={estilos.dica}>{programada ? "Foto nova: sobe ao gravar a mudança." : "Sobe ao programar."}</span>}
        </div>
      </div>
      <CamposPeriodo id={id} inicio={inicio} fim={fim} aoMudarInicio={setInicio} aoMudarFim={setFim} />
      {erro && (
        <p className={estilos.erroCampo} role="alert">
          {erro}
        </p>
      )}
      <div className={estilos.programadoAcoes}>
        <button type="button" className={`${estilos.btn} ${estilos.btnMini}`} onClick={gravar} disabled={gravando || (!!programada && !mudou)}>
          {gravando ? "Gravando…" : programada ? "Gravar mudança" : "Programar"}
        </button>
        <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={tirar} disabled={gravando}>
          {programada ? "Tirar" : "Cancelar"}
        </button>
        {programada && <BotaoVer chave={`foto.${programada.id}`} rotulo={`Foto programada de ${periodoCurto(programada, agora)}`} />}
        <span className={estilos.dica}>Horário de Brasília.</span>
      </div>
    </div>
  );
}
