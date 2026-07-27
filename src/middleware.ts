import { NextRequest, NextResponse } from 'next/server';

/**
 * UX-only redirects based on the gxp_auth cookie FLAG. Authorization is
 * always enforced server-side by the backend guards.
 */
export function middleware(request: NextRequest) {
  const isAuthed = Boolean(request.cookies.get('gxp_auth')?.value);
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  if (!isAuthed && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isAuthed && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
