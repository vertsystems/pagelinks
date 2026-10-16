import { prisma } from "@/lib/prisma";

/**
 * Medições da página Saúde do sistema (/gestao/saude). Cada parte é medida em separado e
 * devolve `erro` em vez de derrubar a página: se o endpoint de métricas do Supabase cair,
 * o resto continua aparecendo.
 *
 * Fontes: o próprio Postgres (tamanho, cache, conexões, tabelas, pg_stat_statements), a
 * tabela storage.objects (os arquivos do bucket) e o endpoint de métricas do servidor do
 * Supabase (formato Prometheus, autenticado com a chave secreta): memória, disco, CPU.
 */

/** Limites do plano Free do Supabase, conferidos em supabase.com/pricing em 14/10/2026. */
export const PLANO_FREE = {
  banco: 500 * 1024 * 1024,
  arquivos: 1024 * 1024 * 1024,
  saida: "5 GB de saída de dados (egress) por mês, e mais 5 GB de saída em cache",
  memoria: "CPU compartilhada e 500 MB de RAM",
  pausa: "pausado depois de 1 semana sem uso",
  backup: false,
  conferidoEm: "14/10/2026",
  fonte: "https://supabase.com/pricing",
};

const BUCKET = "imagens";
const numero = (v: unknown) => (typeof v === "bigint" ? Number(v) : Number(v ?? 0));
const consulta = <T>(sql: string) => prisma.$queryRawUnsafe<T[]>(sql);

type Medicao<T> = ({ ok: true } & T) | { ok: false; erro: string };
async function medir<T>(fn: () => Promise<T>): Promise<Medicao<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    console.error("saúde:", e);
    return { ok: false, erro: e instanceof Error ? e.message.slice(0, 160) : "falhou" };
  }
}

// ---------- banco ----------

const NOMES_DAS_TABELAS: Record<string, string> = {
  Cliente: "Clientes",
  Pagina: "Páginas",
  Card: "Blocos",
  Icone: "Ícones das redes",
  ImagemCarrossel: "Imagens de carrossel",
  Unidade: "Unidades",
  LinkProgramado: "Links programados",
  Redirecionamento: "Redirecionamentos",
  Clique: "Cliques",
  Usuario: "Usuários do painel",
  _prisma_migrations: "Histórico de mudanças no banco",
};

