/** Traduz o tema salvo no banco em variáveis CSS e estilos prontos. */

type TemaPagina = {
  corFundo: string;
  corTexto: string;
  corDestaque: string;
  corTextoBotao: string;
  fonte: string;
  estiloBotao: string;
  fundoTipo: string;
  fundoCorFim: string | null;
  fundoImagemUrl: string | null;
};

const RAIO: Record<string, string> = {
  arredondado: "12px",
  reto: "0px",
  pilula: "999px",
  contorno: "12px",
};

export function variaveisDoTema(p: TemaPagina): React.CSSProperties {
  const fundo =
    p.fundoTipo === "gradiente" && p.fundoCorFim
      ? `linear-gradient(160deg, ${p.corFundo} 0%, ${p.fundoCorFim} 100%)`
      : p.fundoTipo === "imagem" && p.fundoImagemUrl
        ? `url(${p.fundoImagemUrl}) center/cover no-repeat fixed`
        : p.corFundo;

  return {
    "--fundo": p.corFundo,
    "--fundo-camada": fundo,
    "--texto": p.corTexto,
    "--destaque": p.corDestaque,
    "--texto-botao": p.corTextoBotao,
    "--raio": RAIO[p.estiloBotao] ?? RAIO.arredondado,
    "--borda": p.estiloBotao === "contorno" ? `2px solid ${p.corDestaque}` : "none",
    "--preenchimento": p.estiloBotao === "contorno" ? "transparent" : p.corDestaque,
    "--cor-do-texto-do-botao": p.estiloBotao === "contorno" ? p.corDestaque : p.corTextoBotao,
    fontFamily: `"${p.fonte}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  } as React.CSSProperties;
}

/** Só as fontes que o painel oferece — evita montar URL com valor inválido. */
const FONTES_PERMITIDAS = new Set([
  "Inter", "Poppins", "Montserrat", "Roboto", "Open Sans", "Lato", "Playfair Display",
  "Source Serif 4", "Oswald", "Raleway", "Nunito", "Work Sans", "DM Sans", "Manrope",
]);

export function urlDaFonte(fonte: string): string | null {
  if (!FONTES_PERMITIDAS.has(fonte)) return null;
  const familia = fonte.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${familia}:wght@400;500;600;700;800&display=swap`;
}

export const FONTES = [...FONTES_PERMITIDAS];
