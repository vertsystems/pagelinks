import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { SLUGS_RESERVADOS } from "@/lib/slug";

/**
 * Redirecionamentos: um endereço do domínio (dnms.fun/fulano, ou a própria página inicial)
 * que leva para outro lugar, no dnms.fun ou em qualquer site. O painel cria em
 * /gestao/redirecionamentos; a página pública consulta só quando o endereço não tem página no
 * ar, então uma página publicada sempre ganha e as páginas que existem não fazem consulta a
 * mais. A página inicial não tem página: com redirecionamento, ele vale (app/page.tsx).
 */

/** O domínio das páginas. A origem de um redirecionamento é sempre um endereço dele. */
export const DOMINIO = "dnms.fun";

/** Trecho de endereço aceito: letras sem acento, números, hífen e sublinhado (como os slugs). */
const TRECHO = /^[a-z0-9_-]+$/;
const PARECE_DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i;
/** O domínio na frente do que foi digitado sem https ("dnms.fun/fulano"). */
const DOMINIO_NA_FRENTE = new RegExp(`^(www\\.)?${DOMINIO.replace(/\./g, "\\.")}(?=[/?#]|$)`, "i");

export type Endereco = { caminho: string; resto: string };
/** Para onde o redirecionamento leva: um endereço do dnms.fun ou um site de fora. */
export type Destino = ({ tipo: "interno" } & Endereco) | { tipo: "externo"; url: string };

/** Os trechos de um caminho, juntos por barra e em minúsculas; null se algum não serve. */
function juntarTrechos(trechos: string[]): string | null {
  const limpos: string[] = [];
  for (const trecho of trechos) {
    let t: string;
    try {
      t = decodeURIComponent(trecho).toLowerCase();
    } catch {
      return null;
    }
    if (!t) continue;
    if (!TRECHO.test(t)) return null;
    limpos.push(t);
  }
  return limpos.join("/");
}

/**
 * Lê um endereço do dnms.fun digitado no painel (a origem, ou um destino aqui dentro): o link
 * inteiro ("https://dnms.fun/fulano/"), sem o https ("dnms.fun/fulano") ou só o final
 * ("fulano", "/fulano/"; "/" ou "dnms.fun" é a página inicial). Devolve o caminho sem barras
 * nas pontas e em minúsculas ("fulano", "fulano/links", "" na inicial) e o que vem depois dele
 * ("?utm_source=bio"), ou o motivo de não servir.
 */