export function medirBanco() {
  return medir(async () => {
    // tempo de resposta: três idas e voltas, vale a do meio
    const tempos: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      await consulta("select 1");
      tempos.push(performance.now() - t0);
    }
    tempos.sort((a, b) => a - b);

    const [tamanhoTotal, info, tamanhos, tabelas, conexoes, ajustes, cache, manutencao, pesadas, migracoes] = await Promise.all([
      consulta<{ bytes: bigint }>("select pg_database_size(current_database()) as bytes"),
      consulta<{ versao: string; inicio: Date }>(`select split_part(version(), ' on ', 1) as versao, pg_postmaster_start_time() as inicio`),
      consulta<{ esquema: string; bytes: bigint }>(
        `select n.nspname as esquema, sum(pg_total_relation_size(c.oid)) as bytes from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind in ('r','m') group by 1`,
      ),
      consulta<{ tabela: string; total: bigint; indices: bigint; linhas: bigint; mortas: bigint; vacuum: Date | null }>(
        `select c.relname as tabela, pg_total_relation_size(c.oid) as total, pg_indexes_size(c.oid) as indices,
                coalesce(s.n_live_tup, 0) as linhas, coalesce(s.n_dead_tup, 0) as mortas,
                greatest(s.last_autovacuum, s.last_vacuum) as vacuum
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
           left join pg_stat_user_tables s on s.relid = c.oid
          where c.relkind = 'r' and n.nspname = 'public' order by 2 desc`,
      ),
      consulta<{ estado: string | null; quantas: bigint }>(`select state as estado, count(*) as quantas from pg_stat_activity where datname = current_database() group by 1`),
      consulta<{ name: string; setting: string; unit: string | null }>(
        `select name, setting, unit from pg_settings where name in ('max_connections','shared_buffers','work_mem','effective_cache_size')`,
      ),
      consulta<{ hit: bigint; read: bigint; commits: bigint; rollbacks: bigint; deadlocks: bigint; temp: bigint }>(
        `select blks_hit as hit, blks_read as read, xact_commit as commits, xact_rollback as rollbacks, deadlocks, temp_bytes as temp from pg_stat_database where datname = current_database()`,
      ),
      consulta<{ ultimo: Date | null }>(`select max(greatest(last_autovacuum, last_vacuum)) as ultimo from pg_stat_user_tables where schemaname = 'public'`),
      consulta<{ consulta: string; chamadas: bigint; total: number; media: number }>(
        `select regexp_replace(query, '\\s+', ' ', 'g') as consulta, calls as chamadas, total_exec_time as total, mean_exec_time as media
           from pg_stat_statements where query ~* '"(Cliente|Pagina|Card|Icone|Clique|ImagemCarrossel|Unidade|LinkProgramado|Redirecionamento|Usuario)"'
          order by total_exec_time desc limit 6`,
      ).catch(() => []),
      consulta<{ nome: string; quando: Date }>(`select migration_name as nome, finished_at as quando from _prisma_migrations where finished_at is not null order by finished_at desc`),
    ]);

    const porEsquema = Object.fromEntries(tamanhos.map((t) => [t.esquema, numero(t.bytes)]));
    const ajuste = (nome: string) => {
      const a = ajustes.find((x) => x.name === nome);
      if (!a) return 0;
      const unidade = a.unit === "8kB" ? 8192 : a.unit === "kB" ? 1024 : 1;
      return Number(a.setting) * unidade;
    };
    const c = cache[0];
    const conexoesPorEstado = Object.fromEntries(conexoes.map((x) => [x.estado ?? "processos do sistema", numero(x.quantas)]));

    return {
      latenciaMs: Math.round(tempos[1]),
      latenciaMinMs: Math.round(tempos[0]),
      versao: info[0]?.versao ?? "",
      ligadoDesde: info[0]?.inicio ?? null,
      tamanho: numero(tamanhoTotal[0]?.bytes),
      doPageLinks: porEsquema.public ?? 0,
      tabelas: tabelas.map((t) => ({
        nome: NOMES_DAS_TABELAS[t.tabela] ?? t.tabela,
        tecnico: t.tabela,
        total: numero(t.total),
        indices: numero(t.indices),
        linhas: numero(t.linhas),
        mortas: numero(t.mortas),
        vacuum: t.vacuum,
      })),
      conexoes: {
        total: Object.values(conexoesPorEstado).reduce((s, n) => s + n, 0),
        ativas: conexoesPorEstado.active ?? 0,
        paradas: conexoesPorEstado.idle ?? 0,
        maximo: ajuste("max_connections"),
      },
      memoria: { compartilhada: ajuste("shared_buffers"), porConsulta: ajuste("work_mem"), cacheEsperado: ajuste("effective_cache_size") },
      cache: { acerto: c && numero(c.hit) + numero(c.read) > 0 ? numero(c.hit) / (numero(c.hit) + numero(c.read)) : 1, leituras: c ? numero(c.hit) + numero(c.read) : 0 },
      transacoes: { commits: numero(c?.commits), rollbacks: numero(c?.rollbacks), deadlocks: numero(c?.deadlocks), temp: numero(c?.temp) },
      ultimaLimpeza: manutencao[0]?.ultimo ?? null,
      pesadas: pesadas.map((p) => ({ consulta: p.consulta.slice(0, 220), chamadas: numero(p.chamadas), totalMs: Math.round(p.total), mediaMs: Math.round(p.media * 10) / 10 })),
      migracoes: { quantas: migracoes.length, ultima: migracoes[0]?.nome ?? null, quando: migracoes[0]?.quando ?? null },
    };
  });
}

// ---------- servidor do banco (métricas do Supabase) ----------

type Serie = { rotulos: Record<string, string>; valor: number };

/** Lê o texto do Prometheus: nome{rotulos} valor. */
function lerPrometheus(texto: string) {
  const series = new Map<string, Serie[]>();
  for (const linha of texto.split("\n")) {
    if (!linha || linha.startsWith("#")) continue;
    const m = linha.match(/^([a-zA-Z_:][\w:]*)(\{([^}]*)\})?\s+(\S+)/);
    if (!m) continue;
    const rotulos: Record<string, string> = {};
    for (const r of (m[3] ?? "").matchAll(/(\w+)="([^"]*)"/g)) rotulos[r[1]] = r[2];
    const lista = series.get(m[1]) ?? [];
    lista.push({ rotulos, valor: Number(m[4]) });
    series.set(m[1], lista);
  }
  return series;
}

