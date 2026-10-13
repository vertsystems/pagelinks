"use client";

import { useEffect, useRef, useState } from "react";
import { TELAS } from "@/lib/ajustes";
import { esquecerRetoques, refazerRetoques } from "./BarraAjuste";
import { useTela } from "./Tela";
import estilos from "../gestao.module.css";

// tablet e computador simulados: a página é desenhada nesse tamanho e reduzida para caber.
// As larguras caem nas faixas do pagina.module.css (tablet de 768 a 1023, computador de 1024).
const SIMULADA = { tablet: { largura: 820, altura: 1000 }, computador: { largura: 1280, altura: 800 } };

/**
 * Prévia ao vivo da página do cliente.
 * Recarrega sozinha sempre que `versao` muda — que é o timestamp de atualização
 * vindo do banco. Assim, salvar qualquer coisa reflete aqui sem apertar nada.
 *
 * Sem piscar: a versão nova carrega num segundo iframe, escondido atrás do que está
 * à vista. Quando ela termina (documento, imagens e fontes), recebe a mesma rolagem e
 * os retoques ao vivo que ainda valem (BarraAjuste.tsx), e só então troca de lugar com
 * a velha. Recarregar o próprio iframe mostrava a página pela metade e no topo antes de
 * voltar à rolagem, a cada gravação, e um arraste em andamento voltava ao valor velho.
 * O data-previa fica só no iframe à vista: é por ele que as barras do editor mexem na
 * página ao vivo.
 *
 * Três telas: celular (a página na largura de um telefone), tablet (820×1000) e
 * computador (1280×800), as duas últimas reduzidas em escala; a coluna da prévia
 * alarga (ver .editor:has()). A tela escolhida aqui é a que o editor inteiro edita
 * (ver Tela.tsx). Os iframes são os mesmos nas três: trocar não recarrega nem perde a rolagem.
 */
export default function Previa({ slug, versao }: { slug: string; versao: string }) {
  const area = useRef<HTMLDivElement>(null);
  const { tela, setTela } = useTela();
  const [escala, setEscala] = useState(0.5);
  const simulada = tela === "celular" ? null : SIMULADA[tela];

  // o endereço de cada versão é fixo (a versão vai no endereço), e serve de key do iframe:
  // quando a de trás vira a da frente, o React mantém o mesmo nó, sem carregar de novo
  const [atual, setAtual] = useState(`/${slug}`);
  const [proxima, setProxima] = useState<string | null>(null);
  const [versaoVista, setVersaoVista] = useState(versao);
  if (versaoVista !== versao) {
    setVersaoVista(versao);
    const endereco = `/${slug}?previa=${encodeURIComponent(versao)}`;
    setProxima(endereco === atual ? null : endereco);
  }
  const esperada = useRef(proxima);
  useEffect(() => {
    esperada.current = proxima;
  });

  useEffect(() => esquecerRetoques, []);

  async function quandoCarregar(evento: React.SyntheticEvent<HTMLIFrameElement>, endereco: string) {
    const nova = evento.currentTarget;
    const documento = nova.contentDocument;
    const visivel = area.current?.querySelector<HTMLIFrameElement>("iframe[data-previa]");
    if (documento) {
      refazerRetoques(documento);
      await documento.fonts?.ready;
      nova.contentWindow?.scrollTo(0, visivel?.contentWindow?.scrollY ?? 0);
    }
    // chegou outra versão enquanto esta carregava: esta já não serve
    if (esperada.current !== endereco) return;
    setAtual(endereco);
    setProxima(null);
  }

  // no tablet e no computador, a escala acompanha a largura disponível
  useEffect(() => {
    if (!simulada || !area.current) return;
    const observar = new ResizeObserver(([medida]) => setEscala(medida.contentRect.width / simulada.largura));
    observar.observe(area.current);
    return () => observar.disconnect();
  }, [simulada]);

  const tamanho: React.CSSProperties | undefined = simulada
    ? { width: simulada.largura, height: simulada.altura, transform: `scale(${escala})`, transformOrigin: "0 0" }
    : undefined;

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
          {[atual, proxima].map((endereco) => {
            if (!endereco) return null;
            const aVista = endereco === atual;
            return (
              <iframe
                key={endereco}
                src={endereco}
                title={aVista ? `Prévia de ${slug}` : "Prévia carregando a versão nova"}
                data-previa={aVista ? "" : undefined}
                aria-hidden={aVista ? undefined : true}
                tabIndex={aVista ? undefined : -1}
                className={aVista ? undefined : estilos.previaProxima}
                onLoad={aVista ? undefined : (evento) => quandoCarregar(evento, endereco)}
                style={tamanho}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
