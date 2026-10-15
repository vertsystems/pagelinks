import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Endereço com barra no fim (dnms.fun/cliente/), como era no WordPress. O WordPress
  // mandava /cliente para /cliente/ com redirecionamento permanente, que o navegador
  // guarda; se o Next fizesse o contrário, quem já tinha visitado ficava num loop.
  trailingSlash: true,
  experimental: {
    serverActions: {
      // O envio de imagem do painel vai pela ação de servidor, que aceita 1 MB por
      // padrão. 4 MB é o teto de lib/imagens.ts; a Vercel corta em 4,5 MB.
      bodySizeLimit: "4.2mb",
    },
  },
};

export default nextConfig;
