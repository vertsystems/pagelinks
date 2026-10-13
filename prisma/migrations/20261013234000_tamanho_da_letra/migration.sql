-- Tamanho da letra dos blocos de título e de texto (celular; tablet e computador vão no
-- JSON de ajustes por tela). Vazio = o tamanho de sempre de cada bloco.
ALTER TABLE "Card" ADD COLUMN "letraTamanho" INTEGER;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "letraTamanho";
