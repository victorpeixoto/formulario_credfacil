import { NextRequest, NextResponse } from 'next/server';
import { verificarJWT } from '@/lib/auth';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('cf_token')?.value;
  const payload = token ? verificarJWT(token) : null;

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
