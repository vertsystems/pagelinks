-- Formato da foto do topo: vazio = redonda; "livre" = o logo inteiro, sem cortar nem borda.
ALTER TABLE "Pagina" ADD COLUMN "avatarFormato" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "avatarFormato";
