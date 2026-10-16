-- Redirecionamentos: endereço antigo do dnms.fun que leva para outro do mesmo domínio,
-- criado no painel. Só vale onde não há página no ar.

-- CreateTable
CREATE TABLE "Redirecionamento" (
    "id" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "acessos" INTEGER NOT NULL DEFAULT 0,
    "ultimoAcessoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redirecionamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Redirecionamento_de_key" ON "Redirecionamento"("de");

-- Como as outras tabelas: RLS ligado e nenhuma policy, para a API pública do
-- Supabase (chave publicável) não ler nada. O Prisma entra como postgres, que passa por cima.
ALTER TABLE "Redirecionamento" ENABLE ROW LEVEL SECURITY;

-- Down: desfazer à mão, o Prisma não roda esta parte
-- DROP TABLE "Redirecionamento";
