import { NextRequest, NextResponse } from 'next/server';
import { findTagByOwner, deleteTagByOwner } from '@/lib/tagStore';
import { hashString } from '@/lib/hash';
import { readOwnerToken, setOwnerCookie, clearOwnerCookie } from '@/lib/request';

export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

// The pin owned by this browser's owner cookie, or null.
export async function GET(request: NextRequest) {
  try {
    const token = readOwnerToken(request);
    const tag = token ? await findTagByOwner(hashString(token)) : null;
    const response = NextResponse.json({ success: true, data: tag }, { headers: PRIVATE });
    // Renew the cookie on each visit so a regular never hits the 400-day expiry.
    if (tag && token) setOwnerCookie(response, token);
    return response;
  } catch (error) {
    console.error('Error reading own tag:', error);
    return NextResponse.json({ success: false, message: 'Pinmu gagal digoleki.' }, { status: 500, headers: PRIVATE });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = readOwnerToken(request);
    const removed = token ? await deleteTagByOwner(hashString(token)) : false;
    if (!removed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kunci pin iki ora ketemu neng browser iki, dadi ora iso dibusak saka kene.',
        },
        { status: 404, headers: PRIVATE }
      );
    }
    const response = NextResponse.json({ success: true }, { headers: PRIVATE });
    clearOwnerCookie(response);
    return response;
  } catch (error) {
    console.error('Error deleting own tag:', error);
    return NextResponse.json(
      { success: false, message: 'Pine gagal dibusak. Jajal maneh, lur.' },
      { status: 500, headers: PRIVATE }
    );
  }
}
