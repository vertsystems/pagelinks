-- Qual unidade ou imagem do carrossel foi clicada. O clique continua contando para o
-- bloco (cardId); o item é quem, dentro dele, levou a pessoa — o DMetric mostra a loja
-- e a imagem que mais rendem. Os cliques de antes ficam sem item.

-- AlterTable
ALTER TABLE "Clique" ADD COLUMN "itemId" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Clique" DROP COLUMN "itemId";
