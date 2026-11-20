"use client";

import { useId, useState } from "react";
import { removerAparenciaProgramada, salvarAparenciaProgramada, type AparenciaProgramadaDaPagina } from "../acoes";
import { MAXIMO_DE_PROGRAMACOES, type Aparencia } from "@/lib/programacoes";
import { ESTILOS_BOTAO, FONTES, RAIO, TIPOS_DE_FUNDO } from "@/lib/tema";
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

const CAMPOS: (keyof Aparencia)[] = ["corFundo", "corTexto", "corDestaque", "corTextoBotao", "fonte", "estiloBotao", "fundoTipo", "fundoCorFim", "fundoImagemUrl"];

const daProgramada = (p: AparenciaProgramadaDaPagina): Aparencia => Object.fromEntries(CAMPOS.map((c) => [c, p[c]])) as Aparencia;

/**
 * Aparências programadas, no fim da Aparência (lib/programacoes.ts): no período de cada uma, cores,
 * fonte, formato dos botões e fundo da página são os dela, e voltam sozinhos aos de cima quando ele
 * acaba. A nova já vem com a aparência de agora, para mexer só no que muda na ação.
 */
export default function AparenciasProgramadas({
  paginaId,
  programadas,
  base,
  agora,
}: {
  paginaId: string;
  programadas: AparenciaProgramadaDaPagina[];
  /** a aparência de sempre da página: o ponto de partida da nova */
  base: Aparencia;
  agora: number;
}) {
  const { nova, abrir, terminar } = useLinhaNova(programadas.map((p) => p.id));
  const cabe = programadas.length < MAXIMO_DE_PROGRAMACOES;

  return (
    <div className={estilos.programacaoSecao}>
      <h3>
        Aparência programada<small>outra aparência num período, para uma ação ou campanha</small>
      </h3>
      <div className={estilos.programados}>
        {programadas.map((p) => (
          <Linha key={chaveDaLinha(p, ...CAMPOS.map((c) => p[c]))} paginaId={paginaId} programada={p} base={base} agora={agora} />
        ))}
        {nova && <Linha paginaId={paginaId} base={base} agora={agora} aoTerminar={terminar} />}

        <div className={estilos.programadosRodape}>
          {!nova && cabe && (
            <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={abrir}>
              {programadas.length ? "+ Programar outra aparência" : "+ Programar uma aparência"}
            </button>
          )}
          <span className={estilos.dica}>
            {programadas.length
              ? `${programadas.length} de ${MAXIMO_DE_PROGRAMACOES} programações. ${cabe ? "" : "Quando uma acabar, abre espaço. "}Fora dos períodos, vale a aparência de cima.`
              : "Troca cores, fonte, botões e fundo sozinha num período e volta para a aparência de cima quando acaba."}
          </span>
        </div>
      </div>
    </div>
  );
}

