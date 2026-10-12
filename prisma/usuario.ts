/**
 * Cria ou atualiza um usuário admin do painel.
 *
 *   SENHA='...' npm run db:usuario -- email@dominio.com "Nome"
 *
 * A senha entra por variável de ambiente, nunca como argumento nem em arquivo,
 * e no banco só fica o hash. Rodar de novo com o mesmo e-mail troca a senha.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { gerarHashSenha } from "../lib/senha";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  const nome = process.argv[3]?.trim() || null;
  const senha = process.env.SENHA ?? "";

  if (!email.includes("@")) throw new Error("Informe o e-mail: npm run db:usuario -- email@dominio.com");
  if (senha.length < 8) throw new Error("Defina SENHA com pelo menos 8 caracteres.");

  const senhaHash = await gerarHashSenha(senha);
  const usuario = await prisma.usuario.upsert({
    where: { email },
    create: { email, nome, senhaHash, papel: "admin" },
    update: { senhaHash, ativo: true, ...(nome ? { nome } : {}) },
  });

  console.log(`ok · ${usuario.email} · ${usuario.papel} · ${usuario.ativo ? "ativo" : "inativo"}`);
}

main()
  .catch((erro) => {
    console.error(erro.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
