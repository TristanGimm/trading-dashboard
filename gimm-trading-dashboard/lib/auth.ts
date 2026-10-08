import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readAuthConfig, safeDashboardRedirect, SESSION_COOKIE, verifySession } from './auth-crypto';

export { SESSION_COOKIE };
export async function isAuthenticated(): Promise<boolean> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value, readAuthConfig());
}

export async function requireSession(returnTo = '/dashboard'): Promise<void> {
  if (!await isAuthenticated()) redirect(`/login?next=${encodeURIComponent(safeDashboardRedirect(returnTo))}`);
}
