import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O envio de imagem do painel vai pela ação de servidor, que aceita 1 MB por
      // padrão. 4 MB é o teto de lib/imagens.ts; a Vercel corta em 4,5 MB.
      bodySizeLimit: "4.2mb",
    },
  },
};

export default nextConfig;
