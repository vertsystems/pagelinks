import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Página de demonstração: existe para exercitar todos os tipos de card e servir
  // de referência visual. Não é cliente real.
  await prisma.cliente.deleteMany({ where: { slug: "demo" } });

  const cliente = await prisma.cliente.create({
    data: {
      nome: "Demonstração PageLinks",
      slug: "demo",
      observacao: "Página de exemplo do sistema. Apagar quando os clientes reais entrarem.",
      paginas: {
        create: {
          titulo: "Demonstração PageLinks",
          bio: "Todos os tipos de bloco que o sistema sabe montar.",
          publicada: true,
          corFundo: "#12100E",
          corTexto: "#F5F1EC",
          corDestaque: "#E5A94F",
          corTextoBotao: "#12100E",
          fonte: "Inter",
          estiloBotao: "arredondado",
          seoTitulo: "Demonstração PageLinks",
          seoDescricao: "Exemplo de página de links feita no PageLinks.",
          cards: {
            create: [
              { tipo: "destaque", titulo: "Fale com a gente agora", subtitulo: "Resposta no mesmo dia", url: "https://example.com", ordem: 1, destaque: true },
              { tipo: "link", titulo: "Nosso site", url: "https://example.com", ordem: 2 },
              { tipo: "link", titulo: "Catálogo de produtos", subtitulo: "Atualizado esta semana", url: "https://example.com", ordem: 3 },
              { tipo: "whatsapp", titulo: "Pedir orçamento", telefone: "5513997287738", mensagem: "Oi! Vim pela página de links e quero um orçamento.", ordem: 4 },
              { tipo: "titulo", titulo: "Onde nos encontrar", ordem: 5 },
              { tipo: "texto", titulo: "Segunda a sexta, das 9h às 18h. Sábado até as 13h.", ordem: 6 },
              { tipo: "redes", titulo: "Redes sociais", url: "https://instagram.com/digitaldunamis", ordem: 7 },
              { tipo: "separador", ordem: 8 },
              { tipo: "link", titulo: "Trabalhe conosco", url: "https://example.com", ordem: 9 },
            ],
          },
        },
      },
    },
    include: { paginas: { include: { cards: true } } },
  });

  console.log(`✓ cliente "${cliente.nome}" criado em /${cliente.slug}`);
  console.log(`  ${cliente.paginas[0].cards.length} cards`);

  const admin = await prisma.usuario.upsert({
    where: { email: "dunamiscompany.adm@gmail.com" },
    update: {},
    create: { email: "dunamiscompany.adm@gmail.com", nome: "Dunamis", papel: "admin" },
  });
  console.log(`✓ usuário admin: ${admin.email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
