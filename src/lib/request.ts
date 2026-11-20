import { randomBytes } from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { hashString } from './hash';

// On Vercel both headers are written by the platform, so a client cannot spoof them.
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';
}

// Owner token: 32 random bytes in an httpOnly cookie. The database stores only its hash.
const OWNER_COOKIE = 'jawir_owner';
const OWNER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
// Chrome caps cookie lifetime at 400 days; GET /api/tags/me renews it on every visit.
const OWNER_MAX_AGE = 400 * 24 * 60 * 60;

export function newOwnerToken(): string {
  return randomBytes(32).toString('base64url');
}

export function readOwnerToken(request: NextRequest): string | null {
  const token = request.cookies.get(OWNER_COOKIE)?.value;
  return token && OWNER_TOKEN_PATTERN.test(token) ? token : null;
}

export function readOwnerHash(request: NextRequest): string | null {
  const token = readOwnerToken(request);
  return token ? hashString(token) : null;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function setOwnerCookie(response: NextResponse, token: string) {
  response.cookies.set(OWNER_COOKIE, token, { ...cookieOptions, maxAge: OWNER_MAX_AGE });
}

export function clearOwnerCookie(response: NextResponse) {
  response.cookies.set(OWNER_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}

export function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
