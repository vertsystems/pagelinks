-- Animação do bloco (imagem, botão ou ícones): reflexo, pulsar ou tremida, todas sutis.
-- Vazio = parado, como sempre.
ALTER TABLE "Card" ADD COLUMN "animacao" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "animacao";
