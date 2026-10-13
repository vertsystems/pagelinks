"use client";

import estilos from "../gestao.module.css";

/**
 * Botão de excluir o cliente: pergunta antes. Excluir não tem volta (vão página, blocos,
 * cliques e os arquivos de imagem), e antes um clique só já apagava. Cancelar não envia
 * o formulário.
 */
export default function BotaoExcluir({ nome, blocos }: { nome: string; blocos: number }) {
  return (
    <button
      className={`${estilos.btn} ${estilos.btnPerigo}`}
      type="submit"
      onClick={(evento) => {
        const aviso = `Excluir ${nome}?\n\nIsso apaga a página, ${blocos === 1 ? "o bloco" : `os ${blocos} blocos`}, o histórico de cliques e as imagens, e não tem volta.`;
        if (!confirm(aviso)) evento.preventDefault();
      }}
    >
      Excluir {nome}
    </button>
  );
}
