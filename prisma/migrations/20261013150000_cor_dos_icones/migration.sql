-- Cor dos ícones do bloco de redes: vazio = cor do texto da página, "marcas" ou "#RRGGBB".
ALTER TABLE "Card" ADD COLUMN "iconeCor" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Card" DROP COLUMN "iconeCor";
