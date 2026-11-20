import { createHash, timingSafeEqual } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

// Admin access is one shared password from the ADMIN_PASSWORD env var. Without it the admin area is off (404).
const ADMIN_COOKIE = 'jawir_admin';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const MIN_PASSWORD_LENGTH = 12;

function password(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= MIN_PASSWORD_LENGTH ? p : null;
}

export function isAdminEnabled(): boolean {
  return password() !== null;
}

const sha = (value: string) => createHash('sha256').update(value).digest();

// Session cookie value: derived from the password and salt, so changing ADMIN_PASSWORD logs every session out.
function sessionToken(): string | null {
  const p = password();
  return p ? sha(`jawir-admin-session:${p}:${process.env.HASH_SALT ?? ''}`).toString('hex') : null;
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkPassword(given: unknown): boolean {
  const p = password();
  if (!p || typeof given !== 'string') return false;
  return safeEqual(sha(given), sha(p));
}

export function isAdminRequest(request: NextRequest): boolean {
  const expected = sessionToken();
  const given = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!expected || !given) return false;
  return safeEqual(Buffer.from(given), Buffer.from(expected));
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // Strict: admin actions never ride along on a request started from another site.
  sameSite: 'strict' as const,
  path: '/',
};

export function setAdminCookie(response: NextResponse) {
  const token = sessionToken();
  if (token) response.cookies.set(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE });
}

export function clearAdminCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}

// Login attempts per IP hash, per server instance. Slows guessing; the long password does the real work.
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export function loginBlocked(ipHash: string): boolean {
  const a = attempts.get(ipHash);
  return !!a && a.count >= MAX_ATTEMPTS && Date.now() < a.until;
}

export function recordFailedLogin(ipHash: string) {
  const a = attempts.get(ipHash);
  const now = Date.now();
  if (!a || now >= a.until) attempts.set(ipHash, { count: 1, until: now + WINDOW_MS });
  else a.count++;
}
