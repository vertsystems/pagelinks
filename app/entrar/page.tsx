import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioLogado } from "@/lib/acesso";
import { COOKIE_TEMA, lerTema } from "@/lib/tema-painel";
import BotaoTema from "../gestao/BotaoTema";
import FormEntrar from "./FormEntrar";
import estilos from "../gestao/gestao.module.css";
import "../gestao/gestao.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar — PageLinks",
  robots: { index: false, follow: false },
};

export default async function Entrar({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const { de } = await searchParams;
  // Só volta para dentro do painel: o "de" vem da URL e não pode virar redirecionamento para fora.
  const destino = de?.startsWith("/gestao") ? de : "/gestao";

  const usuario = await usuarioLogado();
  if (usuario?.papel === "admin") redirect(destino);

  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <div className={estilos.tela} data-tema={tema}>
      <header className={estilos.topo}>
        <span className={estilos.marca}>
          <b>Page</b>Links <span>· gestão</span>
        </span>
        <BotaoTema inicial={tema} />
      </header>
      <main className={estilos.env} style={{ maxWidth: 440, paddingTop: 56 }}>
        <div className={estilos.cabecalho}>
          <div>
            <h1>Entrar</h1>
            <p>Acesso ao painel de gestão das páginas.</p>
          </div>
        </div>
        <FormEntrar destino={destino} />
      </main>
    </div>
  );
}
