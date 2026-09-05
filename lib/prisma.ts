import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Uma instância só entre recarregamentos do dev server — sem isso o Next abre
// uma conexão nova a cada hot reload até o banco reclamar.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarCliente() {
  const connectionString = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
