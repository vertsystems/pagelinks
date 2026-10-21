/**
 * Bloco de vídeo. O vídeo não vem para o PageLinks: fica no serviço onde já está (YouTube,
 * Vimeo, Instagram, TikTok, Google Drive, Loom, Facebook ou qualquer outro que dê um link de
 * incorporação), e a página mostra o player dele num <iframe>. No painel vale colar o link
 * do vídeo, o link de incorporação ou o código <iframe> inteiro.
 *
 * Horizontal (16:9) ou vertical (9:16) fica em Card.formato. Vazio é o do próprio vídeo:
 * Shorts, Reels e TikTok em pé, o resto deitado.
 */

export type Orientacao = "horizontal" | "vertical";

export type Video = {
  /** endereço do player, o src do <iframe> */
  player: string;
  /** de onde é, para o painel dizer o que reconheceu */
  servico: string;
  /** o vídeo nasceu em pé (Shorts, Reels, TikTok) */
  emPe: boolean;
  /** YouTube: a imagem do vídeo, para a capa (e a menor, que sempre existe, se a grande faltar) */
  capa?: { src: string; reserva: string };
  /** Vimeo: o endereço do vídeo, para buscar a capa na API dele (capaDoVimeo) */
  vimeo?: string;
};

/**
 * Do que foi colado no painel, o link a gravar: o src do <iframe> quando vem o código inteiro,
 * com o https na frente quando falta. null quando não é um endereço de site.
 */
