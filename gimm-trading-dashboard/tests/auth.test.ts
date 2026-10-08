import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, hashPassword, readAuthConfig, safeDashboardRedirect, SESSION_SECONDS, verifyCredentials, verifySession } from '../lib/auth-crypto.ts';
import { createLoginLimiter } from '../lib/login-limit.ts';

const password = 'only-a-local-test-password';
const config = { username: 'local-test-user', passwordHash: await hashPassword(password), secret: 'local-test-secret-with-more-than-32-characters' };

test('authentication is disabled without complete valid configuration', () => {
  assert.equal(readAuthConfig({}), null);
  assert.equal(readAuthConfig({ AUTH_USERNAME: config.username, AUTH_PASSWORD_HASH: password, AUTH_SECRET: config.secret }), null);
  assert.equal(readAuthConfig({ AUTH_USERNAME: config.username, AUTH_PASSWORD_HASH: config.passwordHash, AUTH_SECRET: 'short' }), null);
  assert.deepEqual(readAuthConfig({ AUTH_USERNAME: config.username, AUTH_PASSWORD_HASH: config.passwordHash, AUTH_SECRET: config.secret }), config);
  assert.equal(verifySession('anything', null), false);
});

test('scrypt verifies a correct password and rejects incorrect credentials', async () => {
  assert.equal(await verifyCredentials(config.username, password, config), true);
  assert.equal(await verifyCredentials(config.username, 'incorrect-password', config), false);
  assert.equal(await verifyCredentials('other-user', password, config), false);
  assert.equal(await verifyCredentials(config.username, 'x'.repeat(1025), config), false);
  assert.equal(await verifyCredentials(config.username, password, { ...config, passwordHash: 'invalid' }), false);
  await assert.rejects(hashPassword('short'));
});

test('sessions reject tampering, expiration, malformed cookies and rotated credentials', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const token = createSession(config, now);
  assert.equal(verifySession(token, config, now), true);
  assert.equal(verifySession(token, config, now + SESSION_SECONDS * 1000 - 1), true);
  assert.equal(verifySession(token, config, now + SESSION_SECONDS * 1000), false);
  const [payload, signature] = token.split('.');
  assert.equal(verifySession(`${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`, config, now), false);
  assert.equal(verifySession(`${Buffer.from('{"expires":9999999999}').toString('base64url')}.${signature}`, config, now), false);
  for (const bad of [undefined, '', 'a.b.c', 'a.', 'x'.repeat(513)]) assert.equal(verifySession(bad, config, now), false);
  assert.equal(verifySession(token, { ...config, secret: 'another-local-test-secret-with-32-characters' }, now), false);
  assert.equal(verifySession(token, { ...config, username: 'changed' }, now), false);
  assert.equal(verifySession(token, { ...config, passwordHash: config.passwordHash + 'changed' }, now), false);
  assert.notEqual(token, createSession(config, now));
});

test('redirects preserve dashboard filters and reject external or unexpected destinations', () => {
  assert.equal(safeDashboardRedirect('/dashboard?period=30d&account=Backtest'), '/dashboard?period=30d&account=Backtest');
  for (const bad of ['https://evil.example', '//evil.example', '/dashboard/../login', '/dashboard/other', '/dashboard\\evil', '/dashboard\n', '/login', '/dashboard-evil', null, ['wrong']]) assert.equal(safeDashboardRedirect(bad), '/dashboard');
});

test('login attempts are bounded and become available after the window', () => {
  const limiter = createLoginLimiter(2, 1000);
  assert.equal(limiter.consume(2000), true);
  assert.equal(limiter.consume(2001), true);
  assert.equal(limiter.consume(2002), false);
  assert.equal(limiter.consume(2999), false);
  assert.equal(limiter.consume(3000), true);
});
