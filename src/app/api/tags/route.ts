import { NextRequest, NextResponse } from 'next/server';
import { db, rawClient, isDbConfigured, ensureTable } from '@/db';
import { jawirTags } from '@/db/schema';
import { and, eq, count, sql } from 'drizzle-orm';
import {
  fuzzCoordinate,
  calculateDistanceFromLawu,
  detectRegionStatus,
  TagCategory,
  TrahType,
} from '@/lib/geo';
import { memoryStore, type JawirTagItem, type PublicTag } from '@/lib/memoryStore';
import { hashString } from '@/lib/hash';
import { isDuplicateOnKey } from '@/lib/dbErrors';
import { isCleanText } from '@/lib/filter';
import { listPublicTags, findTagByOwner, rowToPublic } from '@/lib/tagStore';
import { getClientIp, newOwnerToken, readOwnerHash, setOwnerCookie, envInt } from '@/lib/request';
import { randomUUID } from 'crypto';

export type { JawirTagItem };

export const dynamic = 'force-dynamic';

// Mobile carriers put many phones behind one IP (CGNAT), so this guards against scripts, not people.
const MAX_PINS_PER_IP_PER_DAY = envInt('MAX_PINS_PER_IP_PER_DAY', 10);
const MAX_NUMBER_RETRIES = 5;
const OWN_PIN_MESSAGE = 'Woi, jatahmu mung sepisan salawase urip! Ojo srakah kaya pejabat.';
const DEVICE_TAKEN_MESSAGE =
  'Piranti iki wis tau nancep pin. Siji piranti mung oleh siji pin, lur. Yen iki pinmu, bukak saka browser sing biyen.';
const ALREADY_SUBMITTED_MESSAGE = 'Pinmu wis kekirim, lur. Tutup terus bukak maneh petane.';
// Client-generated per form session. Used as the pin id, so a double submit collides on the primary key.
const SUBMISSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const IP_LIMIT_MESSAGE = `Alon-alon, lur. Siji jaringan mung oleh nancep ${MAX_PINS_PER_IP_PER_DAY} pin sedina.`;
const VALID_CATEGORIES: TagCategory[] = ['pejuang_rupiah', 'cari_kawan', 'butuh_info', 'eksis'];
const VALID_TRAHS: TrahType[] = ['mataraman', 'ngapak', 'arekan', 'pantura', 'rantau_lahir', 'simpatisan'];

// The requester already owns this pin (matched by owner cookie): hand it back so the client can show it.
function ownPinResponse(tag: PublicTag) {
  return NextResponse.json({ success: false, message: OWN_PIN_MESSAGE, existingTag: tag }, { status: 409 });
}

// Only reachable while the legacy idx_unique_device still exists (its DROP failed); its data stays private.
function deviceTakenResponse() {
  return NextResponse.json({ success: false, message: DEVICE_TAKEN_MESSAGE }, { status: 409 });
}

// The same form submission already created a pin (double tap, retry). The earlier response carried its cookie.
function alreadySubmittedResponse() {
  return NextResponse.json({ success: false, message: ALREADY_SUBMITTED_MESSAGE }, { status: 409 });
}

