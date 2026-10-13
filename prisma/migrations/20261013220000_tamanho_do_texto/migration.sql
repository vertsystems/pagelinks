-- Tamanho da letra do título e da frase de apresentação (celular; tablet e computador
-- vão no JSON de ajustes por tela). Vazio = o tamanho de sempre.
ALTER TABLE "Pagina" ADD COLUMN "tituloTamanho" INTEGER;
ALTER TABLE "Pagina" ADD COLUMN "bioTamanho" INTEGER;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "tituloTamanho";
-- ALTER TABLE "Pagina" DROP COLUMN "bioTamanho";
