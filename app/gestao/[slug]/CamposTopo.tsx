"use client";

import { useState } from "react";
import type { ValoresTela } from "@/lib/ajustes";
import { naPrevia } from "./BarraAjuste";
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
  semTitulo: semTituloInicial,
  corFundo,
  ajustes,
}: {
  paginaId: string;
  titulo: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarFormato: string | null;
  cabecalhoImagemUrl: string | null;
  /** título e frase fora da página: fica só a foto ou logo */
  semTitulo: boolean;
  corFundo: string;
  /** valores por tela dos ajustes do topo */
  ajustes: { avatar: ValoresTela; cabecalho: ValoresTela; topo: ValoresTela; titulo: ValoresTela; bio: ValoresTela };
}) {
  const [comImagem, setComImagem] = useState(!!cabecalhoImagemUrl);
  const [semTitulo, setSemTitulo] = useState(semTituloInicial);

  // marcar já tira título e frase da prévia; desmarcar volta a mostrar depois de salvar
  function alternarSemTitulo(marcado: boolean) {
    setSemTitulo(marcado);
    const documento = naPrevia("[data-pl-tela]")?.ownerDocument;
    documento?.querySelectorAll<HTMLElement>("[data-pl-texto-topo]").forEach((el) => {
      el.style.display = marcado ? "none" : "";
    });
  }

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
      {/* tamanho da letra por tela; com a imagem no lugar dos dois, o texto nem aparece */}
      {!comImagem && (
        <div className={estilos.campo}>
          {/* marca que este formulário cuida da caixinha: desmarcada, ela não iria no envio */}
          <input type="hidden" name="semTitulo" value="" />
          <label className={estilos.chave}>
            {/* não controlado e com key no valor gravado, como a "Página no ar": depois de salvar, o
                reset do formulário do React 19 volta ao gravado, e não ao de quando a tela abriu */}
            <input
              key={String(semTituloInicial)}
              type="checkbox"
              name="semTitulo"
              defaultChecked={semTituloInicial}
              onChange={(e) => alternarSemTitulo(e.target.checked)}
            />
            Sem título e sem frase na página (fica só a foto ou logo)
          </label>
          {semTitulo && (
            <span className={estilos.dica}>
              Os dois saem da página, mas o título continua valendo para o Google, a aba do navegador e o leitor de tela. Vazio, vale o
              nome do cliente.
            </span>
          )}
        </div>
      )}
      <div className={estilos.campo}>
        <label htmlFor="titulo">{semTitulo && !comImagem ? "Título (só para o Google e a aba)" : "Título"}</label>
        <input id="titulo" type="text" name="titulo" defaultValue={titulo} required={!comImagem && !semTitulo} disabled={comImagem} />
        {!comImagem && !semTitulo && (
          <ControleAjuste alvo={{ tipo: "pagina", id: paginaId }} chave="titulo" valores={ajustes.titulo} rotulo="Tamanho" nomeAcessivel="Tamanho do título" />
        )}
      </div>
      {!semTitulo || comImagem ? (
        <div className={estilos.campo}>
          <label htmlFor="bio">Frase de apresentação</label>
          <textarea id="bio" name="bio" defaultValue={bio ?? ""} rows={2} disabled={comImagem} />
          {!comImagem && (
            <ControleAjuste alvo={{ tipo: "pagina", id: paginaId }} chave="bio" valores={ajustes.bio} rotulo="Tamanho" nomeAcessivel="Tamanho da frase de apresentação" />
          )}
        </div>
      ) : (
        // escondida, a frase segue no envio: senão salvar o topo a apagaria
        <input type="hidden" name="bio" value={bio ?? ""} />
      )}
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
