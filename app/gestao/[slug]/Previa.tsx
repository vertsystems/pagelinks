"use client";

import { useEffect, useRef, useState } from "react";
import estilos from "../gestao.module.css";

// tela de computador simulada: a página é desenhada nesse tamanho e reduzida para caber
const COMPUTADOR = { largura: 1280, altura: 800 };

/**
 * Prévia ao vivo da página do cliente.
 * Recarrega sozinha sempre que `versao` muda — que é o timestamp de atualização
 * vindo do banco. Assim, salvar qualquer coisa reflete aqui sem apertar nada.
 * Ao recarregar, volta para onde estava rolada: ajustar um bloco lá embaixo não
 * pode jogar a prévia para o topo. O data-previa é por onde as barras do editor
 * mexem na página ao vivo.
 *
 * Dois modos: celular (a página na largura de um telefone) e computador (desenhada
 * em 1280×800 e reduzida em escala; a coluna da prévia alarga, ver .editor:has()).
 * O iframe é o mesmo nos dois: trocar de modo não recarrega nem perde a rolagem.
 */
export default function Previa({ slug, versao }: { slug: string; versao: string }) {
  const quadro = useRef<HTMLIFrameElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [modo, setModo] = useState<"celular" | "computador">("celular");
  const [escala, setEscala] = useState(0.5);

  useEffect(() => {
    const iframe = quadro.current;
    if (!iframe) return;
    const rolagem = iframe.contentWindow?.scrollY ?? 0;
    const voltar = () => iframe.contentWindow?.scrollTo(0, rolagem);
    iframe.addEventListener("load", voltar, { once: true });
    iframe.src = `/${slug}?previa=${Date.now()}`;
    return () => iframe.removeEventListener("load", voltar);
  }, [slug, versao]);

  // no modo computador, a escala acompanha a largura disponível
  useEffect(() => {
    if (modo !== "computador" || !area.current) return;
    const observar = new ResizeObserver(([medida]) => setEscala(medida.contentRect.width / COMPUTADOR.largura));
    observar.observe(area.current);
    return () => observar.disconnect();
  }, [modo]);

  const noComputador = modo === "computador";

  return (
    <div className={`${estilos.previa} ${noComputador ? estilos.previaComputador : ""}`}>
      <div className={estilos.previaBarra}>
        <div className={estilos.alternador} role="group" aria-label="Ver a prévia como">
          {(["celular", "computador"] as const).map((m) => (
            <button key={m} type="button" aria-pressed={modo === m} onClick={() => setModo(m)}>
              {m === "celular" ? "Celular" : "Computador"}
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
        className={`${estilos.previaMoldura} ${noComputador ? estilos.molduraComputador : ""}`}
        style={noComputador ? undefined : { maxWidth: 380, marginInline: "auto" }}
      >
        {noComputador && (
          <div className={estilos.navegador} aria-hidden="true">
            <i /><i /><i />
            <span>dnms.fun/{slug}</span>
          </div>
        )}
        <div
          ref={area}
          className={estilos.previaArea}
          style={noComputador ? { height: COMPUTADOR.altura * escala } : undefined}
        >
          <iframe
            ref={quadro}
            src={`/${slug}`}
            title={`Prévia de ${slug}`}
            data-previa
            style={
              noComputador
                ? { width: COMPUTADOR.largura, height: COMPUTADOR.altura, transform: `scale(${escala})`, transformOrigin: "0 0" }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
