-- Bloco "lista": itens um embaixo do outro (serviços, horários…), um por linha,
-- com o marcador escolhido (bolinha, visto ou número).
ALTER TABLE "Card" ADD COLUMN "itens" TEXT;
ALTER TABLE "Card" ADD COLUMN "marcador" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "marcador";
-- ALTER TABLE "Card" DROP COLUMN "itens";