export function medirServidor() {
  return medir(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.SUPABASE_SECRET_KEY;
    if (!url || !chave) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY");
    const ref = new URL(url).hostname.split(".")[0];
    const resposta = await fetch(`https://${ref}.supabase.co/customer/v1/privileged/metrics`, {
      headers: { Authorization: "Basic " + Buffer.from(`service_role:${chave}`).toString("base64") },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!resposta.ok) throw new Error(`O Supabase respondeu ${resposta.status} às métricas`);
    const s = lerPrometheus(await resposta.text());
    const um = (nome: string, filtro?: (r: Record<string, string>) => boolean) =>
      (s.get(nome) ?? []).find((x) => !filtro || filtro(x.rotulos))?.valor ?? 0;
    const soma = (nome: string, filtro?: (r: Record<string, string>) => boolean) =>
      (s.get(nome) ?? []).filter((x) => !filtro || filtro(x.rotulos)).reduce((t, x) => t + x.valor, 0);

    const cpus = new Set((s.get("node_cpu_seconds_total") ?? []).map((x) => x.rotulos.cpu)).size || 1;
    const cpuTotal = soma("node_cpu_seconds_total");
    const cpuParado = soma("node_cpu_seconds_total", (r) => r.mode === "idle" || r.mode === "iowait");
    const ligado = um("node_time_seconds") - um("node_boot_time_seconds");
    const dados = (n: string) => um(n, (r) => r.mountpoint === "/data");
    const local = (s.get("supavisor_client_connection_duration_bucket") ?? [])[0]?.rotulos.location ?? null;

    return {
      memoria: {
        total: um("node_memory_MemTotal_bytes"),
        disponivel: um("node_memory_MemAvailable_bytes"),
        cache: um("node_memory_Cached_bytes") + um("node_memory_Buffers_bytes"),
        swapTotal: um("node_memory_SwapTotal_bytes"),
        swapLivre: um("node_memory_SwapFree_bytes"),
      },
      disco: { total: dados("node_filesystem_size_bytes"), livre: dados("node_filesystem_avail_bytes") },
      cpu: {
        nucleos: cpus,
        carga1: um("node_load1"),
        carga5: um("node_load5"),
        carga15: um("node_load15"),
        usoMedio: cpuTotal > 0 ? 1 - cpuParado / cpuTotal : 0,
      },
      // fração do tempo (desde que ligou) em que algum processo esperou memória, disco ou CPU
      pressao: {
        memoria: ligado > 0 ? um("node_pressure_memory_waiting_seconds_total") / ligado : 0,
        disco: ligado > 0 ? um("node_pressure_io_waiting_seconds_total") / ligado : 0,
        cpu: ligado > 0 ? um("node_pressure_cpu_waiting_seconds_total") / ligado : 0,
      },
      ligadoSegundos: ligado,
      reinicios: um("postgresql_restarts_total"),
      rede: { recebidos: soma("node_network_receive_bytes_total", (r) => r.device !== "lo"), enviados: soma("node_network_transmit_bytes_total", (r) => r.device !== "lo") },
      consultasTotais: um("supabase_usage_metrics_user_queries_total"),
      regiao: local,
    };
  });
}

// ---------- arquivos (bucket de imagens) ----------

export function medirArquivos() {
  return medir(async () => {
    const prefixo = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
    const [objetos, paginas, cards, carrosseis, unidades, clientes] = await Promise.all([
      consulta<{ name: string; bytes: bigint }>(`select name, coalesce((metadata->>'size')::bigint, 0) as bytes from storage.objects where bucket_id = '${BUCKET}'`),
      prisma.pagina.findMany({
        select: { avatarUrl: true, cabecalhoImagemUrl: true, fundoImagemUrl: true, seoImagemUrl: true, faviconUrl: true, cliente: { select: { nome: true, slug: true } } },
      }),
      prisma.card.findMany({ where: { imagemUrl: { not: null } }, select: { imagemUrl: true, titulo: true, pagina: { select: { cliente: { select: { nome: true, slug: true } } } } } }),
      prisma.imagemCarrossel.findMany({ select: { imagemUrl: true, card: { select: { titulo: true, pagina: { select: { cliente: { select: { nome: true, slug: true } } } } } } } }),
      prisma.unidade.findMany({ where: { imagemUrl: { not: null } }, select: { imagemUrl: true, nome: true, card: { select: { pagina: { select: { cliente: { select: { nome: true, slug: true } } } } } } } }),
      prisma.cliente.findMany({ select: { id: true, nome: true, slug: true } }),
    ]);

    // o que o banco aponta, e de onde
    const usos: { url: string; cliente: { nome: string; slug: string }; onde: string }[] = [];
    for (const p of paginas) {
      const campos = [
        [p.avatarUrl, "foto do topo"],
        [p.cabecalhoImagemUrl, "imagem do título"],
        [p.fundoImagemUrl, "imagem de fundo"],
        [p.seoImagemUrl, "imagem de compartilhar"],
        [p.faviconUrl, "ícone da aba"],
      ] as const;
      for (const [url, onde] of campos) if (url) usos.push({ url, cliente: p.cliente, onde });
    }
    for (const c of cards) usos.push({ url: c.imagemUrl!, cliente: c.pagina.cliente, onde: `bloco “${c.titulo ?? "sem nome"}”` });
    for (const i of carrosseis) usos.push({ url: i.imagemUrl, cliente: i.card.pagina.cliente, onde: `carrossel “${i.card.titulo ?? "sem nome"}”` });
    for (const u of unidades) usos.push({ url: u.imagemUrl!, cliente: u.card.pagina.cliente, onde: `unidade “${u.nome}”` });

    const existentes = new Map(objetos.map((o) => [o.name, numero(o.bytes)]));
    const usados = new Set(usos.filter((u) => u.url.startsWith(prefixo)).map((u) => u.url.slice(prefixo.length)));
    const orfaos = objetos.filter((o) => !usados.has(o.name));
    const quebradas = usos.filter((u) => u.url.startsWith(prefixo) && !existentes.has(u.url.slice(prefixo.length)));

    // cada cliente tem a sua pasta (o id dele) no bucket
    const nomePorId = new Map(clientes.map((c) => [c.id, c]));
    const porPasta = new Map<string, { bytes: number; arquivos: number }>();
    for (const o of objetos) {
      const pasta = o.name.split("/")[0];
      const atual = porPasta.get(pasta) ?? { bytes: 0, arquivos: 0 };
      atual.bytes += numero(o.bytes);
      atual.arquivos += 1;
      porPasta.set(pasta, atual);
    }
    const porCliente = [...porPasta]
      .map(([pasta, v]) => ({ cliente: nomePorId.get(pasta) ?? { nome: "pasta sem cliente (excluído)", slug: null as string | null }, ...v }))
      .sort((a, b) => b.bytes - a.bytes);

    return {
      total: objetos.reduce((t, o) => t + numero(o.bytes), 0),
      arquivos: objetos.length,
      maior: objetos.reduce((m, o) => Math.max(m, numero(o.bytes)), 0),
      porCliente,
      orfaos: { arquivos: orfaos.length, bytes: orfaos.reduce((t, o) => t + numero(o.bytes), 0) },
      quebradas: quebradas.map((q) => ({ cliente: q.cliente, onde: q.onde })),
      externas: usos.filter((u) => !u.url.startsWith(prefixo)).length,
    };
  });
}

