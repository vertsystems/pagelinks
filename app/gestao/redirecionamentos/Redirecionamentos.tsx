"use client";

import { useActionState, useRef, useState } from "react";
import { BotaoSalvar } from "../[slug]/Salvar";
import { excluirRedirecionamento, salvarRedirecionamento, type EstadoRedirecionamento } from "./acoes";
import gestao from "../gestao.module.css";
import estilos from "./redirecionamentos.module.css";

export type ItemRedirecionamento = {
  id: string;
  de: string;
  para: string;
  nivel: "ok" | "atencao";
  situacao: string;
  acessos: number;
  ultimoAcesso: string | null;
  ultimoAcessoCompleto: string | null;
  criado: string;
};

/**
 * Formulário em cima (criar, ou editar o que foi escolhido na lista) e a lista embaixo.
 * Os campos são controlados: o React limpa o formulário depois de toda ação, e assim um
 * erro não apaga o que foi digitado. Só um envio que deu certo limpa.
 */
export default function Redirecionamentos({
  itens,
  sugestoes,
  dominio,
}: {
  itens: ItemRedirecionamento[];
  sugestoes: { slug: string; nome: string }[];
  dominio: string;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [de, setDe] = useState("");
  const [para, setPara] = useState("");
  // o "Pronto: … agora leva para …" sai quando se mexe em outro: depois de excluir, falava de um que não existia mais
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  const campoDe = useRef<HTMLInputElement>(null);

  function limpar() {
    setEditando(null);
    setDe("");
    setPara("");
  }

  const [estado, acao] = useActionState<EstadoRedirecionamento, FormData>(async (anterior, dados) => {
    const resposta = await salvarRedirecionamento(anterior, dados);
    if (resposta.ok) limpar();
    setMostrarAviso(true);
    return resposta;
  }, {});

  function editar(item: ItemRedirecionamento) {
    setMostrarAviso(false);
    setEditando(item.id);
    setDe(item.de);
    setPara(item.para.replace(/^\//, ""));
    formulario.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    campoDe.current?.focus({ preventScroll: true });
  }

  const emEdicao = itens.find((i) => i.id === editando);

  return (
    <>
      <form ref={formulario} action={acao} className={`${gestao.bloco} ${estilos.formulario}`}>
        <h2>
          {emEdicao ? "Editar redirecionamento" : "Novo redirecionamento"}
          <small>cole o link inteiro ou só o final</small>
        </h2>
        {mostrarAviso && estado.erro && <p className={gestao.erro}>{estado.erro}</p>}
        {mostrarAviso && estado.ok && (
          <p className={estilos.pronto} role="status">
            {estado.ok}
          </p>
        )}
        <input type="hidden" name="id" value={editando ?? ""} />
        <div className={estilos.campos}>
          <div className={gestao.campo}>
            <label htmlFor="redirecionamento-de">Endereço antigo</label>
            <div className={estilos.prefixo}>
              <span aria-hidden="true">{dominio}/</span>
              <input
                ref={campoDe}
                id="redirecionamento-de"
                className={estilos.entrada}
                type="text"
                name="de"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                placeholder="fulano"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>
            <span className={gestao.dica}>O link que não existe mais.</span>
          </div>
          <span className={estilos.setaCampos} aria-hidden="true">
            →
          </span>
          <div className={gestao.campo}>
            <label htmlFor="redirecionamento-para">Destino</label>
            <div className={estilos.prefixo}>
              <span aria-hidden="true">{dominio}/</span>
              <input
                id="redirecionamento-para"
                className={estilos.entrada}
                type="text"
                name="para"
                value={para}
                onChange={(e) => setPara(e.target.value)}
                placeholder="novo-endereco"
                list="redirecionamento-sugestoes"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>
            <span className={gestao.dica}>Uma página do {dominio}. Vazio leva para a página inicial.</span>
          </div>
        </div>
        <datalist id="redirecionamento-sugestoes">
          {sugestoes.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.nome}
            </option>
          ))}
        </datalist>
        <div className={gestao.salvarBarra}>
          <BotaoSalvar rotulo={emEdicao ? "Salvar alterações" : "Criar redirecionamento"} />
          {editando && (
            <button
              type="button"
              className={`${gestao.btn} ${gestao.btnFantasma}`}
              onClick={() => {
                limpar();
                setMostrarAviso(false);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {itens.length === 0 ? (
        <p className={gestao.vazio}>Nenhum redirecionamento ainda. O primeiro entra pelo formulário acima.</p>
      ) : (
        <ul className={estilos.lista}>
          {itens.map((item) => (
            <li key={item.id} className={estilos.item} data-editando={item.id === editando || undefined}>
              <span className={`${estilos.sinal} ${estilos[item.nivel]}`} aria-hidden="true" />
              <div className={estilos.corpo}>
                <p className={estilos.enderecos}>
                  <a href={`/${item.de}/`} target="_blank" rel="noreferrer" title="Abrir o endereço antigo, para testar">
                    {dominio}/{item.de}/
                  </a>
                  <span className={estilos.seta}>
                    <span aria-hidden="true">→</span>
                    <span className={gestao.somenteLeitor}>leva para</span>
                  </span>
                  <a href={item.para} target="_blank" rel="noreferrer" title="Abrir o destino">
                    {dominio}
                    {item.para}
                  </a>
                </p>
                <p className={estilos.situacao}>{item.situacao}</p>
                <p className={estilos.meta}>
                  {item.acessos} {item.acessos === 1 ? "acesso" : "acessos"}
                  {item.ultimoAcesso && (
                    <span title={item.ultimoAcessoCompleto ?? undefined}> · último {item.ultimoAcesso}</span>
                  )}
                  {" · "}criado em {item.criado}
                </p>
              </div>
              <div className={estilos.acoes}>
                <button type="button" className={`${gestao.btn} ${gestao.btnFantasma} ${gestao.btnMini}`} onClick={() => editar(item)}>
                  Editar
                </button>
                <form action={excluirRedirecionamento.bind(null, item.id)}>
                  <button
                    type="submit"
                    className={`${gestao.btn} ${gestao.btnPerigo} ${gestao.btnMini}`}
                    onClick={(evento) => {
                      if (!confirm(`Excluir o redirecionamento de ${dominio}/${item.de}/?\n\nQuem usar o link antigo volta a ver "página não encontrada".`)) {
                        evento.preventDefault();
                        return;
                      }
                      setMostrarAviso(false);
                      if (item.id === editando) limpar();
                    }}
                  >
                    Excluir
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
