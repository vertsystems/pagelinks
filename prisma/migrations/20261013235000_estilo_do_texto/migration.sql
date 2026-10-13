-- Estilo dos blocos de título e de texto: fonte própria e formato (negrito, itálico,
-- sublinhado, riscado). A cor usa a coluna corTexto, que já existia. Vazio = o de sempre.
ALTER TABLE "Card" ADD COLUMN "fonte" TEXT;
ALTER TABLE "Card" ADD COLUMN "formato" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "formato";
-- ALTER TABLE "Card" DROP COLUMN "fonte";
