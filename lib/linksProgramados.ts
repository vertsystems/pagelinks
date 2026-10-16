/**
 * Links programados: num período, o bloco leva para outro endereço no lugar do endereço de
 * destino (o principal). Vale nos blocos que têm esse campo (link, destaque, imagem e vídeo);
 * o de redes tem um link por ícone e fica de fora. Fora de qualquer período, vale o principal.
 *
 * Os períodos de um bloco não se sobrepõem (o painel recusa), então há no máximo um no ar. A
 * página pública e o /ir/<cardId> pedem ao banco só o que está no ar agora (emVigor).
 */

/** Os blocos com "Endereço de destino" no editor (camposDoTipo em EditorCards.tsx). */
export const TIPOS_COM_LINK_PROGRAMADO = ["link", "destaque", "imagem", "video"];

/** Quantos um bloco tem ao mesmo tempo. Os que já acabaram não contam: somem do editor. */
export const MAXIMO_DE_LINKS_PROGRAMADOS = 10;

/** No ar agora: começou e ainda não acabou (o fim é o minuto em que o principal volta). */
export const emVigor = (agora: Date) => ({ inicio: { lte: agora }, fim: { gt: agora } });

const ESQUEMAS = ["http:", "https:", "mailto:", "tel:", "sms:"];

/**
 * O link digitado, pronto para gravar, ou o motivo de não servir. Sem o https na frente
 * ("instagram.com/fulano"), ele entra sozinho.
 */
export function lerLink(texto: string): { url: string } | { erro: string } {
  let t = String(texto ?? "").trim().slice(0, 2000);
  if (!t) return { erro: "Cole o link que vai valer no período." };
  if (/\s/.test(t)) return { erro: "O link não pode ter espaço." };
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) {
    if (!/^[^/]+\.[^/]+/.test(t)) return { erro: "Use o link completo, como https://site.com.br/pagina." };
    t = `https://${t}`;
  }
  try {
    const url = new URL(t);
    if (!ESQUEMAS.includes(url.protocol)) return { erro: "Use um link de site (https://…), de e-mail (mailto:) ou de telefone (tel:)." };
    if ((url.protocol === "http:" || url.protocol === "https:") && !url.hostname.includes(".")) return { erro: "Esse endereço de site não parece completo." };
  } catch {
    return { erro: "Esse link não parece completo. Copie direto da barra do navegador." };
  }
  return { url: t };
}
