-- Tamanho real de cada imagem (largura e altura do arquivo, em px). A página põe no <img>
-- e o navegador guarda o lugar antes de a imagem chegar: sem isso a página pulava (CLS).
-- As que já existiam são medidas por `npm run db:medir-imagens`.

-- AlterTable
ALTER TABLE "Pagina" ADD COLUMN "avatarLargura" INTEGER,
ADD COLUMN "avatarAltura" INTEGER,
ADD COLUMN "cabecalhoLargura" INTEGER,
ADD COLUMN "cabecalhoAltura" INTEGER;

-- AlterTable
ALTER TABLE "Card" ADD COLUMN "imagemLargura" INTEGER,
ADD COLUMN "imagemAltura" INTEGER;

-- AlterTable
ALTER TABLE "ImagemCarrossel" ADD COLUMN "largura" INTEGER,
ADD COLUMN "altura" INTEGER;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "avatarLargura", DROP COLUMN "avatarAltura", DROP COLUMN "cabecalhoLargura", DROP COLUMN "cabecalhoAltura";
-- ALTER TABLE "Card" DROP COLUMN "imagemLargura", DROP COLUMN "imagemAltura";
-- ALTER TABLE "ImagemCarrossel" DROP COLUMN "largura", DROP COLUMN "altura";
