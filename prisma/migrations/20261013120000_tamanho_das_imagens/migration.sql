-- Tamanho de exibição escolhido no painel (barra de tamanho). Vazio = tamanho padrão.
ALTER TABLE "Pagina" ADD COLUMN "avatarTamanho" INTEGER;
ALTER TABLE "Pagina" ADD COLUMN "cabecalhoTamanho" INTEGER;
ALTER TABLE "Card" ADD COLUMN "imagemTamanho" INTEGER;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "avatarTamanho";
-- ALTER TABLE "Pagina" DROP COLUMN "cabecalhoTamanho";
-- ALTER TABLE "Card" DROP COLUMN "imagemTamanho";
