import type { Rede } from "@/lib/redes";

/** Ícone de rede em SVG. Serve à página pública e ao painel: não tem estado nem efeito. */
export default function DesenhoRede({ rede, tamanho = 18 }: { rede: Rede; tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      fill={rede.traco ? "none" : "currentColor"}
      stroke={rede.traco ? "currentColor" : "none"}
      strokeWidth={rede.traco ? 2 : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={rede.path} />
    </svg>
  );
}
