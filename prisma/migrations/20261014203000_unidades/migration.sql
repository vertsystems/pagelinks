-- Bloco "unidades": cartões com foto horizontal, nome e endereço, cada um com o seu link
-- (para quem tem vários endereços), e quantos cartões por linha (por tela).

-- AlterTable
ALTER TABLE "Card" ADD COLUMN "colunas" INTEGER;

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "url" TEXT,
    "imagemUrl" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Unidade_cardId_ordem_idx" ON "Unidade"("cardId", "ordem");

-- AddForeignKey
ALTER TABLE "Unidade" ADD CONSTRAINT "Unidade_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Como as outras tabelas: RLS ligado e nenhuma policy, para a API pública do
-- Supabase (chave publicável) não ler nada. O Prisma entra como postgres, que passa por cima.
ALTER TABLE "Unidade" ENABLE ROW LEVEL SECURITY;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- DROP TABLE "Unidade";
-- ALTER TABLE "Card" DROP COLUMN "colunas";