function Linha({
  paginaId,
  programada,
  base,
  agora,
  aoTerminar,
}: {
  paginaId: string;
  programada?: AparenciaProgramadaDaPagina;
  base: Aparencia;
  agora: number;
  /** linha nova: gravou (com o id, para sumir quando a gravada chegar na lista) ou cancelou (sem) */
  aoTerminar?: (gravada?: string) => void;
}) {
  const id = useId();
  const inicial = {
    valores: programada ? daProgramada(programada) : base,
    inicio: paraCampoDeHorario(programada?.inicio),
    fim: paraCampoDeHorario(programada?.fim),
  };
  // a gravada abre fechada, só com o resumo; a nova já abre para preencher
  const [aberta, setAberta] = useState(!programada);
  const [valores, setValores] = useState<Aparencia>(inicial.valores);
  const [inicio, setInicio] = useState(inicial.inicio);
  const [fim, setFim] = useState(inicial.fim);
  const { escolhido, escolher } = useArquivoEscolhido();
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [tirada, setTirada] = useState(false);
  const { ver, setVer } = useVer();
  const situacao = situacaoDa(programada, agora);
  const mudou = !!escolhido || inicio !== inicial.inicio || fim !== inicial.fim || CAMPOS.some((c) => valores[c] !== inicial.valores[c]);
  const imagem = escolhido?.previa ?? valores.fundoImagemUrl;

  const mudar = (campo: keyof Aparencia) => (valor: string) => setValores((v) => ({ ...v, [campo]: valor }));

  function fechar() {
    // fechar sem gravar desfaz o que foi mexido
    setValores(inicial.valores);
    setInicio(inicial.inicio);
    setFim(inicial.fim);
    escolher(null);
    setErro(null);
    setAberta(false);
  }

  async function gravar() {
    if (gravando || (programada && !mudou)) return;
    setErro(null);
    setGravando(true);
    const dados = new FormData();
    for (const campo of ["corFundo", "corTexto", "corDestaque", "corTextoBotao", "fonte", "estiloBotao", "fundoTipo", "fundoCorFim"] as const) {
      dados.append(campo, valores[campo] ?? "");
    }
    dados.append("imagemAtual", valores.fundoImagemUrl ?? "");
    dados.append("inicio", inicio);
    dados.append("fim", fim);
    if (escolhido) {
      const pronto = await prepararArquivo(escolhido.arquivo, "fundo");
      if ("erro" in pronto) {
        setGravando(false);
        return setErro(pronto.erro);
      }
      dados.append("arquivo", pronto.arquivo);
    }
    const resposta: { erro?: string; id?: string } = await salvarAparenciaProgramada(paginaId, programada?.id ?? null, dados).catch(() => ({
      erro: "Não consegui gravar. Tente de novo.",
    }));
    if (resposta.erro) {
      setGravando(false);
      return setErro(resposta.erro);
    }
    if (programada) setGravando(false);
    else aoTerminar?.(resposta.id);
  }

  async function tirar() {
    if (!programada) return aoTerminar?.();
    const aviso = situacao === "ativa" ? "\n\nEla está no ar: a página volta na hora para a aparência de sempre." : "";
    if (!confirm(`Tirar a aparência programada de ${periodoCurto(programada, agora)}?${aviso}`)) return;
    setErro(null);
    setGravando(true);
    const resposta = await removerAparenciaProgramada(programada.id).catch(() => ({ erro: "Não consegui tirar. Tente de novo." }));
    setGravando(false);
    if (resposta.erro) return setErro(resposta.erro);
    setTirada(true);
    if (ver?.chave === `aparencia.${programada.id}`) setVer(null);
  }

  if (tirada) return null;

  const botoes = (
    <div className={estilos.programadoAcoes}>
      {aberta ? (
        <>
          <button type="button" className={`${estilos.btn} ${estilos.btnMini}`} onClick={gravar} disabled={gravando || (!!programada && !mudou)}>
            {gravando ? "Gravando…" : programada ? "Gravar mudança" : "Programar"}
          </button>
          <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={programada ? fechar : tirar} disabled={gravando}>
            {programada ? "Fechar" : "Cancelar"}
          </button>
        </>
      ) : (
        <button type="button" className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} onClick={() => setAberta(true)}>
          Editar
        </button>
      )}
      {programada && (
        <>
          <BotaoVer chave={`aparencia.${programada.id}`} rotulo={`Aparência programada de ${periodoCurto(programada, agora)}`} />
          <button type="button" className={`${estilos.btn} ${estilos.btnPerigo} ${estilos.btnMini}`} onClick={tirar} disabled={gravando}>
            Tirar
          </button>
        </>
      )}
      {aberta && <span className={estilos.dica}>Horário de Brasília.</span>}
    </div>
  );

  return (
    <div className={estilos.programado} data-situacao={situacao} onKeyDown={enterGrava(gravar)}>
      <p className={estilos.programadoTitulo}>
        <span className={estilos.programadoSinal} aria-hidden="true" />
        {tituloDa(programada, agora, "Nova aparência programada")}
      </p>
      <Resumo valores={valores} imagem={imagem} />

      {aberta && (
        <>
          <div className={estilos.doisCampos}>
            <Cor id={`${id}-fundo`} rotulo="Fundo" valor={valores.corFundo} aoMudar={mudar("corFundo")} />
            <Cor id={`${id}-texto`} rotulo="Texto" valor={valores.corTexto} aoMudar={mudar("corTexto")} />
          </div>
          <div className={estilos.doisCampos}>
            <Cor id={`${id}-botoes`} rotulo="Botões" valor={valores.corDestaque} aoMudar={mudar("corDestaque")} />
            <Cor id={`${id}-texto-botao`} rotulo="Texto dentro do botão" valor={valores.corTextoBotao} aoMudar={mudar("corTextoBotao")} />
          </div>
          <div className={estilos.doisCampos}>
            <div className={estilos.campo}>
              <label htmlFor={`${id}-fonte`}>Fonte</label>
              <select id={`${id}-fonte`} value={valores.fonte} onChange={(e) => mudar("fonte")(e.target.value)}>
                {FONTES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className={estilos.campo}>
              <label htmlFor={`${id}-estilo`}>Formato dos botões</label>
              <select id={`${id}-estilo`} value={valores.estiloBotao} onChange={(e) => mudar("estiloBotao")(e.target.value)}>
                {ESTILOS_BOTAO.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={estilos.doisCampos}>
            <div className={estilos.campo}>
              <label htmlFor={`${id}-tipo`}>Tipo de fundo</label>
              <select
                id={`${id}-tipo`}
                value={valores.fundoTipo}
                onChange={(e) => {
                  const tipo = e.target.value;
                  // o degradê precisa da segunda cor: começa na cor do fundo
                  setValores((v) => ({ ...v, fundoTipo: tipo, fundoCorFim: tipo === "gradiente" && !v.fundoCorFim ? v.corFundo : v.fundoCorFim }));
                }}
              >
                {TIPOS_DE_FUNDO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            {valores.fundoTipo === "gradiente" && (
              <Cor id={`${id}-cor-fim`} rotulo="Segunda cor do degradê" valor={valores.fundoCorFim ?? valores.corFundo} aoMudar={mudar("fundoCorFim")} />
            )}
          </div>
          {valores.fundoTipo === "imagem" && (
            <div className={estilos.campo}>
              <span className={estilos.rotuloSolto}>Imagem de fundo</span>
              <div className={estilos.imagemCampo}>
                <div className={estilos.imagemMiniatura}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {imagem ? <img src={imagem} alt="" /> : <span>sem imagem</span>}
                </div>
                <div className={estilos.imagemAcoes}>
                  <label htmlFor={`${id}-arquivo`} className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini} ${estilos.botaoArquivo}`} aria-disabled={gravando}>
                    {imagem ? "Trocar imagem" : "Escolher imagem"}
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
                  {imagem && (
                    <button
                      type="button"
                      className={`${estilos.btn} ${estilos.btnPerigo} ${estilos.btnMini}`}
                      onClick={() => {
                        escolher(null);
                        setValores((v) => ({ ...v, fundoImagemUrl: null }));
                      }}
                      disabled={gravando}
                    >
                      Tirar imagem
                    </button>
                  )}
                </div>
              </div>
              {!programada && !escolhido && valores.fundoImagemUrl && valores.fundoImagemUrl === base.fundoImagemUrl && (
                <span className={estilos.dica}>É a mesma imagem de fundo da página. Troque para usar outra na ação.</span>
              )}
            </div>
          )}
          <CamposPeriodo id={id} inicio={inicio} fim={fim} aoMudarInicio={setInicio} aoMudarFim={setFim} />
        </>
      )}
      {erro && (
        <p className={estilos.erroCampo} role="alert">
          {erro}
        </p>
      )}
      {botoes}
    </div>
  );
}

/** A aparência em miniatura: o fundo, um texto e um botão nas cores e no formato dela, e o nome da fonte. */
function Resumo({ valores, imagem }: { valores: Aparencia; imagem: string | null }) {
  const fundo =
    valores.fundoTipo === "gradiente" && valores.fundoCorFim
      ? `linear-gradient(160deg, ${valores.corFundo} 0%, ${valores.fundoCorFim} 100%)`
      : valores.fundoTipo === "imagem" && imagem
        ? `${valores.corFundo} url(${JSON.stringify(imagem)}) center/cover no-repeat`
        : valores.corFundo;
  const contorno = valores.estiloBotao === "contorno";
  return (
    <div className={estilos.aparenciaResumo}>
      <span className={estilos.aparenciaAmostra} style={{ background: fundo, color: valores.corTexto }} aria-hidden="true">
        <span>Aa</span>
        <span
          className={estilos.aparenciaBotao}
          style={{
            background: contorno ? "transparent" : valores.corDestaque,
            color: contorno ? valores.corDestaque : valores.corTextoBotao,
            border: contorno ? `2px solid ${valores.corDestaque}` : "none",
            borderRadius: RAIO[valores.estiloBotao] ?? RAIO.arredondado,
          }}
        >
          Botão
        </span>
      </span>
      <span className={estilos.dica}>
        {valores.fonte} · {ESTILOS_BOTAO.find((e) => e.valor === valores.estiloBotao)?.nome ?? valores.estiloBotao} ·{" "}
        {TIPOS_DE_FUNDO.find((t) => t.valor === valores.fundoTipo)?.nome ?? valores.fundoTipo}
      </span>
    </div>
  );
}

/** Seletor de cor com o hex ao lado, como o CampoCor, sem name: não entra no Salvar da Aparência. */
function Cor({ id, rotulo, valor, aoMudar }: { id: string; rotulo: string; valor: string; aoMudar: (valor: string) => void }) {
  const valida = /^#[0-9a-fA-F]{6}$/.test(valor);
  return (
    <div className={estilos.campo}>
      <label htmlFor={id}>{rotulo}</label>
      <div className={estilos.cor}>
        <input type="color" value={valida ? valor : "#000000"} onChange={(e) => aoMudar(e.target.value.toUpperCase())} aria-label={`${rotulo}, seletor visual`} />
        <input id={id} type="text" value={valor} onChange={(e) => aoMudar(e.target.value)} spellCheck={false} />
      </div>
    </div>
  );
}
