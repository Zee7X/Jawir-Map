import { NextRequest, NextResponse } from 'next/server';
import { isAdminEnabled, isAdminRequest } from '@/lib/admin';
import { listPinsForAdmin, REPORT_HIDE_THRESHOLD } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  if (!isAdminEnabled()) return NextResponse.json({ success: false }, { status: 404, headers: PRIVATE });
  if (!isAdminRequest(request)) return NextResponse.json({ success: false }, { status: 401, headers: PRIVATE });
  try {
    const pins = await listPinsForAdmin();
    return NextResponse.json({ success: true, threshold: REPORT_HIDE_THRESHOLD, data: pins }, { headers: PRIVATE });
  } catch (error) {
    console.error('Error listing pins for admin:', error);
    return NextResponse.json({ success: false, message: 'Gagal njupuk data.' }, { status: 500, headers: PRIVATE });
  }
}
