import { NextRequest, NextResponse } from 'next/server';
import { isAdminEnabled, isAdminRequest } from '@/lib/admin';
import { applyAdminAction, type AdminAction } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'private, no-store' };
const ACTIONS: AdminAction[] = ['hide', 'unhide', 'delete'];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminEnabled()) return NextResponse.json({ success: false }, { status: 404, headers: PRIVATE });
  if (!isAdminRequest(request)) return NextResponse.json({ success: false }, { status: 401, headers: PRIVATE });
  const body = await request.json().catch(() => ({}));
  const action = body?.action as AdminAction;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ success: false, message: 'Aksi ora dikenal.' }, { status: 400, headers: PRIVATE });
  }
  try {
    const found = await applyAdminAction(params.id, action);
    if (!found) return NextResponse.json({ success: false, message: 'Pin ora ono.' }, { status: 404, headers: PRIVATE });
    return NextResponse.json({ success: true }, { headers: PRIVATE });
  } catch (error) {
    console.error('Error applying admin action:', error);
    return NextResponse.json({ success: false, message: 'Aksine gagal.' }, { status: 500, headers: PRIVATE });
  }
}
