import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PageLinks",
  description: "Páginas de links, feitas e atualizadas em segundos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
