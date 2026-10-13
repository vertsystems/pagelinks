-- Layout por tela: tablet e computador guardam só o que mudou em relação ao celular (JSON em texto).
ALTER TABLE "Pagina" ADD COLUMN "ajustesTablet" TEXT;
ALTER TABLE "Pagina" ADD COLUMN "ajustesComputador" TEXT;
ALTER TABLE "Card" ADD COLUMN "ajustesTablet" TEXT;
ALTER TABLE "Card" ADD COLUMN "ajustesComputador" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "ajustesTablet";
-- ALTER TABLE "Pagina" DROP COLUMN "ajustesComputador";
-- ALTER TABLE "Card" DROP COLUMN "ajustesTablet";
-- ALTER TABLE "Card" DROP COLUMN "ajustesComputador";
