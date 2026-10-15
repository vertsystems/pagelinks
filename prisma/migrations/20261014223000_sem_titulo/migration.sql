-- Página sem título e sem frase à vista (fica só a foto ou logo). O título continua
-- guardado: vale para o Google, a aba do navegador e o leitor de tela.
ALTER TABLE "Pagina" ADD COLUMN "semTitulo" BOOLEAN NOT NULL DEFAULT false;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Pagina" DROP COLUMN "semTitulo";
