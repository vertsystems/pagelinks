-- Formatação por trecho nos blocos de título e de texto: negrito, itálico, sublinhado,
-- riscado e cor em cada pedaço do texto (JSON de trechos, ver lib/textoRico.ts).
-- Vazio = o texto puro da coluna titulo, como sempre.
ALTER TABLE "Card" ADD COLUMN "rico" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "rico";
