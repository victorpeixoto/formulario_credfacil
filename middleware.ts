import { NextRequest, NextResponse } from 'next/server';

// Verifica JWT manualmente no Edge Runtime (sem importar lib/auth.ts que usa crypto/bcrypt)
function verificarJWTEdge(token: string): { cpf: string; formCode: string } | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.cpf || !payload.formCode) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { cpf: payload.cpf, formCode: payload.formCode };
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get('cf_token')?.value;
  const payload = token ? verificarJWTEdge(token) : null;

  if (!payload) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('x-user-cpf', payload.cpf);
  response.headers.set('x-user-formcode', payload.formCode);
  return response;
}

export const config = {
  matcher: ['/(auth)/:path*'],
};
