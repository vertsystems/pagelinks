-- Bloco "carrossel": várias imagens que vão passando, cada uma com link opcional,
-- o tempo em cada imagem e a largura de cada uma (por tela, como os outros ajustes).

-- AlterTable
ALTER TABLE "Card" ADD COLUMN "carrosselTempo" INTEGER;
ALTER TABLE "Card" ADD COLUMN "slideLargura" INTEGER;

-- CreateTable
CREATE TABLE "ImagemCarrossel" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "url" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImagemCarrossel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImagemCarrossel_cardId_ordem_idx" ON "ImagemCarrossel"("cardId", "ordem");

-- AddForeignKey
ALTER TABLE "ImagemCarrossel" ADD CONSTRAINT "ImagemCarrossel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Como as outras tabelas: RLS ligado e nenhuma policy, para a API pública do
-- Supabase (chave publicável) não ler nada. O Prisma entra como postgres, que passa por cima.
ALTER TABLE "ImagemCarrossel" ENABLE ROW LEVEL SECURITY;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- DROP TABLE "ImagemCarrossel";
-- ALTER TABLE "Card" DROP COLUMN "slideLargura";
-- ALTER TABLE "Card" DROP COLUMN "carrosselTempo";
