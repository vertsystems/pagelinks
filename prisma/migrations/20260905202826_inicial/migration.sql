-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dominio" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagina" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "corFundo" TEXT NOT NULL DEFAULT '#101010',
    "corTexto" TEXT NOT NULL DEFAULT '#F2F2F2',
    "corDestaque" TEXT NOT NULL DEFAULT '#FF6F00',
    "corTextoBotao" TEXT NOT NULL DEFAULT '#101010',
    "fonte" TEXT NOT NULL DEFAULT 'Inter',
    "estiloBotao" TEXT NOT NULL DEFAULT 'arredondado',
    "fundoTipo" TEXT NOT NULL DEFAULT 'solido',
    "fundoImagemUrl" TEXT,
    "fundoCorFim" TEXT,
    "seoTitulo" TEXT,
    "seoDescricao" TEXT,
    "seoImagemUrl" TEXT,
    "faviconUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pagina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "paginaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT,
    "subtitulo" TEXT,
    "url" TEXT,
    "imagemUrl" TEXT,
    "icone" TEXT,
    "telefone" TEXT,
    "mensagem" TEXT,
    "corFundo" TEXT,
    "corTexto" TEXT,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "publicarEm" TIMESTAMP(3),
    "despublicarEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clique" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" TEXT,

    CONSTRAINT "Clique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT,
    "senhaHash" TEXT,
    "papel" TEXT NOT NULL DEFAULT 'admin',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "clienteId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcessoEm" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_slug_key" ON "Cliente"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_dominio_key" ON "Cliente"("dominio");

-- CreateIndex
CREATE INDEX "Cliente_ativo_idx" ON "Cliente"("ativo");

-- CreateIndex
CREATE INDEX "Pagina_clienteId_idx" ON "Pagina"("clienteId");

-- CreateIndex
CREATE INDEX "Pagina_publicada_idx" ON "Pagina"("publicada");

-- CreateIndex
CREATE INDEX "Card_paginaId_ordem_idx" ON "Card"("paginaId", "ordem");

-- CreateIndex
CREATE INDEX "Card_ativo_idx" ON "Card"("ativo");

-- CreateIndex
CREATE INDEX "Clique_cardId_data_idx" ON "Clique"("cardId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_papel_idx" ON "Usuario"("papel");

-- AddForeignKey
ALTER TABLE "Pagina" ADD CONSTRAINT "Pagina_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_paginaId_fkey" FOREIGN KEY ("paginaId") REFERENCES "Pagina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clique" ADD CONSTRAINT "Clique_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