export function linkDoVideo(colado: string | null | undefined): string | null {
  let t = String(colado ?? "").trim().slice(0, 4000);
  const iframe = t.match(/<iframe\b[^>]*?\bsrc\s*=\s*(["'])(.*?)\1/i);
  if (iframe) t = iframe[2].replace(/&amp;/g, "&").trim();
  if (!t || /\s/.test(t)) return null;
  if (t.startsWith("//")) t = `https:${t}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) t = `https://${t}`;
  try {
    const url = new URL(t);
    // a página é https: um player em http seria bloqueado pelo navegador
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:" || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** "90", "1m30s" ou "1h2m3s" em segundos (o começo do vídeo no YouTube). */
function segundos(valor: string | null): number {
  if (!valor) return 0;
  if (/^\d+$/.test(valor)) return Number(valor);
  const m = valor.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/** O player do que foi colado no painel, ou null quando não dá para tocar. */
export function lerVideo(colado: string | null | undefined): Video | null {
  const link = linkDoVideo(colado);
  if (!link) return null;
  const url = new URL(link);
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, "");
  const caminho = url.pathname;

  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com") {
    const id = host === "youtu.be" ? caminho.slice(1).split("/")[0] : (url.searchParams.get("v") ?? caminho.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/)?.[1]);
    if (id && /^[\w-]{11}$/.test(id) && id !== "videoseries") {
      const inicio = segundos(url.searchParams.get("t") ?? url.searchParams.get("start"));
      const emPe = caminho.startsWith("/shorts/");
      return {
        player: `https://www.youtube.com/embed/${id}${inicio ? `?start=${inicio}` : ""}`,
        servico: "YouTube",
        emPe,
        // a grande (maxres) nem todo vídeo tem; Shorts têm a em pé (oar). A hq existe sempre
        capa: { src: `https://i.ytimg.com/vi/${id}/${emPe ? "oardefault" : "maxresdefault"}.jpg`, reserva: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` },
      };
    }
    const lista = url.searchParams.get("list");
    if (lista && /^[\w-]+$/.test(lista)) return { player: `https://www.youtube.com/embed/videoseries?list=${lista}`, servico: "YouTube (playlist)", emPe: false };
    return null; // canal ou página do YouTube que não é um vídeo
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = caminho.match(/(?:^|\/)(\d{5,})(?:\/([\da-f]{6,}))?(?:\/|$)/);
    if (!m) return null;
    // vídeo não listado: o código depois do número (vimeo.com/123/abc) ou o ?h= do player
    const chave = m[2] ?? url.searchParams.get("h");
    return { player: `https://player.vimeo.com/video/${m[1]}${chave ? `?h=${chave}` : ""}`, servico: "Vimeo", emPe: false, vimeo: `https://vimeo.com/${m[1]}${chave ? `/${chave}` : ""}` };
  }

  if (host === "instagram.com") {
    const m = caminho.match(/^\/(p|reels?|tv)\/([\w-]+)/);
    if (!m) return null;
    const tipo = m[1] === "reels" ? "reel" : m[1];
    return { player: `https://www.instagram.com/${tipo}/${m[2]}/embed`, servico: "Instagram", emPe: tipo === "reel" };
  }

  if (host === "tiktok.com") {
    const id = caminho.match(/\/video\/(\d+)/)?.[1] ?? caminho.match(/^\/embed(?:\/v2)?\/(\d+)/)?.[1];
    return id ? { player: `https://www.tiktok.com/embed/v2/${id}`, servico: "TikTok", emPe: true } : null;
  }
  // o link curto do TikTok (vm.tiktok.com/…) só diz qual é o vídeo depois de aberto
  if (host.endsWith(".tiktok.com")) return null;

  if (host === "drive.google.com") {
    const id = caminho.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get("id");
    return id && /^[\w-]+$/.test(id) ? { player: `https://drive.google.com/file/d/${id}/preview`, servico: "Google Drive", emPe: false } : null;
  }

  if (host === "loom.com") {
    const id = caminho.match(/^\/(?:share|embed)\/([\da-f]+)/)?.[1];
    return id ? { player: `https://www.loom.com/embed/${id}`, servico: "Loom", emPe: false } : null;
  }

  if (host === "facebook.com" || host === "fb.watch") {
    if (caminho.startsWith("/plugins/video.php")) return { player: link, servico: "Facebook", emPe: false };
    if (host === "fb.watch" || /\/(videos|reel|watch)\b/.test(caminho)) {
      return { player: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=false`, servico: "Facebook", emPe: caminho.startsWith("/reel") };
    }
    return null;
  }

  // qualquer outro serviço: o link de incorporação que ele deu já é o player
  return { player: link, servico: host, emPe: false };
}

/**
 * O player já tocando: é o que entra no lugar da capa quando a pessoa aperta o play (um toque só,
 * sem precisar apertar de novo dentro do player).
 */
export function comAutoplay(player: string): string {
  const url = new URL(player);
  url.searchParams.set("autoplay", "1");
  if (url.hostname.endsWith("youtube.com")) {
    url.searchParams.set("rel", "0"); // no fim, vídeos do mesmo canal, e não de qualquer um
    url.searchParams.set("playsinline", "1"); // no iPhone, toca na página em vez de abrir em tela cheia
  }
  return url.toString();
}

/**
 * A capa de um vídeo do Vimeo, pela API pública dele (oEmbed), guardada por um dia. Sem resposta
 * em 2,5 s, ou se o vídeo não deixa, fica sem capa: a página mostra o player do Vimeo direto.
 */
export async function capaDoVimeo(video: Video): Promise<string | null> {
  if (!video.vimeo) return null;
  try {
    const resposta = await fetch(`https://vimeo.com/api/oembed.json?width=1280&url=${encodeURIComponent(video.vimeo)}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2500),
    });
    if (!resposta.ok) return null;
    const dados = (await resposta.json()) as { thumbnail_url?: string };
    return dados.thumbnail_url?.startsWith("https://") ? dados.thumbnail_url : null;
  } catch {
    return null;
  }
}

/** Horizontal ou vertical: o que foi escolhido no painel, ou o do próprio vídeo. */
export function orientacaoDoVideo(formato: string | null | undefined, url: string | null | undefined): Orientacao {
  if (formato === "vertical" || formato === "horizontal") return formato;
  return lerVideo(url)?.emPe ? "vertical" : "horizontal";
}
