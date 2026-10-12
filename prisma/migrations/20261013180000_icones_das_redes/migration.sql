-- Ícones do bloco "redes" (vários por bloco, cada um com link) e qual ícone recebeu o clique.

-- AlterTable
ALTER TABLE "Clique" ADD COLUMN     "iconeId" TEXT;

-- CreateTable
CREATE TABLE "Icone" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "rede" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Icone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Icone_cardId_ordem_idx" ON "Icone"("cardId", "ordem");

-- CreateIndex
CREATE INDEX "Clique_iconeId_idx" ON "Clique"("iconeId");

-- AddForeignKey
ALTER TABLE "Icone" ADD CONSTRAINT "Icone_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clique" ADD CONSTRAINT "Clique_iconeId_fkey" FOREIGN KEY ("iconeId") REFERENCES "Icone"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Como as outras tabelas: RLS ligado e nenhuma policy, para a API pública do
-- Supabase (chave publicável) não ler nada. O Prisma entra como postgres, que passa por cima.
ALTER TABLE "Icone" ENABLE ROW LEVEL SECURITY;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- ALTER TABLE "Clique" DROP CONSTRAINT "Clique_iconeId_fkey";
-- DROP INDEX "Clique_iconeId_idx";
-- ALTER TABLE "Clique" DROP COLUMN "iconeId";
-- DROP TABLE "Icone";
