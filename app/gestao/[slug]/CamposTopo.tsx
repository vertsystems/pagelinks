"use client";

import { useState } from "react";
import { AJUSTE_PAGINA } from "@/lib/tema";
import { salvarAjustePagina } from "../acoes";
import BarraAjuste, { naPrevia } from "./BarraAjuste";
import CampoImagem from "./CampoImagem";
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
  avatarTamanho,
  cabecalhoImagemUrl,
  cabecalhoTamanho,
  corFundo,
  espacoTopo,
}: {
  paginaId: string;
  titulo: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarTamanho: number | null;
  cabecalhoImagemUrl: string | null;
  cabecalhoTamanho: number | null;
  corFundo: string;
  espacoTopo: number | null;
}) {
  const [comImagem, setComImagem] = useState(!!cabecalhoImagemUrl);
  const [erroEspaco, setErroEspaco] = useState<string | null>(null);

  return (
    <>
      <CampoImagem
        alvo={{ tipo: "pagina", id: paginaId, campo: "avatarUrl" }}
        url={avatarUrl}
        rotulo="Foto ou logo"
        dica="Aparece redonda no topo."
        redonda
        fundo={corFundo}
        tamanho={avatarTamanho}
      />
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
        tamanho={cabecalhoTamanho}
        aoMudar={(url) => setComImagem(!!url)}
      />
      <div className={estilos.campo}>
        <BarraAjuste
          rotulo="Espaço acima do topo"
          valor={espacoTopo}
          faixa={AJUSTE_PAGINA.topo}
          aoMover={(v) => naPrevia("[data-pl-tela]")?.style.setProperty("--espaco-topo", `${v}px`)}
          aoGravar={async (v) => setErroEspaco((await salvarAjustePagina(paginaId, "topo", v)).erro ?? null)}
        />
        <span className={estilos.dica}>Empurra a foto (ou o que vier primeiro) e o resto da página para baixo. Grava sozinho.</span>
        {erroEspaco && <span className={estilos.erroCampo} role="alert">{erroEspaco}</span>}
      </div>
    </>
  );
}
