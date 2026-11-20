-- Foto e aparência programadas (20/11/2026): num período, a página mostra outra foto do topo
-- ou outra aparência (cores, fonte, botões e fundo), e volta sozinha às de sempre no fim.
-- Até 10 de cada por página, sem sobrepor períodos (lib/programacoes.ts).

-- CreateTable
CREATE TABLE "FotoProgramada" (
    "id" TEXT NOT NULL,
    "paginaId" TEXT NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "largura" INTEGER,
    "altura" INTEGER,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AparenciaProgramada" (
    "id" TEXT NOT NULL,
    "paginaId" TEXT NOT NULL,
    "corFundo" TEXT NOT NULL,
    "corTexto" TEXT NOT NULL,
    "corDestaque" TEXT NOT NULL,
    "corTextoBotao" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "estiloBotao" TEXT NOT NULL,
    "fundoTipo" TEXT NOT NULL,
    "fundoCorFim" TEXT,
    "fundoImagemUrl" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AparenciaProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FotoProgramada_paginaId_inicio_idx" ON "FotoProgramada"("paginaId", "inicio");

-- CreateIndex
CREATE INDEX "AparenciaProgramada_paginaId_inicio_idx" ON "AparenciaProgramada"("paginaId", "inicio");

-- AddForeignKey
ALTER TABLE "FotoProgramada" ADD CONSTRAINT "FotoProgramada_paginaId_fkey" FOREIGN KEY ("paginaId") REFERENCES "Pagina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AparenciaProgramada" ADD CONSTRAINT "AparenciaProgramada_paginaId_fkey" FOREIGN KEY ("paginaId") REFERENCES "Pagina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Como as outras tabelas: RLS ligado e nenhuma policy, para a API pública do
-- Supabase (chave publicável) não ler nada. O Prisma entra como postgres, que passa por cima.
ALTER TABLE "FotoProgramada" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AparenciaProgramada" ENABLE ROW LEVEL SECURITY;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- DROP TABLE "FotoProgramada";
-- DROP TABLE "AparenciaProgramada";
