"use client";

/* eslint-disable @next/next/no-img-element -- miniaturas das páginas, já em WebP do Storage */

import Link from "next/link";
import { useState } from "react";
import { COOKIE_VISTA, VISTAS, type Vista } from "@/lib/vista-painel";
import Conferido from "./Conferido";
import estilos from "./gestao.module.css";

/** Um cliente como a lista mostra: tudo já calculado no servidor (inclusive o "quando"). */
export type ItemCliente = {
  id: string;
  slug: string;
  nome: string;
  conferido: boolean;
  situacao: "no-ar" | "rascunho" | "inativo";
  blocos: number;
  cliques: number;
  /** "hoje às 14:32", "há 3 dias"… e a data inteira, para o title */
  quando: string;
  quandoCompleto: string;
  /** a cara do topo da página: fundo, cor do texto, foto e arte do nome (ou o título) */
  capa: { fundo: string; texto: string; avatarUrl: string | null; avatarLivre: boolean; cabecalhoUrl: string | null; titulo: string };
};

const SITUACAO = {
  "no-ar": { nome: "No ar", selo: estilos.seloAtivo, ponto: estilos.pontoNoAr },
  rascunho: { nome: "Rascunho", selo: estilos.seloRascunho, ponto: estilos.pontoRascunho },
  inativo: { nome: "Inativo", selo: estilos.seloInativo, ponto: estilos.pontoInativo },
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function guardarVista(vista: Vista) {
  document.cookie = `${COOKIE_VISTA}=${vista}; path=/; max-age=31536000; samesite=lax`;
}

const ICONES: Record<Vista, React.ReactNode> = {
  lista: <path d="M4 6h16M4 12h16M4 18h16" />,
  grade: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  compacto: (
    <>
      <rect x="4" y="5" width="7" height="4" rx="1" />
      <rect x="13" y="5" width="7" height="4" rx="1" />
      <rect x="4" y="11" width="7" height="4" rx="1" />
      <rect x="13" y="11" width="7" height="4" rx="1" />
      <rect x="4" y="17" width="7" height="4" rx="1" />
      <rect x="13" y="17" width="7" height="4" rx="1" />
    </>
  ),
};

/**
 * A lista de clientes em três modos. Os dados vêm prontos do servidor, então trocar de
 * modo é na hora, sem recarregar; o cookie guarda a escolha para a próxima visita.
 * Nos cartões, o cartão inteiro leva ao editor (o link do nome se estica por cima dele,
 * ver .esticado); a bolinha e o endereço ficam por cima e continuam clicáveis.
 */
export default function ListaClientes({ itens, busca, vistaInicial }: { itens: ItemCliente[]; busca: string; vistaInicial: Vista }) {
  const [vista, setVista] = useState(vistaInicial);

  function escolher(nova: Vista) {
    guardarVista(nova);
    setVista(nova);
  }

  return (
    <>
      <div className={estilos.barraLista}>
        <form className={estilos.buscaForm} role="search">
          <input
            className={estilos.busca}
            type="text"
            name="q"
            defaultValue={busca}
            placeholder="Buscar por nome ou endereço…"
            aria-label="Buscar cliente"
          />
        </form>
        <div className={estilos.alternador} role="group" aria-label="Modo de ver a lista">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" aria-pressed={vista === v.id} aria-label={v.nome} title={v.dica} onClick={() => escolher(v.id)}>
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {ICONES[v.id]}
              </svg>
              <span>{v.nome}</span>
            </button>
          ))}
        </div>
      </div>

      {itens.length === 0 ? (
        <p className={estilos.vazio}>
          {busca ? <>Nenhum cliente encontrado para “{busca}”.</> : <>Nenhum cliente ainda. Comece cadastrando o primeiro.</>}
        </p>
      ) : vista === "grade" ? (
        <Grade itens={itens} />
      ) : vista === "compacto" ? (
        <Compactos itens={itens} />
      ) : (
        <Tabela itens={itens} />
      )}
    </>
  );
}

