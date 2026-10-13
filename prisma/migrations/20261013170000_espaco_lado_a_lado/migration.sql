-- Espaço entre blocos lado a lado (no celular; tablet e computador no JSON). Vazio = igual ao espaço entre os blocos.
ALTER TABLE "Pagina" ADD COLUMN "espacoLado" INTEGER;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "espacoLado";
