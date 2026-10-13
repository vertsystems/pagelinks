-- Blocos lado a lado: cada bloco ocupa uma fração da linha (3/4, 2/3, 1/2, 1/3, 1/4). Vazio = inteira.
ALTER TABLE "Card" ADD COLUMN "largura" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "largura";
