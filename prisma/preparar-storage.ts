/**
 * Cria (ou acerta) o bucket "imagens" no Supabase Storage. Rodar uma vez:
 *
 *   npm run storage:preparar
 *
 * Leitura pública (a página do cliente mostra as imagens sem login), só WebP,
 * até 5 MB por arquivo. Escrita só com a chave secreta, que fica no servidor.
 */
import "dotenv/config";

const BUCKET = "imagens";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
const config = { public: true, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ["image/webp"] };

async function main() {
  if (!url || !chave) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY no .env.");
  const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };

  const existe = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers: cabecalhos });
  const resposta = existe.ok
    ? await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { method: "PUT", headers: cabecalhos, body: JSON.stringify(config) })
    : await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers: cabecalhos, body: JSON.stringify({ id: BUCKET, name: BUCKET, ...config }) });

  if (!resposta.ok) throw new Error(`Storage respondeu ${resposta.status}: ${await resposta.text()}`);
  console.log(`ok · bucket "${BUCKET}" ${existe.ok ? "atualizado" : "criado"} · público · só WebP · até 5 MB`);
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
