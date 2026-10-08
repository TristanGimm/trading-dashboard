import { NextResponse, type NextRequest } from 'next/server';
import { readAuthConfig, safeDashboardRedirect, SESSION_COOKIE, verifySession } from './lib/auth-crypto';

// Reject unauthenticated requests before a loading boundary can start streaming.
// The dashboard still verifies its session again before database access.
export function proxy(request: NextRequest) {
  if (verifySession(request.cookies.get(SESSION_COOKIE)?.value, readAuthConfig())) return NextResponse.next();
  const destination = new URL('/login', request.url);
  destination.searchParams.set('next', safeDashboardRedirect(request.nextUrl.pathname + request.nextUrl.search));
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/dashboard/:path*'] };