export function lerEndereco(texto: string): Endereco | { erro: string } {
  let t = texto.trim();
  const url = t.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)(.*)$/i);
  if (url) {
    if (url[1].toLowerCase().replace(/^www\./, "") !== DOMINIO) {
      return { erro: `${url[1]} é outro site: o endereço antigo precisa ser do ${DOMINIO}, que é o domínio que a gente controla.` };
    }
    t = url[2];
  } else {
    t = t.replace(DOMINIO_NA_FRENTE, "");
  }

  const corte = t.search(/[?#]/);
  const caminho = corte === -1 ? t : t.slice(0, corte);
  const resto = corte === -1 ? "" : t.slice(corte);
  if (/\s/.test(caminho) || /\s/.test(resto)) return { erro: "O endereço não pode ter espaço." };

  const trechos = caminho.split("/").filter(Boolean);
  if (trechos[0] && PARECE_DOMINIO.test(trechos[0])) {
    return { erro: `${trechos[0]} parece ser outro site: o endereço antigo precisa ser do ${DOMINIO}, que é o domínio que a gente controla.` };
  }
  const junto = juntarTrechos(trechos);
  if (junto === null) return { erro: "Use só letras sem acento, números, hífen e barra." };
  return { caminho: junto, resto: resto === "?" || resto === "#" ? "" : resto };
}

/**
 * Lê o destino digitado no painel. Do dnms.fun (só o final, "novo", ou o link com o domínio)
 * vira caminho, como na origem. De outro site, o link completo ("https://loja.com.br/promo";
 * sem o https, "loja.com.br/promo", ele entra sozinho). Só http e https: nada de javascript:,
 * e-mail ou outro esquema que o navegador abriria no lugar de ir a um site.
 */
export function lerDestino(texto: string): Destino | { erro: string } {
  let t = texto.trim();
  const esquema = t.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i);
  let host = esquema?.[2];
  // outro esquema (ftp://, mailto:, javascript:…): o navegador abriria outra coisa no lugar de um site
  if ((esquema && !/^https?$/i.test(esquema[1])) || (!esquema && /^[a-z][a-z0-9+.-]*:(?!\d)/i.test(t))) {
    return { erro: "Use um link de site, começando com https://." };
  }
  if (!esquema) {
    const primeiro = t.split(/[/?#]/)[0];
    // "loja.com.br/promo": é um site de fora sem o https (o dnms.fun sem https cai no interno)
    if (PARECE_DOMINIO.test(primeiro) && !DOMINIO_NA_FRENTE.test(primeiro)) {
      t = `https://${t}`;
      host = primeiro;
    }
  }
  if (!host || host.toLowerCase().replace(/^www\./, "") === DOMINIO) {
    const interno = lerEndereco(t);
    return "erro" in interno ? interno : { tipo: "interno", ...interno };
  }
  if (/\s/.test(t)) return { erro: "O link não pode ter espaço." };
  try {
    const url = new URL(t);
    if (!url.hostname.includes(".")) return { erro: "Esse endereço de site não parece completo." };
    return { tipo: "externo", url: url.href };
  } catch {
    return { erro: "Esse link não parece completo. Copie direto da barra do navegador." };
  }
}

/**
 * Como o destino é gravado. Do dnms.fun, o caminho, sempre com a barra no fim (trailingSlash),
 * para ir direto, sem um redirecionamento a mais; de fora, o link inteiro.
 */
export function destinoParaGravar(destino: Destino) {
  if (destino.tipo === "externo") return destino.url;
  return `/${destino.caminho ? `${destino.caminho}/` : ""}${destino.resto}`;
}

/** Destino gravado que vai para outro site (o do dnms.fun começa por "/"). */
export const destinoExterno = (para: string) => !para.startsWith("/");

/** O caminho de um destino do dnms.fun, sem barras nem busca ("/novo/?x=1" vira "novo"); null se é de outro site. */
export function caminhoDoDestino(para: string) {
  if (destinoExterno(para)) return null;
  return para.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
}

/** O destino para ler na tela: "dnms.fun/novo/", ou o outro site sem o https. */
export function destinoParaMostrar(para: string) {
  return destinoExterno(para) ? para.replace(/^https?:\/\//i, "") : `${DOMINIO}${para}`;
}

type Busca = Record<string, string | string[] | undefined>;

/**
 * O destino com a busca de quem chegou (?utm_source=…), quando o destino não tem a sua:
 * o link antigo que estava num anúncio ou numa bio continua dizendo de onde veio.
 */
function comBusca(para: string, busca?: Busca) {
  if (!busca || para.includes("?")) return para;
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(busca)) {
    for (const v of Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]) parametros.append(chave, v);
  }
  const texto = parametros.toString();
  if (!texto) return para;
  const [caminho, ancora] = para.split("#");
  return `${caminho}?${texto}${ancora !== undefined ? `#${ancora}` : ""}`;
}

/**
 * Para onde vai quem chega num endereço que não tem página no ar, ou null. Sem trechos, é a
 * página inicial. Endereço que nenhum redirecionamento pode ter (com ponto, como
 * /wp-login.php, ou de rota do sistema) nem vai ao banco: é o que os robôs mais tentam.
 * `contar` fica falso para quem está logado no painel, como no script de métricas: testar o
 * próprio link não vira acesso.
 */
export async function destinoDoRedirecionamento(trechos: string[], busca: Busca | undefined, contar: boolean) {
  const de = juntarTrechos(trechos);
  if (de === null || SLUGS_RESERVADOS.includes(de.split("/")[0])) return null;

  const redirecionamento = await prisma.redirecionamento.findUnique({ where: { de }, select: { id: true, para: true } });
  if (!redirecionamento) return null;

  if (contar) {
    // Depois de responder: a contagem não atrasa quem está indo, e se falhar a pessoa segue igual.
    after(() =>
      prisma.redirecionamento
        .update({ where: { id: redirecionamento.id }, data: { acessos: { increment: 1 }, ultimoAcessoEm: new Date() } })
        .catch(() => {}),
    );
  }
  return comBusca(redirecionamento.para, busca);
}
