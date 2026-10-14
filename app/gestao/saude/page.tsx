import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/lib/acesso";
import { PLANO_FREE, medirArquivos, medirBanco, medirServidor, medirUso, proximoManterBanco } from "@/lib/saude";
import BotaoMedir from "./BotaoMedir";
import gestao from "../gestao.module.css";
import estilos from "./saude.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saúde do sistema — PageLinks" };

// ---------- formatos ----------

const FUSO = "America/Sao_Paulo";
const inteiro = new Intl.NumberFormat("pt-BR");
const dataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const diaMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });

function bytes(n: number) {
  if (n < 1024) return `${inteiro.format(n)} B`;
  const [valor, unidade] = n < 1024 ** 2 ? [n / 1024, "KB"] : n < 1024 ** 3 ? [n / 1024 ** 2, "MB"] : [n / 1024 ** 3, "GB"];
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: valor < 10 ? 1 : 0 })} ${unidade}`;
}
const pct = (f: number, casas = 0) => `${(f * 100).toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas })}%`;
function duracao(segundos: number) {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (d) return `${d} ${d === 1 ? "dia" : "dias"}${h ? ` e ${h} h` : ""}`;
  if (h) return `${h} h${m ? ` e ${m} min` : ""}`;
  return `${m} min`;
}

const REGIOES: Record<string, string> = {
  "us-west-2": "Oregon, EUA",
  "us-east-1": "Virgínia, EUA",
  "sa-east-1": "São Paulo",
  iad1: "Washington, EUA",
  pdx1: "Portland, EUA",
  sfo1: "São Francisco, EUA",
  cle1: "Cleveland, EUA",
  gru1: "São Paulo",
};
const regiao = (codigo: string | null) => (codigo ? `${REGIOES[codigo] ?? codigo} (${codigo})` : "não informada");

// ---------- níveis ----------

type Nivel = "ok" | "atencao" | "critico";
const NOME_DO_NIVEL: Record<Nivel, string> = { ok: "Em ordem", atencao: "Atenção", critico: "Crítico" };
/** uso de 0 a 1: até 70% em ordem, até 90% atenção, acima disso crítico */
const nivelDoUso = (f: number, atencao = 0.7, critico = 0.9): Nivel => (f >= critico ? "critico" : f >= atencao ? "atencao" : "ok");
const pior = (...n: Nivel[]): Nivel => (n.includes("critico") ? "critico" : n.includes("atencao") ? "atencao" : "ok");

type Verificacao = { nivel: Nivel; titulo: string; valor: string; explica: string };

function Medidor({ fracao, nivel, rotulo }: { fracao: number; nivel: Nivel; rotulo: string }) {
  return (
    <div className={estilos.medidor} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fracao * 100)} aria-label={rotulo}>
      <span className={estilos[nivel]} style={{ width: `${Math.max(1.5, Math.min(100, fracao * 100))}%` }} />
    </div>
  );
}

function Indisponivel({ titulo, erro }: { titulo: string; erro: string }) {
  return (
    <div className={estilos.cartao}>
      <p className={estilos.rotulo}>{titulo}</p>
      <p className={estilos.sub}>Não consegui medir agora: {erro}</p>
    </div>
  );
}

/**
 * Saúde do sistema: o que vale acompanhar do banco, do servidor dele, dos arquivos e do
 * uso, com um resumo em sinal verde, amarelo e vermelho. Cada visita mede de novo
 * (lib/saude.ts). Os limites são os do plano Free do Supabase (PLANO_FREE).
 */
export default async function Saude() {
  await exigirAdmin();
  const medidoEm = new Date();
  const [banco, servidor, arquivos, uso] = await Promise.all([medirBanco(), medirServidor(), medirArquivos(), medirUso()]);
  const proximo = proximoManterBanco(medidoEm);
  const regiaoDasFuncoes = process.env.VERCEL_REGION ?? null;

  // ---------- resumo ----------
  const verificacoes: Verificacao[] = [];
  if (banco.ok) {
    const f = banco.tamanho / PLANO_FREE.banco;
    verificacoes.push({ nivel: nivelDoUso(f), titulo: "Espaço do banco", valor: `${bytes(banco.tamanho)} de 500 MB (${pct(f, 1)})`, explica: "Passando de 500 MB, o plano gratuito deixa o banco só para leitura." });
    const fc = banco.conexoes.maximo ? banco.conexoes.total / banco.conexoes.maximo : 0;
    verificacoes.push({ nivel: nivelDoUso(fc), titulo: "Conexões abertas", valor: `${banco.conexoes.total} de ${banco.conexoes.maximo}`, explica: "Se chegar ao máximo, páginas e painel começam a dar erro." });
    verificacoes.push({
      nivel: banco.cache.acerto >= 0.99 ? "ok" : banco.cache.acerto >= 0.95 ? "atencao" : "critico",
      titulo: "Leituras vindas da memória",
      valor: pct(banco.cache.acerto, 2),
      explica: "Quanto das leituras o banco achou na memória, sem ir ao disco. Abaixo de 99%, a memória está curta.",
    });
    const distante = !!regiaoDasFuncoes && servidor.ok && servidor.regiao === "us-west-2" && !["pdx1", "sfo1"].includes(regiaoDasFuncoes);
    verificacoes.push({
      nivel: banco.latenciaMs < 100 ? "ok" : banco.latenciaMs < 300 ? "atencao" : "critico",
      titulo: "Tempo de resposta do banco",
      valor: `${banco.latenciaMs} ms por consulta`,
      explica: distante
        ? `As páginas rodam em ${regiao(regiaoDasFuncoes)} e o banco fica em Oregon: cada consulta faz essa viagem. Rodar as páginas em Portland (pdx1), ao lado do banco, deixaria cada consulta perto de zero.`
        : "Ida e volta de uma consulta simples, medida daqui.",
    });
    verificacoes.push({
      nivel: banco.transacoes.deadlocks === 0 && (!servidor.ok || servidor.reinicios === 0) ? "ok" : "atencao",
      titulo: "Travamentos e reinícios",
      valor: `${banco.transacoes.deadlocks} travamentos${servidor.ok ? ` · ${servidor.reinicios} reinícios` : ""}`,
      explica: "Travamento é quando duas gravações se esperam; reinício é o banco caindo e voltando.",
    });
  }
  if (servidor.ok) {
    const usada = servidor.memoria.total ? 1 - servidor.memoria.disponivel / servidor.memoria.total : 0;
    const swap = servidor.memoria.swapTotal ? 1 - servidor.memoria.swapLivre / servidor.memoria.swapTotal : 0;
    verificacoes.push({
      nivel: pior(nivelDoUso(usada, 0.8, 0.92), servidor.pressao.memoria > 0.05 ? "atencao" : "ok"),
      titulo: "Memória do servidor",
      valor: `${pct(usada)} em uso · ${bytes(servidor.memoria.disponivel)} livres`,
      explica: `O servidor tem ${bytes(servidor.memoria.total)} de RAM; o swap (memória de reserva no disco) está em ${pct(swap)}. O que importa é se alguém fica esperando memória: ${pct(servidor.pressao.memoria, 2)} do tempo.`,
    });
    const disco = servidor.disco.total ? 1 - servidor.disco.livre / servidor.disco.total : 0;
    verificacoes.push({ nivel: nivelDoUso(disco), titulo: "Disco do servidor", valor: `${pct(disco)} usado · ${bytes(servidor.disco.livre)} livres`, explica: "O disco onde moram os dados do banco." });
    const carga = servidor.cpu.carga5 / servidor.cpu.nucleos;
    verificacoes.push({
      nivel: carga >= 1 ? "critico" : carga >= 0.7 ? "atencao" : "ok",
      titulo: "Processador",
      valor: `carga de ${pct(carga)} (5 min)`,
      explica: `${servidor.cpu.nucleos} núcleos compartilhados. Acima de 100%, as consultas entram em fila.`,
    });
  }
  if (arquivos.ok) {
    const f = arquivos.total / PLANO_FREE.arquivos;
    verificacoes.push({ nivel: nivelDoUso(f), titulo: "Espaço dos arquivos", valor: `${bytes(arquivos.total)} de 1 GB (${pct(f, 1)})`, explica: `${inteiro.format(arquivos.arquivos)} imagens no Storage.` });
    verificacoes.push({
      nivel: arquivos.quebradas.length ? "critico" : "ok",
      titulo: "Imagens quebradas",
      valor: arquivos.quebradas.length ? `${arquivos.quebradas.length} na página de algum cliente` : "nenhuma",
      explica: "Imagem que a página mostra, mas o arquivo não existe mais no Storage (aparece quebrada para quem visita).",
    });
    verificacoes.push({
      nivel: arquivos.orfaos.arquivos ? "atencao" : "ok",
      titulo: "Arquivos sem uso",
      valor: arquivos.orfaos.arquivos ? `${arquivos.orfaos.arquivos} arquivos · ${bytes(arquivos.orfaos.bytes)}` : "nenhum",
      explica: "Arquivos no Storage que nenhuma página usa. Só ocupam espaço.",
    });
  }
  verificacoes.push({
    nivel: "atencao",
    titulo: "Cópia de segurança",
    valor: "não há backup automático",
    explica: "O plano gratuito do Supabase não guarda cópias do banco. Se algo for apagado, não tem como voltar pelo Supabase.",
  });
  verificacoes.push({
    nivel: proximo ? "ok" : "atencao",
    titulo: "Banco acordado",
    valor: proximo ? `próxima visita automática em ${dataHora.format(proximo)}` : "sem agendamento",
    explica: "O plano gratuito pausa o banco depois de 1 semana sem uso (e todas as páginas caem). A Vercel visita o banco a cada 5 dias para isso não acontecer.",
  });
  const ordem: Record<Nivel, number> = { critico: 0, atencao: 1, ok: 2 };
  verificacoes.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
  const contagem = { ok: 0, atencao: 0, critico: 0 };
  for (const v of verificacoes) contagem[v.nivel]++;

  const maxDia = uso.ok ? Math.max(1, ...uso.cliques.dias.map((d) => d.cliques)) : 1;
  const picoDia = uso.ok ? uso.cliques.dias.reduce((m, d) => (d.cliques > m.cliques ? d : m), uso.cliques.dias[0]) : null;

  return (
    <main className={gestao.env}>
      <div className={gestao.cabecalho}>
        <div>
          <p style={{ marginBottom: 6 }}>
            <Link href="/gestao" style={{ color: "var(--g-suave)", textDecoration: "none", fontSize: 13 }}>
              ← Todos os clientes
            </Link>
          </p>
          <h1>Saúde do sistema</h1>
          <p>
            Medido em {dataHora.format(medidoEm)} (horário de Brasília) · {contagem.ok} em ordem
            {contagem.atencao ? ` · ${contagem.atencao} pedem atenção` : ""}
            {contagem.critico ? ` · ${contagem.critico} críticos` : ""}
          </p>
        </div>
        <BotaoMedir />
      </div>

      {/* ---------- resumo ---------- */}
      <section className={estilos.secao} aria-labelledby="resumo">
        <h2 id="resumo">Resumo</h2>
        <ul className={estilos.verificacoes}>
          {verificacoes.map((v) => (
            <li key={v.titulo} data-nivel={v.nivel}>
              <span className={`${estilos.sinal} ${estilos[v.nivel]}`} aria-hidden="true" />
              <div>
                <p className={estilos.verificacaoTitulo}>
                  {v.titulo} <span className={estilos.nivelNome}>{NOME_DO_NIVEL[v.nivel]}</span>
                </p>
                <p className={estilos.verificacaoValor}>{v.valor}</p>
                <p className={estilos.sub}>{v.explica}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- servidor do banco ---------- */}
      <section className={estilos.secao} aria-labelledby="servidor">
        <h2 id="servidor">
          Servidor do banco <small>a máquina do Supabase onde o banco roda</small>
        </h2>
        {!servidor.ok ? (
          <Indisponivel titulo="Servidor" erro={servidor.erro} />
        ) : (
          <div className={estilos.grade}>
            {(() => {
              const usada = servidor.memoria.total - servidor.memoria.disponivel;
              const f = servidor.memoria.total ? usada / servidor.memoria.total : 0;
              const swapUsado = servidor.memoria.swapTotal - servidor.memoria.swapLivre;
              return (
                <div className={estilos.cartao}>
                  <p className={estilos.rotulo}>Memória (RAM)</p>
                  <p className={estilos.valor}>
                    {bytes(usada)} <small>de {bytes(servidor.memoria.total)}</small>
                  </p>
                  <Medidor fracao={f} nivel={nivelDoUso(f, 0.8, 0.92)} rotulo="Memória em uso" />
                  <p className={estilos.sub}>
                    {bytes(servidor.memoria.disponivel)} livres, contando {bytes(servidor.memoria.cache)} de cache que o sistema devolve quando precisa.
                    Swap: {bytes(swapUsado)} de {bytes(servidor.memoria.swapTotal)}.
                  </p>
                </div>
              );
            })()}
            {(() => {
              const usado = servidor.disco.total - servidor.disco.livre;
              const f = servidor.disco.total ? usado / servidor.disco.total : 0;
              return (
                <div className={estilos.cartao}>
                  <p className={estilos.rotulo}>Disco dos dados</p>
                  <p className={estilos.valor}>
                    {bytes(usado)} <small>de {bytes(servidor.disco.total)}</small>
                  </p>
                  <Medidor fracao={f} nivel={nivelDoUso(f)} rotulo="Disco em uso" />
                  <p className={estilos.sub}>Inclui o banco, os registros de alteração (WAL) e o sistema do Postgres. Não é o limite de 500 MB do plano.</p>
                </div>
              );
            })()}
            <div className={estilos.cartao}>
              <p className={estilos.rotulo}>Processador</p>
              <p className={estilos.valor}>
                {pct(servidor.cpu.carga5 / servidor.cpu.nucleos)} <small>de carga</small>
              </p>
              <Medidor fracao={servidor.cpu.carga5 / servidor.cpu.nucleos} nivel={nivelDoUso(servidor.cpu.carga5 / servidor.cpu.nucleos, 0.7, 1)} rotulo="Carga do processador" />
              <p className={estilos.sub}>
                {servidor.cpu.nucleos} núcleos compartilhados. Carga de 1, 5 e 15 min: {servidor.cpu.carga1.toLocaleString("pt-BR")} ·{" "}
                {servidor.cpu.carga5.toLocaleString("pt-BR")} · {servidor.cpu.carga15.toLocaleString("pt-BR")}. Uso médio desde que ligou:{" "}
                {pct(servidor.cpu.usoMedio, 1)}.
              </p>
            </div>
            <div className={estilos.cartao}>
              <p className={estilos.rotulo}>Esperas (pressão)</p>
              <dl className={estilos.lista}>
                <dt>Esperando memória</dt>
                <dd>{pct(servidor.pressao.memoria, 2)} do tempo</dd>
                <dt>Esperando disco</dt>
                <dd>{pct(servidor.pressao.disco, 2)} do tempo</dd>
                <dt>Esperando processador</dt>
                <dd>{pct(servidor.pressao.cpu, 2)} do tempo</dd>
              </dl>
              <p className={estilos.sub}>Desde que ligou. É o melhor sinal de aperto: abaixo de 5%, folga.</p>
            </div>
            <div className={estilos.cartao}>
              <p className={estilos.rotulo}>No ar</p>
              <p className={estilos.valor}>{duracao(servidor.ligadoSegundos)}</p>
              <dl className={estilos.lista}>
                <dt>Região</dt>
                <dd>{regiao(servidor.regiao)}</dd>
                <dt>Reinícios do banco</dt>
                <dd>{servidor.reinicios}</dd>
                <dt>Consultas atendidas</dt>
                <dd>{inteiro.format(servidor.consultasTotais)}</dd>
                <dt>Rede desde que ligou</dt>
                <dd>
                  {bytes(servidor.rede.enviados)} enviados · {bytes(servidor.rede.recebidos)} recebidos
                </dd>
              </dl>
            </div>
          </div>
        )}
      </section>

      {/* ---------- banco de dados ---------- */}
      <section className={estilos.secao} aria-labelledby="banco">
        <h2 id="banco">
          Banco de dados <small>{banco.ok ? banco.versao : "Postgres"}</small>
        </h2>
        {!banco.ok ? (
          <Indisponivel titulo="Banco" erro={banco.erro} />
        ) : (
          <>
            <div className={estilos.grade}>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Espaço usado</p>
                <p className={estilos.valor}>
                  {bytes(banco.tamanho)} <small>de 500 MB</small>
                </p>
                <Medidor fracao={banco.tamanho / PLANO_FREE.banco} nivel={nivelDoUso(banco.tamanho / PLANO_FREE.banco)} rotulo="Espaço do banco" />
                <p className={estilos.sub}>
                  Dados do PageLinks: {bytes(banco.doPageLinks)}. O resto é do próprio Supabase (catálogo do Postgres, login, controle dos arquivos), e conta no limite.
                </p>
              </div>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Memória do banco</p>
                <p className={estilos.valor}>
                  {pct(banco.cache.acerto, 2)} <small>das leituras na memória</small>
                </p>
                <Medidor fracao={banco.cache.acerto} nivel={banco.cache.acerto >= 0.99 ? "ok" : banco.cache.acerto >= 0.95 ? "atencao" : "critico"} rotulo="Leituras vindas da memória" />
                <p className={estilos.sub}>
                  Reservado para dados em memória: {bytes(banco.memoria.compartilhada)}; por consulta: {bytes(banco.memoria.porConsulta)}.{" "}
                  {inteiro.format(banco.cache.leituras)} leituras contadas.
                </p>
              </div>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Conexões</p>
                <p className={estilos.valor}>
                  {banco.conexoes.total} <small>de {banco.conexoes.maximo}</small>
                </p>
                <Medidor fracao={banco.conexoes.maximo ? banco.conexoes.total / banco.conexoes.maximo : 0} nivel={nivelDoUso(banco.conexoes.maximo ? banco.conexoes.total / banco.conexoes.maximo : 0)} rotulo="Conexões abertas" />
                <p className={estilos.sub}>
                  {banco.conexoes.ativas} trabalhando agora, {banco.conexoes.paradas} esperando, o resto são processos do próprio Supabase.
                </p>
              </div>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Tempo de resposta</p>
                <p className={estilos.valor}>
                  {banco.latenciaMs} ms <small>por consulta</small>
                </p>
                <dl className={estilos.lista}>
                  <dt>Mais rápida das 3</dt>
                  <dd>{banco.latenciaMinMs} ms</dd>
                  <dt>Páginas rodam em</dt>
                  <dd>{regiaoDasFuncoes ? regiao(regiaoDasFuncoes) : "máquina local"}</dd>
                  <dt>Banco fica em</dt>
                  <dd>{servidor.ok ? regiao(servidor.regiao) : "—"}</dd>
                </dl>
              </div>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Transações</p>
                <dl className={estilos.lista}>
                  <dt>Concluídas</dt>
                  <dd>{inteiro.format(banco.transacoes.commits)}</dd>
                  <dt>Desfeitas</dt>
                  <dd>{inteiro.format(banco.transacoes.rollbacks)}</dd>
                  <dt>Travamentos</dt>
                  <dd>{banco.transacoes.deadlocks}</dd>
                  <dt>Arquivos temporários</dt>
                  <dd>{bytes(banco.transacoes.temp)}</dd>
                </dl>
                <p className={estilos.sub}>Contadas desde {banco.ligadoDesde ? dataHora.format(banco.ligadoDesde) : "o último reinício"}.</p>
              </div>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Manutenção</p>
                <dl className={estilos.lista}>
                  <dt>Última limpeza automática</dt>
                  <dd>{banco.ultimaLimpeza ? dataHora.format(banco.ultimaLimpeza) : "ainda não precisou"}</dd>
                  <dt>Mudanças no banco aplicadas</dt>
                  <dd>{banco.migracoes.quantas}</dd>
                  <dt>Última</dt>
                  <dd className={estilos.tecnico}>{banco.migracoes.ultima ?? "—"}</dd>
                </dl>
              </div>
            </div>

            <div className={estilos.cartao}>
              <p className={estilos.rotulo}>Tabelas do PageLinks</p>
              <div className={estilos.rolagem}>
                <table className={estilos.tabela}>
                  <thead>
                    <tr>
                      <th>Tabela</th>
                      <th>Linhas</th>
                      <th>Tamanho</th>
                      <th>Índices</th>
                      <th title="Linhas apagadas ou alteradas que a limpeza automática ainda não recolheu">Linhas mortas</th>
                      <th>Última limpeza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banco.tabelas.map((t) => (
                      <tr key={t.tecnico}>
                        <td>
                          {t.nome} <span className={estilos.tecnico}>{t.tecnico}</span>
                        </td>
                        <td>{inteiro.format(t.linhas)}</td>
                        <td>{bytes(t.total)}</td>
                        <td>{bytes(t.indices)}</td>
                        <td>{inteiro.format(t.mortas)}</td>
                        <td>{t.vacuum ? dataHora.format(t.vacuum) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {banco.pesadas.length > 0 && (
              <details className={estilos.cartao}>
                <summary className={estilos.rotulo}>Consultas que mais tomam tempo do banco (para o técnico)</summary>
                <div className={estilos.rolagem}>
                  <table className={estilos.tabela}>
                    <thead>
                      <tr>
                        <th>Consulta</th>
                        <th>Vezes</th>
                        <th>Média</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {banco.pesadas.map((p, i) => (
                        <tr key={i}>
                          <td className={estilos.tecnico}>{p.consulta}</td>
                          <td>{inteiro.format(p.chamadas)}</td>
                          <td>{p.mediaMs.toLocaleString("pt-BR")} ms</td>
                          <td>{(p.totalMs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </>
        )}
      </section>

      {/* ---------- arquivos ---------- */}
      <section className={estilos.secao} aria-labelledby="arquivos">
        <h2 id="arquivos">
          Arquivos <small>as imagens no Storage do Supabase</small>
        </h2>
        {!arquivos.ok ? (
          <Indisponivel titulo="Arquivos" erro={arquivos.erro} />
        ) : (
          <>
            <div className={estilos.grade}>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Espaço usado</p>
                <p className={estilos.valor}>
                  {bytes(arquivos.total)} <small>de 1 GB</small>
                </p>
                <Medidor fracao={arquivos.total / PLANO_FREE.arquivos} nivel={nivelDoUso(arquivos.total / PLANO_FREE.arquivos)} rotulo="Espaço dos arquivos" />
                <p className={estilos.sub}>
                  {inteiro.format(arquivos.arquivos)} imagens, em média {bytes(arquivos.arquivos ? arquivos.total / arquivos.arquivos : 0)}; a maior tem {bytes(arquivos.maior)}.
                  {arquivos.externas ? ` ${arquivos.externas} imagens vêm de endereços de fora e não contam aqui.` : ""}
                </p>
              </div>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Arquivos sem uso</p>
                <p className={estilos.valor}>
                  {arquivos.orfaos.arquivos} <small>{bytes(arquivos.orfaos.bytes)}</small>
                </p>
                <p className={estilos.sub}>
                  {arquivos.orfaos.arquivos
                    ? "Estão no Storage, mas nenhuma página usa. Sobraram de trocas e exclusões de antes da limpeza automática; dá para apagar sem efeito nas páginas."
                    : "Toda imagem no Storage está em uso em alguma página."}
                </p>
              </div>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Imagens quebradas</p>
                <p className={estilos.valor}>{arquivos.quebradas.length}</p>
                {arquivos.quebradas.length ? (
                  <ul className={estilos.quebradas}>
                    {arquivos.quebradas.slice(0, 8).map((q, i) => (
                      <li key={i}>
                        <Link href={`/gestao/${q.cliente.slug}`}>{q.cliente.nome}</Link>: {q.onde}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={estilos.sub}>Toda imagem que as páginas mostram existe no Storage.</p>
                )}
              </div>
            </div>
            <div className={estilos.cartao}>
              <p className={estilos.rotulo}>Quem ocupa mais espaço</p>
              <ul className={estilos.barras}>
                {arquivos.porCliente.slice(0, 10).map((c, i) => (
                  <li key={i}>
                    <span className={estilos.barraNome}>{c.cliente.slug ? <Link href={`/gestao/${c.cliente.slug}`}>{c.cliente.nome}</Link> : c.cliente.nome}</span>
                    <span className={estilos.barraTrilho}>
                      <span style={{ width: `${(c.bytes / (arquivos.porCliente[0]?.bytes || 1)) * 100}%` }} />
                    </span>
                    <span className={estilos.barraValor}>
                      {bytes(c.bytes)} · {c.arquivos}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      {/* ---------- uso ---------- */}
      <section className={estilos.secao} aria-labelledby="uso">
        <h2 id="uso">
          Uso <small>o que existe no sistema</small>
        </h2>
        {!uso.ok ? (
          <Indisponivel titulo="Uso" erro={uso.erro} />
        ) : (
          <>
            <div className={estilos.numeros}>
              {[
                [uso.clientes, "clientes", `${uso.ativos} ativos · ${uso.noAr} no ar · ${uso.conferidos} conferidos`],
                [uso.paginas, "páginas", ""],
                [uso.blocos, "blocos", ""],
                [uso.icones, "ícones de redes", ""],
                [uso.imagensCarrossel, "imagens de carrossel", ""],
                [uso.cliques.total, "cliques registrados", `${inteiro.format(uso.cliques.ultimos30)} nos últimos 30 dias`],
              ].map(([n, rotulo, sub]) => (
                <div key={String(rotulo)} className={estilos.cartao}>
                  <p className={estilos.valor}>{inteiro.format(Number(n))}</p>
                  <p className={estilos.rotulo}>{rotulo}</p>
                  {sub && <p className={estilos.sub}>{sub}</p>}
                </div>
              ))}
            </div>
            <div className={estilos.cartao}>
              <p className={estilos.rotulo}>Blocos por tipo</p>
              <ul className={estilos.tipos}>
                {uso.porTipo.map((t) => (
                  <li key={t.tipo} style={{ background: `var(--g-tipo-${t.tipo}, var(--g-card-2))`, color: `var(--g-tipo-${t.tipo}-texto, var(--g-texto))` }}>
                    {t.tipo} <b>{t.quantos}</b>
                  </li>
                ))}
              </ul>
            </div>
            <div className={estilos.duasColunas}>
              <figure className={estilos.cartao}>
                <figcaption className={estilos.rotulo}>Cliques por dia, últimos 30 dias</figcaption>
                <svg
                  className={estilos.grafico}
                  viewBox="0 0 600 150"
                  role="img"
                  aria-label={`Cliques por dia nos últimos 30 dias: ${uso.cliques.ultimos30} no total${picoDia && picoDia.cliques ? `, o dia com mais foi ${diaMes.format(new Date(picoDia.dia))}, com ${picoDia.cliques}` : ""}.`}
                >
                  {uso.cliques.dias.map((d, i) => {
                    const altura = (d.cliques / maxDia) * 110;
                    return (
                      <g key={d.dia}>
                        <rect x={i * 20 + 2} y={120 - altura} width={16} height={Math.max(altura, d.cliques ? 2 : 1)} rx={3} className={d.cliques ? estilos.barraDia : estilos.barraVazia}>
                          <title>{`${diaMes.format(new Date(d.dia))}: ${d.cliques} ${d.cliques === 1 ? "clique" : "cliques"}`}</title>
                        </rect>
                        {i % 5 === 4 && (
                          // o último encosta na borda direita: alinhado pelo fim, senão sai cortado
                          <text x={i === 29 ? 598 : i * 20 + 10} y={140} textAnchor={i === 29 ? "end" : "middle"} className={estilos.eixo}>
                            {diaMes.format(new Date(d.dia))}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </figure>
              <div className={estilos.cartao}>
                <p className={estilos.rotulo}>Páginas mais clicadas, 30 dias</p>
                {uso.maisClicadas.length ? (
                  <ol className={estilos.ranking}>
                    {uso.maisClicadas.map((m) => (
                      <li key={m.slug}>
                        <Link href={`/gestao/${m.slug}`}>{m.nome}</Link> <b>{inteiro.format(m.cliques)}</b>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={estilos.sub}>Nenhum clique nos últimos 30 dias.</p>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ---------- plano ---------- */}
      <section className={estilos.secao} aria-labelledby="plano">
        <h2 id="plano">
          Plano e infraestrutura <small>os limites que valem hoje</small>
        </h2>
        <div className={estilos.cartao}>
          <dl className={estilos.lista}>
            <dt>Banco</dt>
            <dd>500 MB</dd>
            <dt>Arquivos</dt>
            <dd>1 GB</dd>
            <dt>Saída de dados</dt>
            <dd>{PLANO_FREE.saida} (não dá para medir daqui: fica no painel do Supabase, em Usage)</dd>
            <dt>Servidor</dt>
            <dd>{PLANO_FREE.memoria}</dd>
            <dt>Pausa</dt>
            <dd>{PLANO_FREE.pausa}; a Vercel visita o banco a cada 5 dias às 9h (horário de Brasília)</dd>
            <dt>Backup</dt>
            <dd>não incluído no plano gratuito</dd>
            <dt>Páginas e painel</dt>
            <dd>Vercel, rodando em {regiaoDasFuncoes ? regiao(regiaoDasFuncoes) : "máquina local"}</dd>
          </dl>
          <p className={estilos.sub}>
            Limites do plano Free do Supabase conferidos em {PLANO_FREE.conferidoEm} em{" "}
            <a href={PLANO_FREE.fonte} target="_blank" rel="noreferrer">
              supabase.com/pricing
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
