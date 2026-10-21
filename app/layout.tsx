import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageLinks",
  description: "Páginas de links, feitas e atualizadas em segundos.",
  // O ícone da aba do PageLinks (21/10/2026), no painel e nas páginas de cliente. Fica aqui, e não
  // em app/icon.svg: ícone por arquivo vence o da página, e a página com ícone próprio
  // (Pagina.faviconUrl, em app/[slug]/page.tsx) precisa trocar este pelo dela
  icons: {
    icon: [
      { url: "/icone.svg", type: "image/svg+xml" },
      { url: "/icone-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