function Tabela({ itens }: { itens: ItemCliente[] }) {
  return (
    <table className={estilos.tabela}>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Endereço</th>
          <th>Situação</th>
          <th>Atualizada</th>
          <th style={{ textAlign: "right" }}>Blocos</th>
          <th style={{ textAlign: "right" }}>Cliques</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {itens.map((c) => (
          <tr key={c.id}>
            <td>
              <Conferido clienteId={c.id} nome={c.nome} conferido={c.conferido} />
              <Link className={estilos.nomeCliente} href={`/gestao/${c.slug}`}>
                {c.nome}
              </Link>
            </td>
            <td>
              <a className={estilos.endereco} href={`/${c.slug}`} target="_blank" rel="noreferrer">
                dnms.fun/{c.slug} ↗
              </a>
            </td>
            <td>
              <span className={`${estilos.selo} ${SITUACAO[c.situacao].selo}`}>{SITUACAO[c.situacao].nome}</span>
            </td>
            <td className={estilos.quando} title={c.quandoCompleto}>
              {c.quando}
            </td>
            <td className={estilos.num} style={{ textAlign: "right" }}>
              {c.blocos}
            </td>
            <td className={estilos.num} style={{ textAlign: "right" }}>
              {c.cliques}
            </td>
            <td>
              <div className={estilos.acoesLinha}>
                <Link className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`} href={`/gestao/${c.slug}`}>
                  Editar
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** O topo da página do cliente em miniatura: o fundo dela, a foto e a arte do nome (ou o título). */
function Capa({ capa }: { capa: ItemCliente["capa"] }) {
  return (
    <div className={estilos.capa} style={{ background: capa.fundo, color: capa.texto }} aria-hidden="true">
      {capa.avatarUrl && (
        <img className={estilos.capaAvatar} data-formato={capa.avatarLivre ? "livre" : undefined} src={capa.avatarUrl} alt="" loading="lazy" />
      )}
      {capa.cabecalhoUrl ? (
        <img className={estilos.capaCabecalho} src={capa.cabecalhoUrl} alt="" loading="lazy" />
      ) : (
        <span className={estilos.capaTitulo}>{capa.titulo}</span>
      )}
    </div>
  );
}

function Grade({ itens }: { itens: ItemCliente[] }) {
  return (
    <ul className={estilos.grade}>
      {itens.map((c) => (
        <li key={c.id} className={estilos.cartao}>
          <Capa capa={c.capa} />
          <div className={estilos.cartaoCorpo}>
            <div className={estilos.cartaoNome}>
              <Conferido clienteId={c.id} nome={c.nome} conferido={c.conferido} />
              <Link className={`${estilos.nomeCliente} ${estilos.esticado}`} href={`/gestao/${c.slug}`}>
                {c.nome}
              </Link>
            </div>
            <a className={`${estilos.endereco} ${estilos.porCima}`} href={`/${c.slug}`} target="_blank" rel="noreferrer">
              dnms.fun/{c.slug} ↗
            </a>
            <div className={estilos.cartaoMeta}>
              <span className={`${estilos.selo} ${SITUACAO[c.situacao].selo}`}>{SITUACAO[c.situacao].nome}</span>
              <span>
                {plural(c.blocos, "bloco", "blocos")} · {plural(c.cliques, "clique", "cliques")}
              </span>
            </div>
            <span className={estilos.quando} title={c.quandoCompleto}>
              Atualizada {c.quando}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Compactos({ itens }: { itens: ItemCliente[] }) {
  return (
    <ul className={estilos.compactos}>
      {itens.map((c) => (
        <li key={c.id} className={estilos.compacto}>
          <Conferido clienteId={c.id} nome={c.nome} conferido={c.conferido} />
          <span className={estilos.miniatura} style={{ background: c.capa.fundo, color: c.capa.texto }} aria-hidden="true">
            {c.capa.avatarUrl ? (
              <img src={c.capa.avatarUrl} alt="" loading="lazy" data-formato={c.capa.avatarLivre ? "livre" : undefined} />
            ) : (
              c.nome.trim().charAt(0).toUpperCase()
            )}
          </span>
          <div className={estilos.compactoTexto}>
            <Link className={`${estilos.nomeCliente} ${estilos.esticado}`} href={`/gestao/${c.slug}`}>
              {c.nome}
            </Link>
            <span className={estilos.compactoMeta} title={c.quandoCompleto}>
              <i className={`${estilos.ponto} ${SITUACAO[c.situacao].ponto}`} aria-hidden="true" />
              {SITUACAO[c.situacao].nome} · {c.quando}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
