-- Barras do bloco de redes: tamanho dos ícones e espaço entre eles, em px. Vazio = padrão.
ALTER TABLE "Card" ADD COLUMN "iconeTamanho" INTEGER;
ALTER TABLE "Card" ADD COLUMN "iconeEspaco" INTEGER;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "iconeTamanho";
-- ALTER TABLE "Card" DROP COLUMN "iconeEspaco";
