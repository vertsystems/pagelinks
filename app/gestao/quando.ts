/**
 * Quando a página mudou, do jeito que se fala: "agora há pouco", "há 5 min",
 * "hoje às 14:32", "ontem às 09:10", "há 3 dias", "em 12 set", "em 12 set 2025".
 * Sempre no horário de Brasília: o servidor roda em UTC, e o "hoje" é o de quem olha.
 * Calculado no servidor, que entrega o texto pronto (o navegador não refaz a conta).
 */

const FUSO = "America/Sao_Paulo";
const dia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const diaMes = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "numeric", month: "short" });
const completo = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Dias de calendário entre duas datas, no fuso de Brasília ("2026-10-13" vira meia-noite UTC desse dia). */
function diasEntre(a: Date, b: Date) {
  return Math.round((Date.parse(dia.format(b)) - Date.parse(dia.format(a))) / 86_400_000);
}

export function quandoMudou(data: Date, agora = new Date()) {
  const minutos = Math.floor((agora.getTime() - data.getTime()) / 60_000);
  const dias = diasEntre(data, agora);
  let texto: string;
  if (minutos < 1) texto = "agora há pouco";
  else if (minutos < 60) texto = `há ${minutos} min`;
  else if (dias === 0) texto = `hoje às ${hora.format(data)}`;
  else if (dias === 1) texto = `ontem às ${hora.format(data)}`;
  else if (dias < 7) texto = `há ${dias} dias`;
  else {
    const partes = diaMes.formatToParts(data);
    const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
    const ano = dia.format(data).slice(0, 4);
    texto = `em ${parte("day")} ${parte("month").replace(".", "")}${ano === dia.format(agora).slice(0, 4) ? "" : ` ${ano}`}`;
  }
  return { texto, completo: completo.format(data).replace(", ", " às ") };
}
