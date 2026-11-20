import { NextRequest, NextResponse } from 'next/server';
import { hashString } from '@/lib/hash';
import { getClientIp } from '@/lib/request';
import {
  isAdminEnabled,
  isAdminRequest,
  checkPassword,
  setAdminCookie,
  clearAdminCookie,
  loginBlocked,
  recordFailedLogin,
} from '@/lib/admin';

export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const disabled = () => NextResponse.json({ success: false, message: 'Admin durung diaktifke.' }, { status: 404, headers: PRIVATE });

// Whether this browser has an admin session.
export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) return disabled();
  return NextResponse.json({ success: true, admin: isAdminRequest(request) }, { headers: PRIVATE });
}

export async function POST(request: NextRequest) {
  if (!isAdminEnabled()) return disabled();
  const ipHash = hashString(getClientIp(request));
  if (loginBlocked(ipHash)) {
    return NextResponse.json({ success: false, message: 'Kakehan nyoba. Enteni 15 menit.' }, { status: 429, headers: PRIVATE });
  }
  const body = await request.json().catch(() => ({}));
  if (!checkPassword(body?.password)) {
    recordFailedLogin(ipHash);
    return NextResponse.json({ success: false, message: 'Sandine salah.' }, { status: 401, headers: PRIVATE });
  }
  const response = NextResponse.json({ success: true }, { headers: PRIVATE });
  setAdminCookie(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, { headers: PRIVATE });
  clearAdminCookie(response);
  return response;
}
