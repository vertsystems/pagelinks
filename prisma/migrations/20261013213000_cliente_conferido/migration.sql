-- Marcação de revisão no painel: página conferida (verde) ou faltando algo (amarelo).
ALTER TABLE "Cliente" ADD COLUMN "conferido" BOOLEAN NOT NULL DEFAULT false;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Cliente" DROP COLUMN "conferido";
