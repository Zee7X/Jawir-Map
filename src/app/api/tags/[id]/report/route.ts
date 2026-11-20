import { NextRequest, NextResponse } from 'next/server';
import { hashString } from '@/lib/hash';
import { getClientIp, readOwnerHash, readOrCreateVoterToken, setVoterCookie } from '@/lib/request';
import { reportPin, REPORT_REASONS, type ReportReason } from '@/lib/moderation';

export const dynamic = 'force-dynamic';

const MESSAGES = {
  reported: 'Matur nuwun, laporanmu wis ditampa.',
  hidden: 'Matur nuwun. Pin iki wis didhelikake nganti dipriksa admin.',
  already: 'Kowe wis tau nglaporke pin iki, lur.',
  limited: 'Kakehan laporan saka jaringanmu. Jajal maneh mengko.',
  not_found: 'Pin iki ora ono, lur.',
  own: 'Iki pinmu dhewe. Yen ana sing salah, busak wae saka Paspor Jawirku.',
} as const;

const STATUS = { reported: 200, hidden: 200, already: 409, limited: 429, not_found: 404, own: 403 } as const;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason as ReportReason;
    if (!REPORT_REASONS.includes(reason)) {
      return NextResponse.json({ success: false, message: 'Alesane ora ono neng daftar.' }, { status: 400 });
    }
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
      return NextResponse.json({ success: false, result: 'not_found', message: MESSAGES.not_found }, { status: 404 });
    }

    // One report per browser per pin, keyed by the same voter cookie as coffee votes.
    const voter = readOrCreateVoterToken(request);
    const result = await reportPin({
      tagId: params.id,
      reporterHash: hashString(`reporter:${voter.token}`),
      ipHash: hashString(getClientIp(request)),
      ownerHash: readOwnerHash(request),
      reason,
    });

    const ok = result === 'reported' || result === 'hidden';
    const response = NextResponse.json(
      { success: ok, result, hidden: result === 'hidden', message: MESSAGES[result] },
      { status: STATUS[result] }
    );
    if (voter.isNew) setVoterCookie(response, voter.token);
    return response;
  } catch (error) {
    console.error('Error reporting pin:', error);
    return NextResponse.json({ success: false, message: 'Laporane gagal dikirim. Jajal maneh.' }, { status: 500 });
  }
}
