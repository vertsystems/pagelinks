import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { SLUGS_RESERVADOS } from "@/lib/slug";

/**
 * Redirecionamentos: um endereço antigo do domínio (dnms.fun/fulano) que leva para outro do
 * mesmo domínio. O painel cria em /gestao/redirecionamentos; a página pública consulta só
 * quando o endereço não tem página no ar, então uma página publicada sempre ganha e as
 * páginas que existem não fazem consulta a mais.
 */

/** O domínio das páginas. O redirecionamento só leva de um endereço dele para outro. */
export const DOMINIO = "dnms.fun";

/** Trecho de endereço aceito: letras sem acento, números, hífen e sublinhado (como os slugs). */
const TRECHO = /^[a-z0-9_-]+$/;
const PARECE_DOMINIO = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/i;
/** O domínio na frente do que foi digitado sem https ("dnms.fun/fulano"). */
const DOMINIO_NA_FRENTE = new RegExp(`^(www\\.)?${DOMINIO.replace(/\./g, "\\.")}(?=[/?#]|$)`, "i");

export type Endereco = { caminho: string; resto: string };

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
 * Lê um endereço digitado no painel: o link inteiro ("https://dnms.fun/fulano/"), sem o
 * https ("dnms.fun/fulano") ou só o final ("fulano", "/fulano/"). Devolve o caminho sem
 * barras nas pontas e em minúsculas ("fulano", "fulano/links") e o que vem depois dele
 * ("?utm_source=bio"), ou o motivo de não servir.
 */
export function lerEndereco(texto: string): Endereco | { erro: string } {
  let t = texto.trim();
  const url = t.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)(.*)$/i);
  if (url) {
    if (url[1].toLowerCase().replace(/^www\./, "") !== DOMINIO) {
      return { erro: `${url[1]} é outro site. O redirecionamento só leva para endereços do ${DOMINIO}.` };
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
    return { erro: `${trechos[0]} parece ser outro site. O redirecionamento só leva para endereços do ${DOMINIO}.` };
  }
  const junto = juntarTrechos(trechos);
  if (junto === null) return { erro: "Use só letras sem acento, números, hífen e barra." };
  return { caminho: junto, resto: resto === "?" || resto === "#" ? "" : resto };
}

/** Como o destino é gravado: sempre com a barra no fim (trailingSlash), para ir direto, sem um redirecionamento a mais. */
export function destinoParaGravar({ caminho, resto }: Endereco) {
  return `/${caminho ? `${caminho}/` : ""}${resto}`;
}

/** O caminho de um destino gravado, sem barras nem busca: "/novo/?x=1" vira "novo". */
export function caminhoDoDestino(para: string) {
  return para.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
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
 * Para onde vai quem chega num endereço que não tem página no ar, ou null. Endereço que
 * nenhum redirecionamento pode ter (com ponto, como /wp-login.php, ou de rota do sistema)
 * nem vai ao banco: é o que os robôs mais tentam. `contar` fica falso para quem está
 * logado no painel, como no script de métricas: testar o próprio link não vira acesso.
 */
export async function destinoDoRedirecionamento(trechos: string[], busca: Busca | undefined, contar: boolean) {
  const de = juntarTrechos(trechos);
  if (!de || SLUGS_RESERVADOS.includes(de.split("/")[0])) return null;

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
