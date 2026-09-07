import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // A CLI (migrate, studio) usa o pooler em modo sessão: migração precisa de
    // conexão que não seja derrubada entre uma instrução e outra.
    // O runtime usa DATABASE_URL (modo transação) — ver lib/prisma.ts.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
