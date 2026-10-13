"use client";

import { useEffect, useRef, useState } from "react";
import { TELAS } from "@/lib/ajustes";
import { useTela } from "./Tela";
import estilos from "../gestao.module.css";

// tablet e computador simulados: a página é desenhada nesse tamanho e reduzida para caber.
// As larguras caem nas faixas do pagina.module.css (tablet de 768 a 1023, computador de 1024).
const SIMULADA = { tablet: { largura: 820, altura: 1000 }, computador: { largura: 1280, altura: 800 } };

/**
 * Prévia ao vivo da página do cliente.
 * Recarrega sozinha sempre que `versao` muda — que é o timestamp de atualização
 * vindo do banco. Assim, salvar qualquer coisa reflete aqui sem apertar nada.
 * Ao recarregar, volta para onde estava rolada: ajustar um bloco lá embaixo não
 * pode jogar a prévia para o topo. O data-previa é por onde as barras do editor
 * mexem na página ao vivo.
 *
 * Três telas: celular (a página na largura de um telefone), tablet (820×1000) e
 * computador (1280×800), as duas últimas reduzidas em escala; a coluna da prévia
 * alarga (ver .editor:has()). A tela escolhida aqui é a que o editor inteiro edita
 * (ver Tela.tsx). O iframe é o mesmo nas três: trocar não recarrega nem perde a rolagem.
 */
export default function Previa({ slug, versao }: { slug: string; versao: string }) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const { tela, setTela } = useTela();
  const [escala, setEscala] = useState(0.5);
  const simulada = tela === "celular" ? null : SIMULADA[tela];

  useEffect(() => {
    const iframe = quadro.current;
    if (!iframe) return;
    const rolagem = iframe.contentWindow?.scrollY ?? 0;
    const voltar = () => iframe.contentWindow?.scrollTo(0, rolagem);
    iframe.addEventListener("load", voltar, { once: true });
    iframe.src = `/${slug}?previa=${Date.now()}`;
    return () => iframe.removeEventListener("load", voltar);
  }, [slug, versao]);

  // no tablet e no computador, a escala acompanha a largura disponível
  useEffect(() => {
    if (!simulada || !area.current) return;
    const observar = new ResizeObserver(([medida]) => setEscala(medida.contentRect.width / simulada.largura));
    observar.observe(area.current);
    return () => observar.disconnect();
  }, [simulada]);

  return (
    <div className={`${estilos.previa} ${simulada ? estilos.previaComputador : ""}`}>
      <div className={estilos.previaBarra}>
        <div className={estilos.alternador} role="group" aria-label="Tela que está sendo vista e editada">
          {TELAS.map((t) => (
            <button key={t.id} type="button" aria-pressed={tela === t.id} onClick={() => setTela(t.id)}>
              {t.nome}
            </button>
          ))}
        </div>
        <a
          className={`${estilos.btn} ${estilos.btnFantasma} ${estilos.btnMini}`}
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir ↗
        </a>
      </div>
      <div
        className={`${estilos.previaMoldura} ${simulada ? estilos.molduraComputador : ""}`}
        style={simulada ? undefined : { maxWidth: 380, marginInline: "auto" }}
      >
        {simulada && (
          <div className={estilos.navegador} aria-hidden="true">
            <i /><i /><i />
            <span>dnms.fun/{slug}</span>
          </div>
        )}
        <div
          ref={area}
          className={estilos.previaArea}
          style={simulada ? { height: simulada.altura * escala } : undefined}
        >
          <iframe
            ref={quadro}
            src={`/${slug}`}
            title={`Prévia de ${slug}`}
            data-previa
            style={
              simulada
                ? { width: simulada.largura, height: simulada.altura, transform: `scale(${escala})`, transformOrigin: "0 0" }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
