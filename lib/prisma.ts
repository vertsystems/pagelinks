import { attachDatabasePool } from "@vercel/functions";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client";

// Uma instância só entre recarregamentos do dev server — sem isso o Next abre
// uma conexão nova a cada hot reload até o banco reclamar.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Poucas conexões por instância, e devolvidas logo.
 *
 * O pooler do Supabase aceita no máximo 200 conexões ao mesmo tempo, somando todas as
 * instâncias da Vercel. No padrão do pg, cada instância abria até 10 e as deixava
 * paradas enquanto dormia. Em 15/10/2026, 59 acessos ao mesmo tempo esgotaram o
 * limite (EMAXCONN) e todas as páginas deram 500 por vários minutos.
 *
 * - max 5: teto de conexões por instância
 * - idleTimeoutMillis 5 s: conexão parada fecha logo
 * - connectionTimeoutMillis 10 s: sem conexão livre, falha em vez de esperar para sempre
 * - attachDatabasePool: a Vercel espera as conexões paradas fecharem antes de suspender
 *   a instância (fora da Vercel, não faz nada)
 */
function criarCliente() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 10_000,
  });
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
