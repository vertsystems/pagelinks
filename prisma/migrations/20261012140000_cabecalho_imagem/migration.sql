-- Imagem que substitui o título e a frase de apresentação no topo da página.
ALTER TABLE "Pagina" ADD COLUMN "cabecalhoImagemUrl" TEXT;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "cabecalhoImagemUrl";
