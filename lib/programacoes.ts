/**
 * Foto e aparência programadas (20/11/2026, pedido do Bruno): num período, a página mostra outra
 * foto ou logo no topo, ou outra aparência (cores, fonte, formato dos botões e fundo), e volta
 * sozinha às de sempre quando ele acaba. Para campanha, data comemorativa, ação específica.
 *
 * O mesmo jeito dos links programados (lib/linksProgramados.ts): os períodos de cada tipo não se
 * sobrepõem numa página, então há no máximo uma foto e uma aparência no ar, e a página pública
 * pede ao banco só a que está no ar agora (emVigor). As que acabaram são apagadas, com a imagem
 * (lib/programacoes-banco.ts), quando a página grava outra e no /api/manter-banco/.
 *
 * A prévia do painel mostra uma programação antes de ela entrar: /<slug>/?previa=…&ver=foto.<id>
 * (ou aparencia.<id>), só para quem está logado no painel.
 *
 * Sem nada do servidor aqui: o editor também usa.
 */
import { ESTILOS_BOTAO, FONTES, TIPOS_DE_FUNDO } from "@/lib/tema";
import { deHorarioDeBrasilia } from "@/lib/horario";

/** Quantas de cada tipo uma página tem ao mesmo tempo. As que já acabaram não contam. */
export const MAXIMO_DE_PROGRAMACOES = 10;

export type TipoProgramacao = "foto" | "aparencia";

/** O tema da página que a aparência programada troca: os mesmos campos da Pagina. */
export type Aparencia = {
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

export type Foto = { imagemUrl: string; largura: number | null; altura: number | null };

/** A página com a aparência programada por cima; sem ela, a página como está. */
export function comAparencia<T extends Aparencia>(pagina: T, a: Aparencia | null | undefined): T {
  if (!a) return pagina;
  return {
    ...pagina,
    corFundo: a.corFundo,
    corTexto: a.corTexto,
    corDestaque: a.corDestaque,
    corTextoBotao: a.corTextoBotao,
    fonte: a.fonte,
    estiloBotao: a.estiloBotao,
    fundoTipo: a.fundoTipo,
    fundoCorFim: a.fundoCorFim,
    fundoImagemUrl: a.fundoImagemUrl,
  };
}

/** A página com a foto programada no lugar da foto do topo (formato e tamanho continuam os da página). */
export function comFoto<T extends { avatarUrl: string | null; avatarLargura: number | null; avatarAltura: number | null }>(pagina: T, f: Foto | null | undefined): T {
  return f ? { ...pagina, avatarUrl: f.imagemUrl, avatarLargura: f.largura, avatarAltura: f.altura } : pagina;
}

/** "foto.<id>" ou "aparencia.<id>" do ?ver= da prévia; null se não for nenhum dos dois. */
export function lerVer(texto: unknown): { tipo: TipoProgramacao; id: string } | null {
  const m = typeof texto === "string" ? texto.match(/^(foto|aparencia)\.([a-z0-9]{10,40})$/) : null;
  return m ? { tipo: m[1] as TipoProgramacao, id: m[2] } : null;
}

const HEX = /^#[0-9a-f]{6}$/i;
const NOMES_DAS_CORES = { corFundo: "Fundo", corTexto: "Texto", corDestaque: "Botões", corTextoBotao: "Texto dentro do botão" } as const;

/**
 * A aparência que chegou do editor (FormData), conferida, ou o motivo de não servir. A imagem de
 * fundo não passa por aqui: vem como arquivo e é conferida na ação.
 */
export function lerAparencia(dados: FormData): { aparencia: Omit<Aparencia, "fundoImagemUrl"> } | { erro: string } {
  const texto = (campo: string) => String(dados.get(campo) ?? "").trim();
  const cores = {} as Record<keyof typeof NOMES_DAS_CORES, string>;
  for (const [campo, nome] of Object.entries(NOMES_DAS_CORES) as [keyof typeof NOMES_DAS_CORES, string][]) {
    const cor = texto(campo);
    if (!HEX.test(cor)) return { erro: `A cor “${nome}” precisa estar no formato #RRGGBB.` };
    cores[campo] = cor.toUpperCase();
  }
  const fonte = texto("fonte");
  if (!FONTES.includes(fonte)) return { erro: "Escolha uma das fontes da lista." };
  const estiloBotao = texto("estiloBotao");
  if (!ESTILOS_BOTAO.some((e) => e.valor === estiloBotao)) return { erro: "Escolha um formato de botão da lista." };
  const fundoTipo = texto("fundoTipo");
  if (!TIPOS_DE_FUNDO.some((t) => t.valor === fundoTipo)) return { erro: "Escolha um tipo de fundo da lista." };
  const corFim = texto("fundoCorFim");
  if (corFim && !HEX.test(corFim)) return { erro: "A segunda cor do degradê precisa estar no formato #RRGGBB." };
  if (fundoTipo === "gradiente" && !corFim) return { erro: "Escolha a segunda cor do degradê." };
  return { aparencia: { ...cores, fonte, estiloBotao, fundoTipo, fundoCorFim: corFim ? corFim.toUpperCase() : null } };
}

/**
 * Início e fim como o campo datetime-local manda (horário de Brasília), conferidos: os dois
 * preenchidos, o fim depois do início e ainda por vir.
 */
export function lerPeriodo(inicioTexto: unknown, fimTexto: unknown, agora: Date): { inicio: Date; fim: Date } | { erro: string } {
  const inicio = deHorarioDeBrasilia(String(inicioTexto ?? ""));
  const fim = deHorarioDeBrasilia(String(fimTexto ?? ""));
  if (!inicio || !fim) return { erro: "Preencha quando começa e quando acaba." };
  if (fim <= inicio) return { erro: "O fim precisa vir depois do começo." };
  if (fim <= agora) return { erro: "Esse período já acabou. Escolha um fim daqui para a frente." };
  return { inicio, fim };
}

/** A outra programação que divide algum minuto com o período; encostar (uma acaba quando a outra começa) não conta. */
export function periodoQueBate<T extends { inicio: Date; fim: Date }>(outros: T[], periodo: { inicio: Date; fim: Date }) {
  return outros.find((o) => o.inicio < periodo.fim && o.fim > periodo.inicio) ?? null;
}
