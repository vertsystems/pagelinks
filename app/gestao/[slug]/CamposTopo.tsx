"use client";

import { useState } from "react";
import type { ValoresTela } from "@/lib/ajustes";
import CampoImagem from "./CampoImagem";
import ControleAjuste from "./ControleAjuste";
import FormatoFoto from "./FormatoFoto";
import estilos from "../gestao.module.css";

/**
 * O topo da página: foto, título e frase, ou uma imagem no lugar dos dois
 * (a arte da marca que já traz o nome e a frase). Com a imagem, título e frase
 * ficam travados; para voltar a escrever, remove a imagem.
 */
export default function CamposTopo({
  paginaId,
  titulo,
  bio,
  avatarUrl,
  avatarFormato,
  cabecalhoImagemUrl,
  corFundo,
  ajustes,
}: {
  paginaId: string;
  titulo: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarFormato: string | null;
  cabecalhoImagemUrl: string | null;
  corFundo: string;
  /** valores por tela dos ajustes do topo */
  ajustes: { avatar: ValoresTela; cabecalho: ValoresTela; topo: ValoresTela };
}) {
  const [comImagem, setComImagem] = useState(!!cabecalhoImagemUrl);

  return (
    <>
      <CampoImagem
        alvo={{ tipo: "pagina", id: paginaId, campo: "avatarUrl" }}
        url={avatarUrl}
        rotulo="Foto ou logo"
        dica="Aparece no topo. Logo com nome escrito, largo ou comprido: use “Sem cortar”."
        redonda
        fundo={corFundo}
        ajuste={{ chave: "avatar", valores: ajustes.avatar }}
      />
      {avatarUrl && <FormatoFoto paginaId={paginaId} formato={avatarFormato} />}
      <div className={estilos.campo}>
        <label htmlFor="titulo">Título</label>
        <input id="titulo" type="text" name="titulo" defaultValue={titulo} required={!comImagem} disabled={comImagem} />
      </div>
      <div className={estilos.campo}>
        <label htmlFor="bio">Frase de apresentação</label>
        <textarea id="bio" name="bio" defaultValue={bio ?? ""} rows={2} disabled={comImagem} />
      </div>
      <CampoImagem
        alvo={{ tipo: "pagina", id: paginaId, campo: "cabecalhoImagemUrl" }}
        url={cabecalhoImagemUrl}
        rotulo="Imagem no lugar do título e da frase (opcional)"
        dica={
          comImagem
            ? "A imagem está no lugar do título e da frase. Para voltar a escrever os dois, remova a imagem."
            : "Para quando a arte da marca já traz o nome e a frase juntos. Ela substitui os dois na página."
        }
        fundo={corFundo}
        ajuste={{ chave: "cabecalho", valores: ajustes.cabecalho }}
        aoMudar={(url) => setComImagem(!!url)}
      />
      <div className={estilos.campo}>
        <ControleAjuste alvo={{ tipo: "pagina", id: paginaId }} chave="topo" valores={ajustes.topo} rotulo="Espaço acima do topo" />
        <span className={estilos.dica}>Empurra a foto (ou o que vier primeiro) e o resto da página para baixo. Grava sozinho.</span>
      </div>
    </>
  );
}
