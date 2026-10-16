"use client";

import { useId, useState } from "react";
import { removerLinkProgramado, salvarLinkProgramado, type LinkProgramadoDoBloco } from "../acoes";
import { MAXIMO_DE_LINKS_PROGRAMADOS } from "@/lib/linksProgramados";
import { dataHoraCurta, paraCampoDeHorario } from "@/lib/horario";
import estilos from "../gestao.module.css";

/**
 * Links programados do bloco, logo abaixo do endereço de destino: no período de cada um, o
 * bloco leva para ele no lugar do principal (lib/linksProgramados.ts). Cada linha grava no
 * próprio botão; os campos não têm name, então não entram no Salvar bloco em volta.
 * Amarela = ainda vai entrar, verde = no ar agora. Os que já acabaram nem chegam aqui (o
 * editor só busca os que não acabaram), e sem nenhum vale só o endereço de destino.
 */
export default function LinksProgramados({ cardId, programados, agora }: { cardId: string; programados: LinkProgramadoDoBloco[]; agora: number }) {
  const [novo, setNovo] = useState(false);
  // A linha nova fica à vista ("Gravando…") até a gravada chegar do servidor, que vem logo
  // depois da resposta da ação: fechar na hora deixava um vão em que a programação sumia.
  const [esperando, setEsperando] = useState<string | null>(null);
  if (esperando && programados.some((p) => p.id === esperando)) {
    setEsperando(null);
    setNovo(false);
  }
  const cabe = programados.length < MAXIMO_DE_LINKS_PROGRAMADOS;

  return (
    <div className={estilos.programados}>
      {programados.map((p) => (
        // a chave muda quando o servidor devolve a versão gravada: a linha volta a mostrar o que vale
        <Linha key={`${p.id}|${p.url}|${new Date(p.inicio).getTime()}|${new Date(p.fim).getTime()}`} cardId={cardId} programado={p} agora={agora} />
      ))}
      {novo && <Linha cardId={cardId} agora={agora} aoTerminar={(gravado) => (gravado ? setEsperando(gravado) : setNovo(false))} />}

      <div className={estilos.programadosRodape}>
        {!novo && cabe && (
          <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={() => setNovo(true)}>
            + Programar outro link
          </button>
        )}
        <span className={estilos.dica}>
          {programados.length
            ? `${programados.length} de ${MAXIMO_DE_LINKS_PROGRAMADOS} programações. ${cabe ? "" : "Quando uma acabar, abre espaço. "}Fora dos períodos, vale o endereço de destino.`
            : "Troca o link sozinho num período (uma campanha, um evento) e volta para o endereço de destino quando acaba."}
        </span>
      </div>
    </div>
  );
}

function Linha({
  cardId,
  programado,
  agora,
  aoTerminar,
}: {
  cardId: string;
  programado?: LinkProgramadoDoBloco;
  agora: number;
  /** linha nova: gravou (com o id, para sumir quando a gravada chegar na lista) ou cancelou (sem) */
  aoTerminar?: (gravado?: string) => void;
}) {
  const id = useId();
  const inicial = {
    url: programado?.url ?? "",
    inicio: paraCampoDeHorario(programado?.inicio),
    fim: paraCampoDeHorario(programado?.fim),
  };
  const [url, setUrl] = useState(inicial.url);
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  // tirada: some na hora, sem esperar a lista nova do servidor
  const [tirada, setTirada] = useState(false);
  const mudou = url !== inicial.url || inicio !== inicial.inicio || fim !== inicial.fim;

  const situacao = !programado ? "nova" : new Date(programado.inicio).getTime() <= agora ? "ativa" : "futura";
  const titulo =
    !programado ? "Nova programação"
    : situacao === "ativa" ? `No ar agora · até ${dataHoraCurta(programado.fim, agora)}`
    : `Entra em ${dataHoraCurta(programado.inicio, agora)} · vai até ${dataHoraCurta(programado.fim, agora)}`;

  async function gravar() {
    if (gravando || (programado && !mudou)) return;
    setErro(null);
    setGravando(true);
    const resposta: { erro?: string; id?: string } = await salvarLinkProgramado(cardId, programado?.id ?? null, url, inicio, fim).catch(() => ({ erro: "Não consegui gravar. Tente de novo." }));
    if (resposta.erro) {
      setGravando(false);
      return setErro(resposta.erro);
    }
    // a linha nova continua em "Gravando…" até sumir; a que já existia volta ao normal
    if (programado) setGravando(false);
    else aoTerminar?.(resposta.id);
  }

  async function tirar() {
    if (!programado) return aoTerminar?.();
    if (!confirm(`Tirar a programação de ${programado.url}?${situacao === "ativa" ? "\n\nEla está no ar: o bloco volta na hora para o endereço de destino." : ""}`)) return;
    setErro(null);
    setGravando(true);
    const resposta = await removerLinkProgramado(programado.id).catch(() => ({ erro: "Não consegui tirar. Tente de novo." }));
    setGravando(false);
    if (resposta.erro) setErro(resposta.erro);
    else setTirada(true);
  }

  if (tirada) return null;

  return (
    <div
      className={estilos.programado}
      data-situacao={situacao}
      onKeyDown={(e) => {
        // Enter grava esta linha, em vez de enviar o formulário do bloco em volta
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          gravar();
        }
      }}
    >
      <p className={estilos.programadoTitulo}>
        <span className={estilos.programadoSinal} aria-hidden="true" />
        {titulo}
      </p>
      <div className={estilos.programadoCampos}>
        <div className={`${estilos.campo} ${estilos.programadoLink}`}>
          <label htmlFor={`${id}-url`}>Link no período</label>
          <input id={`${id}-url`} type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoFocus={!programado} />
        </div>
        <div className={estilos.campo}>
          <label htmlFor={`${id}-inicio`}>De</label>
          <input id={`${id}-inicio`} type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className={estilos.campo}>
          <label htmlFor={`${id}-fim`}>Até</label>
          <input id={`${id}-fim`} type="datetime-local" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
        </div>
      </div>
      {erro && (
        <p className={estilos.erroCampo} role="alert">
          {erro}
        </p>
      )}
      <div className={estilos.programadoAcoes}>
        <button type="button" className={`${estilos.btn} ${estilos.btnMini}`} onClick={gravar} disabled={gravando || (!!programado && !mudou)}>
          {gravando ? "Gravando…" : programado ? "Gravar mudança" : "Programar"}
        </button>
        <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={tirar} disabled={gravando}>
          {programado ? "Tirar" : "Cancelar"}
        </button>
        <span className={estilos.dica}>Horário de Brasília.</span>
      </div>
    </div>
  );
}
