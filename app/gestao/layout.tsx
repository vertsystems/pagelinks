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
          <Link className={`${estilos.btn} ${estilos.btnFantasma}`} href="/gestao/novo">
            Novo cliente
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