// ---------- uso do sistema ----------

export function medirUso() {
  return medir(async () => {
    const [clientes, ativos, noAr, conferidos, paginas, porTipo, icones, imagensCarrossel, cliquesTotal, porDia, maisClicadas] = await Promise.all([
      prisma.cliente.count(),
      prisma.cliente.count({ where: { ativo: true } }),
      prisma.cliente.count({ where: { ativo: true, paginas: { some: { publicada: true } } } }),
      prisma.cliente.count({ where: { conferido: true } }),
      prisma.pagina.count(),
      prisma.card.groupBy({ by: ["tipo"], _count: { _all: true } }),
      prisma.icone.count(),
      prisma.imagemCarrossel.count(),
      prisma.clique.count(),
      consulta<{ dia: string; cliques: bigint }>(
        `select to_char(date_trunc('day', data at time zone 'America/Sao_Paulo'), 'YYYY-MM-DD') as dia, count(*) as cliques
           from "Clique" where data > now() - interval '30 days' group by 1 order by 1`,
      ),
      consulta<{ nome: string; slug: string; cliques: bigint }>(
        `select c.nome, c.slug, count(*) as cliques from "Clique" k
           join "Card" d on d.id = k."cardId" join "Pagina" p on p.id = d."paginaId" join "Cliente" c on c.id = p."clienteId"
          where k.data > now() - interval '30 days' group by 1, 2 order by 3 desc limit 5`,
      ),
    ]);

    // os últimos 30 dias, um por um (dia sem clique entra com zero)
    const dias: { dia: string; cliques: number }[] = [];
    const contagem = new Map(porDia.map((d) => [d.dia, numero(d.cliques)]));
    const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dias.push({ dia: chave, cliques: contagem.get(chave) ?? 0 });
    }

    return {
      clientes,
      ativos,
      noAr,
      conferidos,
      paginas,
      blocos: porTipo.reduce((t, x) => t + x._count._all, 0),
      porTipo: porTipo.map((x) => ({ tipo: x.tipo, quantos: x._count._all })).sort((a, b) => b.quantos - a.quantos),
      icones,
      imagensCarrossel,
      cliques: { total: cliquesTotal, ultimos30: dias.reduce((t, d) => t + d.cliques, 0), dias },
      maisClicadas: maisClicadas.map((m) => ({ nome: m.nome, slug: m.slug, cliques: numero(m.cliques) })),
    };
  });
}

/** Próxima execução do agendamento que mantém o banco acordado ("0 12 *\/5 * *": dias 1, 6, 11… às 12:00 UTC). */
export function proximoManterBanco(agora = new Date()) {
  const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 12));
  for (let i = 0; i < 40; i++) {
    if ((d.getUTCDate() - 1) % 5 === 0 && d > agora) return d;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return null;
}
