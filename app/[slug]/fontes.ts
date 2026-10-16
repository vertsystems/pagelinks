import {
  DM_Sans,
  Inter,
  Lato,
  Manrope,
  Montserrat,
  Nunito,
  Open_Sans,
  Oswald,
  Playfair_Display,
  Poppins,
  Raleway,
  Roboto,
  Source_Serif_4,
  Work_Sans,
} from "next/font/google";

/**
 * As fontes da página (as 14 do painel, FONTES em lib/tema.ts), servidas pelo próprio dnms.fun.
 *
 * Antes vinham do Google Fonts por <link rel="stylesheet">: a página só pintava depois de
 * abrir conexão com fonts.googleapis.com, baixar o CSS e só então ir a fonts.gstatic.com (o
 * Lighthouse media ~0,9 s a menos no celular sem isso). O next/font baixa os arquivos no build
 * e põe o @font-face no CSS da página, com uma fonte de reserva ajustada às medidas da
 * original: o texto aparece na hora e quase não mexe quando a fonte chega.
 *
 * Só o latino (o português cabe nele, ™ e ® também). Sem preload: pré-carregar as 14 em toda
 * página disputaria banda com o banner do topo, que é o que conta como carregamento (LCP); o
 * @font-face sozinho não baixa nada, só a fonte que a página usa vai para o navegador.
 * Lato e Poppins não são variáveis: vão os pesos que a página usa (400, 600 do botão, 700).
 */
// O next/font lê as opções no build: cada fonte numa constante própria, no topo do módulo,
// com as opções escritas na chamada (sem objeto em volta nem variável).
const f_inter = Inter({ subsets: ["latin"], display: "swap", preload: false });
const f_poppins = Poppins({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "600", "700"] });
const f_montserrat = Montserrat({ subsets: ["latin"], display: "swap", preload: false });
const f_roboto = Roboto({ subsets: ["latin"], display: "swap", preload: false });
const f_opensans = Open_Sans({ subsets: ["latin"], display: "swap", preload: false });
const f_lato = Lato({ subsets: ["latin"], display: "swap", preload: false, weight: ["400", "700"] });
const f_playfairdisplay = Playfair_Display({ subsets: ["latin"], display: "swap", preload: false });
const f_sourceserif4 = Source_Serif_4({ subsets: ["latin"], display: "swap", preload: false });
const f_oswald = Oswald({ subsets: ["latin"], display: "swap", preload: false });
const f_raleway = Raleway({ subsets: ["latin"], display: "swap", preload: false });
const f_nunito = Nunito({ subsets: ["latin"], display: "swap", preload: false });
const f_worksans = Work_Sans({ subsets: ["latin"], display: "swap", preload: false });
const f_dmsans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false });
const f_manrope = Manrope({ subsets: ["latin"], display: "swap", preload: false });

const FONTES_DA_PAGINA: Record<string, { style: { fontFamily: string } }> = {
  Inter: f_inter,
  Poppins: f_poppins,
  Montserrat: f_montserrat,
  Roboto: f_roboto,
  "Open Sans": f_opensans,
  Lato: f_lato,
  "Playfair Display": f_playfairdisplay,
  "Source Serif 4": f_sourceserif4,
  Oswald: f_oswald,
  Raleway: f_raleway,
  Nunito: f_nunito,
  "Work Sans": f_worksans,
  "DM Sans": f_dmsans,
  Manrope: f_manrope,
};

/** A família para o font-family da página: a fonte servida daqui e a reserva ajustada; null se não for uma das 14. */
export function familiaDaFonte(fonte: string) {
  return Object.hasOwn(FONTES_DA_PAGINA, fonte) ? FONTES_DA_PAGINA[fonte].style.fontFamily : null;
}
