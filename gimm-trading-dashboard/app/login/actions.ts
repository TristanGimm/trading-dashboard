'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSession, readAuthConfig, safeDashboardRedirect, SESSION_SECONDS, verifyCredentials } from '@/lib/auth-crypto';
import { SESSION_COOKIE } from '@/lib/auth';
import { loginLimiter } from '@/lib/login-limit';

export async function login(formData: FormData): Promise<void> {
  const next = safeDashboardRedirect(formData.get('next'));
  const failed = (reason: string): never => redirect(`/login?error=${reason}&next=${encodeURIComponent(next)}`);
  const config = readAuthConfig();
  if (!config) return failed('unconfigured');
  if (!loginLimiter.consume()) return failed('limited');
  const username = formData.get('username');
  const password = formData.get('password');
  if (typeof username !== 'string' || typeof password !== 'string') return failed('invalid');
  let valid = false;
  try { valid = await verifyCredentials(username, password, config); }
  catch { failed('unavailable'); }
  if (!valid) failed('invalid');
  (await cookies()).set(SESSION_COOKIE, createSession(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
  redirect(next);
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
