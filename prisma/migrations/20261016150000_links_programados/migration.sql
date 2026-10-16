-- Links programados: num período, o bloco (link, destaque, imagem, vídeo) leva para outro
-- endereço no lugar do principal. Até 10 por bloco.

-- CreateTable
CREATE TABLE "LinkProgramado" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkProgramado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkProgramado_cardId_inicio_idx" ON "LinkProgramado"("cardId", "inicio");

-- AddForeignKey
ALTER TABLE "LinkProgramado" ADD CONSTRAINT "LinkProgramado_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Como as outras tabelas: RLS ligado e nenhuma policy, para a API pública do
-- Supabase (chave publicável) não ler nada. O Prisma entra como postgres, que passa por cima.
ALTER TABLE "LinkProgramado" ENABLE ROW LEVEL SECURITY;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- DROP TABLE "LinkProgramado";
