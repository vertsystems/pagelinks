/** Transforma texto em slug de URL: "Padaria do Zé" → "padaria-do-ze". */
export function gerarSlug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
