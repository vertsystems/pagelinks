import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derivar = promisify(scrypt) as (senha: string, sal: Buffer, tamanho: number) => Promise<Buffer>;

/** Hash guardado em Usuario.senhaHash, no formato "scrypt:<sal>:<hash>" (hex). A senha nunca é guardada. */
export async function gerarHashSenha(senha: string) {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal, 64);
  return `scrypt:${sal.toString("hex")}:${hash.toString("hex")}`;
}

export async function conferirSenha(senha: string, guardado: string) {
  const [algoritmo, salHex, hashHex] = guardado.split(":");
  if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;

  const esperado = Buffer.from(hashHex, "hex");
  const hash = await derivar(senha, Buffer.from(salHex, "hex"), esperado.length);
  return timingSafeEqual(hash, esperado);
}
