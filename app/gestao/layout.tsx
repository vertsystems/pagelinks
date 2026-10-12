import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "../entrar/acoes";
import estilos from "./gestao.module.css";
import "./gestao.css";

export const metadata: Metadata = {
  title: "Gestão — PageLinks",
  robots: { index: false, follow: false },
};

export default function LayoutGestao({ children }: { children: React.ReactNode }) {
  return (
    <div className={estilos.tela}>
      <header className={estilos.topo}>
        <Link className={estilos.marca} href="/gestao">
          <b>Page</b>Links <span>· gestão</span>
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
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
