"use client";

import { useActionState } from "react";
import { criarCliente, type EstadoForm } from "../acoes";
import { BotaoSalvar } from "../[slug]/Salvar";
import estilos from "../gestao.module.css";

export default function FormNovo() {
  const [estado, acao] = useActionState<EstadoForm, FormData>(criarCliente, {});

  return (
    <form action={acao} className={estilos.bloco}>
      {estado?.erro && <p className={estilos.erro}>{estado.erro}</p>}
      <div className={estilos.campos}>
        <div className={estilos.campo}>
          <label htmlFor="nome">Nome do cliente</label>
          <input id="nome" type="text" name="nome" required autoFocus placeholder="Padaria do Zé" />
        </div>
        <div className={estilos.campo}>
          <label htmlFor="slug">Endereço da página (opcional)</label>
          <input id="slug" type="text" name="slug" placeholder="padariadoze" />
          <span className={estilos.dica}>
            Deixe vazio para gerar a partir do nome. Vira dnms.fun/endereço.
          </span>
        </div>
      </div>
      <div className={estilos.salvarBarra}>
        <BotaoSalvar rotulo="Criar cliente" />
      </div>
    </form>
  );
}
