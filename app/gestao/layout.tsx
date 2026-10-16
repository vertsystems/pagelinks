import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_TEMA, lerTema } from "@/lib/tema-painel";
import { sair } from "../entrar/acoes";
import BotaoTema from "./BotaoTema";
import estilos from "./gestao.module.css";
import "./gestao.css";

export const metadata: Metadata = {
  title: "Gestão — PageLinks",
  robots: { index: false, follow: false },
};

export default async function LayoutGestao({ children }: { children: React.ReactNode }) {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <div className={estilos.tela} data-tema={tema}>
      <header className={estilos.topo}>
        <Link className={estilos.marca} href="/gestao">
          <b>Page</b>Links <span>· gestão</span>
        </Link>
        <div className={estilos.topoAcoes}>
          <BotaoTema inicial={tema} />
          <Link className={`${estilos.btn} ${estilos.btnFantasma}`} href="/gestao/saude" aria-label="Saúde do sistema" title="Saúde do sistema">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l2-5 4 10 2-5h6" />
            </svg>
            <span className={estilos.esconderNoCelular}>Saúde</span>
          </Link>
          <Link className={`${estilos.btn} ${estilos.btnFantasma}`} href="/gestao/redirecionamentos" aria-label="Redirecionamentos" title="Redirecionamentos de endereços antigos">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19v-6a4 4 0 0 1 4-4h12" />
              <path d="m15 4 5 5-5 5" />
            </svg>
            <span className={estilos.esconderNoCelular}>Redirecionamentos</span>
          </Link>
          {/* no celular, só "Novo": com o botão de redirecionamentos, o topo não cabia em 390 px */}
          <Link className={`${estilos.btn} ${estilos.btnFantasma}`} href="/gestao/novo" aria-label="Novo cliente">
            <span>
              Novo<span className={estilos.esconderNoCelular}> cliente</span>
            </span>
          </Link>
          <form action={sair}>
            <button className={`${estilos.btn} ${estilos.btnFantasma}`} type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
