-- Barras da página: espaço acima do topo e espaço entre os blocos, em px. Vazio = padrão.
ALTER TABLE "Pagina" ADD COLUMN "espacoTopo" INTEGER;
ALTER TABLE "Pagina" ADD COLUMN "espacoBlocos" INTEGER;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "espacoTopo";
-- ALTER TABLE "Pagina" DROP COLUMN "espacoBlocos";
