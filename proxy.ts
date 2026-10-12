import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerToken } from "@/lib/sessao";

/**
 * Primeira barreira do painel: sem sessão válida, /gestao manda para o login.
 * É uma checagem otimista, só do cookie. A garantia está em exigirAdmin(), que
 * cada página e cada ação do painel chama por conta própria.
 */
export function proxy(request: NextRequest) {
  if (lerToken(request.cookies.get(COOKIE_SESSAO)?.value)) return NextResponse.next();

  const login = new URL("/entrar", request.url);
  login.searchParams.set("de", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: "/gestao/:path*",
};
