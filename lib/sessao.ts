import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token da sessão do painel: "<dados>.<assinatura>", com HMAC-SHA256 sobre os dados.
 * Sem biblioteca — o cookie só precisa provar que foi o servidor quem o emitiu.
 * Fica separado de lib/acesso.ts porque o proxy também lê o token, e ele não
 * deve puxar banco nem next/headers.
 */

export const COOKIE_SESSAO = "pl_sessao";
export const DURACAO_SESSAO = 30 * 24 * 60 * 60 * 1000; // 30 dias

type Sessao = { uid: string; exp: number };

function assinar(dados: string) {
  const segredo = process.env.SESSAO_SEGREDO;
  if (!segredo) throw new Error("SESSAO_SEGREDO não definido: o painel não abre sem ele.");
  return createHmac("sha256", segredo).update(dados).digest("base64url");
}

export function criarToken(uid: string) {
  const sessao: Sessao = { uid, exp: Date.now() + DURACAO_SESSAO };
  const dados = Buffer.from(JSON.stringify(sessao)).toString("base64url");
  return `${dados}.${assinar(dados)}`;
}

/** Devolve a sessão se a assinatura confere e ela não venceu; senão, null. */
export function lerToken(token: string | undefined): Sessao | null {
  if (!token) return null;
  const [dados, assinatura] = token.split(".");
  if (!dados || !assinatura) return null;

  const esperada = Buffer.from(assinar(dados));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  try {
    const sessao = JSON.parse(Buffer.from(dados, "base64url").toString()) as Sessao;
    return typeof sessao.uid === "string" && sessao.exp > Date.now() ? sessao : null;
  } catch {
    return null;
  }
}
