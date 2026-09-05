import Link from "next/link";
import FormNovo from "./FormNovo";
import estilos from "../gestao.module.css";

export default function NovoCliente() {
  return (
    <main className={estilos.env} style={{ maxWidth: 620 }}>
      <div className={estilos.cabecalho}>
        <div>
          <p style={{ marginBottom: 6 }}>
            <Link href="/gestao" style={{ color: "var(--g-suave)", textDecoration: "none", fontSize: 13 }}>
              ← Todos os clientes
            </Link>
          </p>
          <h1>Novo cliente</h1>
          <p>A página nasce como rascunho. Nada vai ao ar sem você publicar.</p>
        </div>
      </div>

      <FormNovo />

    </main>
  );
}