export async function GET() {
  try {
    const tags = await listPublicTags();
    return NextResponse.json(
      { success: true, total: tags.length, data: tags },
      // Vercel's CDN serves one copy for 15 s and a stale one while refreshing, so a traffic spike costs one query.
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { success: false, message: 'Data pin gagal dijupuk, server lagi ngelamun.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nickname, statusTag, category, trah, lat, lng, fingerprintId, submissionId } = body;

    if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 2 || nickname.trim().length > 40) {
      return NextResponse.json(
        { success: false, message: 'Jenengmu kependeken utawa kedawan. 2 nganti 40 aksara wae, lur.' },
        { status: 400 }
      );
    }

    if (!statusTag || typeof statusTag !== 'string' || statusTag.trim().length < 3 || statusTag.trim().length > 120) {
      return NextResponse.json(
        { success: false, message: 'Semboyane 3 nganti 120 aksara. Ojo kaya nulis skripsi.' },
        { status: 400 }
      );
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, message: 'Golongane ora ono neng daftar, lur.' },
        { status: 400 }
      );
    }

    const selectedTrah: TrahType = trah && VALID_TRAHS.includes(trah) ? trah : 'mataraman';

    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
      return NextResponse.json(
        { success: false, message: 'Koordinate aneh, kowe neng planet ngendi?' },
        { status: 400 }
      );
    }

    if (!fingerprintId || typeof fingerprintId !== 'string' || fingerprintId.length > 128) {
      return NextResponse.json(
        { success: false, message: 'Pirantimu durung dicap. Refresh terus jajal maneh.' },
        { status: 400 }
      );
    }

    const cleanNickCheck = isCleanText(nickname);
    if (!cleanNickCheck.clean) {
      return NextResponse.json(
        { success: false, message: `Jeneng: ${cleanNickCheck.reason}` },
        { status: 400 }
      );
    }

    const cleanStatusCheck = isCleanText(statusTag);
    if (!cleanStatusCheck.clean) {
      return NextResponse.json(
        { success: false, message: `Semboyan: ${cleanStatusCheck.reason}` },
        { status: 400 }
      );
    }

    const deviceHash = hashString(fingerprintId.trim());
    const ipHash = hashString(getClientIp(request));

    // The owner cookie is the reliable identity: it survives browser updates that change the fingerprint.
    const currentOwnerHash = readOwnerHash(request);
    if (currentOwnerHash) {
      const mine = await findTagByOwner(currentOwnerHash);
      if (mine) return ownPinResponse(mine);
    }

    // Fingerprints collide (same phone model), so they no longer gate pin creation; the owner cookie and IP cap do.
    if (isDbConfigured && db) {
      await ensureTable();

      const [recent] = await db
        .select({ val: count() })
        .from(jawirTags)
        .where(and(eq(jawirTags.ipHash, ipHash), sql`${jawirTags.createdAt} >= NOW() - INTERVAL 1 DAY`));
      if (Number(recent?.val || 0) >= MAX_PINS_PER_IP_PER_DAY) {
        return NextResponse.json({ success: false, message: IP_LIMIT_MESSAGE }, { status: 429 });
      }
    } else {
      const since = Date.now() - 24 * 60 * 60 * 1000;
      const recent = memoryStore.filter(
        (item) => item.ipHash === ipHash && new Date(item.createdAt).getTime() >= since
      ).length;
      if (recent >= MAX_PINS_PER_IP_PER_DAY) {
        return NextResponse.json({ success: false, message: IP_LIMIT_MESSAGE }, { status: 429 });
      }
    }

    const fuzzedLat = fuzzCoordinate(numLat);
    const fuzzedLng = fuzzCoordinate(numLng);
    const distanceKm = calculateDistanceFromLawu(fuzzedLat, fuzzedLng);
    const regionStatus = detectRegionStatus(fuzzedLat, fuzzedLng);
    const normalizedSubmissionId = typeof submissionId === 'string' ? submissionId.toLowerCase() : '';
    const id = SUBMISSION_ID_PATTERN.test(normalizedSubmissionId) ? normalizedSubmissionId : randomUUID();
    const nowIso = new Date().toISOString();
    const ownerToken = newOwnerToken();
    const ownerHash = hashString(ownerToken);

    let assignedJawirNumber = 1;

    if (isDbConfigured && db) {
      // MAX+1 is computed inside the INSERT; concurrent inserts collide on idx_jawir_number and retry.
      let assigned = false;
      for (let attempt = 0; attempt < MAX_NUMBER_RETRIES && !assigned; attempt++) {
        try {
          await rawClient!.execute(
            `INSERT INTO jawir_tags
               (id, nickname, status_tag, category, trah, region_status, lat, lng, distance_km, coffee_count, device_hash, ip_hash, owner_hash, jawir_number)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, COALESCE(MAX(jawir_number), 0) + 1 FROM jawir_tags`,
            [
              id,
              nickname.trim(),
              statusTag.trim(),
              category,
              selectedTrah,
              regionStatus,
              String(fuzzedLat),
              String(fuzzedLng),
              distanceKm,
              deviceHash,
              ipHash,
              ownerHash,
            ]
          );
          assigned = true;
        } catch (err) {
          if (isDuplicateOnKey(err, 'PRIMARY')) return alreadySubmittedResponse();
          if (isDuplicateOnKey(err, 'idx_unique_device')) return deviceTakenResponse();
          if (!isDuplicateOnKey(err, 'idx_jawir_number')) throw err;
        }
      }
      if (!assigned) throw new Error('Gagal dapat nomor Jawir setelah beberapa percobaan');

      const [inserted] = await db.select().from(jawirTags).where(eq(jawirTags.id, id)).limit(1);
      assignedJawirNumber = Number(inserted?.jawirNumber);
      if (inserted) {
        const response = NextResponse.json({ success: true, data: rowToPublic(inserted) }, { status: 201 });
        setOwnerCookie(response, ownerToken);
        return response;
      }
    } else {
      if (memoryStore.some((item) => item.id === id)) return alreadySubmittedResponse();
      assignedJawirNumber = memoryStore.reduce((max, t) => Math.max(max, t.jawirNumber), 0) + 1;
      memoryStore.unshift({
        id,
        jawirNumber: assignedJawirNumber,
        nickname: nickname.trim(),
        statusTag: statusTag.trim(),
        category,
        trah: selectedTrah,
        regionStatus,
        lat: fuzzedLat,
        lng: fuzzedLng,
        distanceKm,
        coffeeCount: 0,
        createdAt: nowIso,
        deviceHash,
        ipHash,
        ownerHash,
      });
    }

    const newTagItem: PublicTag = {
      id,
      jawirNumber: assignedJawirNumber,
      nickname: nickname.trim(),
      statusTag: statusTag.trim(),
      category,
      trah: selectedTrah,
      regionStatus,
      lat: fuzzedLat,
      lng: fuzzedLng,
      distanceKm,
      coffeeCount: 0,
      createdAt: nowIso,
    };

    const response = NextResponse.json({ success: true, data: newTagItem }, { status: 201 });
    setOwnerCookie(response, ownerToken);
    return response;
  } catch (error) {
    console.error('Error inserting jawir tag:', error);
    return NextResponse.json(
      { success: false, message: 'Pine mencelat, gagal ditancepke. Jajal maneh.' },
      { status: 500 }
    );
  }
}
