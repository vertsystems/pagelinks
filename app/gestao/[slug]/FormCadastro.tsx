"use client";

import { useActionState } from "react";
import { salvarCliente, type EstadoForm } from "../acoes";
import { BotaoSalvar } from "./Salvar";
import estilos from "../gestao.module.css";

export default function FormCadastro({
  cliente,
}: {
  cliente: { id: string; nome: string; slug: string; ativo: boolean; observacao: string | null };
}) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(
    salvarCliente.bind(null, cliente.id),
    {},
  );

  return (
    <form action={acao} className={estilos.bloco}>
      <h2>Cadastro<small>nome e endereço da página</small></h2>
      {estado?.erro && <p className={estilos.erro}>{estado.erro}</p>}
      <div className={estilos.campos}>
        <div className={estilos.doisCampos}>
          <div className={estilos.campo}>
            <label htmlFor="nome">Nome do cliente</label>
            <input id="nome" type="text" name="nome" defaultValue={cliente.nome} required />
          </div>
          <div className={estilos.campo}>
            <label htmlFor="slug">Endereço</label>
            <input id="slug" type="text" name="slug" defaultValue={cliente.slug} required />
            <span className={estilos.dica}>dnms.fun/{cliente.slug}</span>
          </div>
        </div>
        <div className={estilos.campo}>
          <label htmlFor="observacao">Anotação interna</label>
          <textarea id="observacao" name="observacao" defaultValue={cliente.observacao ?? ""} rows={2} />
          <span className={estilos.dica}>Só a equipe vê. O cliente nunca.</span>
        </div>
        <label className={estilos.chave}>
          <input type="checkbox" name="ativo" defaultChecked={cliente.ativo} />
          Cliente ativo
        </label>
        <span className={estilos.dica}>Desmarcar tira a página do ar sem apagar nada.</span>
      </div>
      <div className={estilos.salvarBarra}>
        <BotaoSalvar rotulo="Salvar cadastro" />
      </div>
    </form>
  );
}
