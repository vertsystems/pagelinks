/**
 * Data e hora do jeito que o painel recebe e mostra: sempre no horário de Brasília.
 *
 * O campo datetime-local manda "2026-10-20T14:00", sem fuso. Lido com new Date() no servidor,
 * que na Vercel roda em UTC, virava 14h UTC: um bloco agendado para as 14h entrava às 11h.
 * Aqui o fuso de Brasília entra na conta pela própria tabela de fusos (Intl), então se o
 * horário de verão voltar um dia, a conta acompanha.
 */

export const FUSO = "America/Sao_Paulo";

const PARTES = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const CURTA = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const COM_ANO = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function partes(d: Date) {
  const p: Record<string, string> = {};
  for (const { type, value } of PARTES.formatToParts(d)) p[type] = value;
  return p;
}

/** Date → "2026-10-20T14:00" no horário de Brasília, o valor de um campo datetime-local. */
export function paraCampoDeHorario(d: Date | string | null | undefined) {
  if (!d) return "";
  const data = new Date(d);
  if (Number.isNaN(data.getTime())) return "";
  const p = partes(data);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** "2026-10-20T14:00", digitado no horário de Brasília → Date; null se vazio ou inválido. */
export function deHorarioDeBrasilia(texto: string | null | undefined): Date | null {
  const m = String(texto ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  // os números como se fossem UTC; a diferença para o que Brasília mostra nesse instante é o fuso
  const comoUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const p = partes(new Date(comoUtc));
  const visto = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  const data = new Date(comoUtc - (visto - comoUtc));
  return Number.isNaN(data.getTime()) ? null : data;
}

/** "20/10 às 14:00" (com o ano quando não é o de agora), no horário de Brasília. */
export function dataHoraCurta(d: Date | string, agora: Date | number = new Date()) {
  const data = new Date(d);
  const formato = partes(data).year === partes(new Date(agora)).year ? CURTA : COM_ANO;
  return formato.format(data).replace(", ", " às ");
}
