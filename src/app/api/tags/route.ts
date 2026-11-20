import { NextRequest, NextResponse } from 'next/server';
import { db, rawClient, isDbConfigured, ensureTable } from '@/db';
import { jawirTags } from '@/db/schema';
import { and, eq, desc, count, sql } from 'drizzle-orm';
import {
  fuzzCoordinate,
  calculateDistanceFromLawu,
  detectRegionStatus,
  TagCategory,
  TrahType,
  RegionStatusType,
} from '@/lib/geo';
import { memoryStore, type JawirTagItem } from '@/lib/memoryStore';
import { hashString } from '@/lib/hash';
import { isDuplicateOnKey } from '@/lib/dbErrors';
import { isCleanText } from '@/lib/filter';
import { randomUUID } from 'crypto';

export type { JawirTagItem };

const MAX_PINS_PER_IP_PER_DAY = 3;
const MAX_NUMBER_RETRIES = 5;
const DEVICE_LIMIT_MESSAGE = 'Woi, jatahmu mung sepisan salawase urip! Ojo srakah kaya pejabat.';
const IP_LIMIT_MESSAGE = 'Alon-alon, lur. Siji IP mung oleh nancep 3 pin sedina.';
const VALID_CATEGORIES: TagCategory[] = ['pejuang_rupiah', 'cari_kawan', 'butuh_info', 'eksis'];
const VALID_TRAHS: TrahType[] = ['mataraman', 'ngapak', 'arekan', 'pantura', 'rantau_lahir', 'simpatisan'];

function deviceLimitResponse(item: typeof jawirTags.$inferSelect) {
  return NextResponse.json(
    {
      success: false,
      message: DEVICE_LIMIT_MESSAGE,
      existingTag: {
        id: item.id,
        jawirNumber: Number(item.jawirNumber),
        nickname: item.nickname,
        statusTag: item.statusTag,
        category: item.category,
        trah: item.trah,
        regionStatus: item.regionStatus,
        lat: Number(item.lat),
        lng: Number(item.lng),
        distanceKm: Number(item.distanceKm),
        coffeeCount: Number(item.coffeeCount || 0),
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
      },
    },
    { status: 409 }
  );
}

export async function GET() {
  try {
    let tags: JawirTagItem[] = [];

    if (isDbConfigured && db) {
      await ensureTable();
      const rows = await db
        .select()
        .from(jawirTags)
        .orderBy(desc(jawirTags.createdAt));

      tags = rows.map((r) => ({
        id: r.id,
        jawirNumber: Number(r.jawirNumber),
        nickname: r.nickname,
        statusTag: r.statusTag,
        category: r.category as TagCategory,
        trah: (r.trah as TrahType) || 'mataraman',
        regionStatus: r.regionStatus as RegionStatusType,
        lat: Number(r.lat),
        lng: Number(r.lng),
        distanceKm: Number(r.distanceKm),
        coffeeCount: Number(r.coffeeCount || 0),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));
    } else {
      tags = memoryStore.map((item) => ({ ...item }));
    }

    // Top 5 Farthest
    const sortedByDistanceDesc = [...tags].sort((a, b) => b.distanceKm - a.distanceKm);
    const topFarthest = sortedByDistanceDesc.slice(0, 5);

    // Top 5 Closest to Lawu
    const sortedByDistanceAsc = [...tags].sort((a, b) => a.distanceKm - b.distanceKm);
    const topClosest = sortedByDistanceAsc.slice(0, 5);

    // Top 5 Most Coffee / Respect
    const sortedByCoffee = [...tags].sort((a, b) => b.coffeeCount - a.coffeeCount);
    const topCoffee = sortedByCoffee.slice(0, 5);

    // Region counts
    const regionStats: Record<RegionStatusType, number> = {
      kandang: 0,
      sunda_empire: 0,
      antarpulau: 0,
      internasional: 0,
    };
    for (const t of tags) {
      if (regionStats[t.regionStatus] !== undefined) {
        regionStats[t.regionStatus]++;
      }
    }

    // Trah counts
    const trahStats: Record<string, number> = {};
    for (const t of tags) {
      trahStats[t.trah] = (trahStats[t.trah] || 0) + 1;
    }

    const farthestTag = topFarthest[0] || null;
    const closestTag = topClosest[0] || null;

    return NextResponse.json({
      success: true,
      total: tags.length,
      farthestTag,
      closestTag,
      leaderboard: {
        topFarthest,
        topClosest,
        topCoffee,
        regionStats,
        trahStats,
      },
      data: tags,
    });
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
    const { nickname, statusTag, category, trah, lat, lng, fingerprintId } = body;

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

    if (!fingerprintId || typeof fingerprintId !== 'string') {
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

    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || '127.0.0.1';
    const ipHash = hashString(clientIp);

    if (isDbConfigured && db) {
      await ensureTable();

      const existing = await db
        .select()
        .from(jawirTags)
        .where(eq(jawirTags.deviceHash, deviceHash))
        .limit(1);

      if (existing.length > 0) return deviceLimitResponse(existing[0]);

      const [recent] = await db
        .select({ val: count() })
        .from(jawirTags)
        .where(and(eq(jawirTags.ipHash, ipHash), sql`${jawirTags.createdAt} >= NOW() - INTERVAL 1 DAY`));
      if (Number(recent?.val || 0) >= MAX_PINS_PER_IP_PER_DAY) {
        return NextResponse.json({ success: false, message: IP_LIMIT_MESSAGE }, { status: 429 });
      }
    } else {
      const existing = memoryStore.find((item) => item.deviceHash === deviceHash);
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            message: 'Woi, jatahmu mung sepisan salawase urip! Ojo srakah kaya pejabat.',
            existingTag: {
              id: existing.id,
              jawirNumber: existing.jawirNumber,
              nickname: existing.nickname,
              statusTag: existing.statusTag,
              category: existing.category,
              trah: existing.trah,
              regionStatus: existing.regionStatus,
              lat: existing.lat,
              lng: existing.lng,
              distanceKm: existing.distanceKm,
              coffeeCount: existing.coffeeCount,
              createdAt: existing.createdAt,
            },
          },
          { status: 409 }
        );
      }

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
    const id = randomUUID();
    const nowIso = new Date().toISOString();

    let assignedJawirNumber = 1;

    if (isDbConfigured && db) {
      // MAX+1 is computed inside the INSERT; concurrent inserts collide on idx_jawir_number and retry.
      let assigned = false;
      for (let attempt = 0; attempt < MAX_NUMBER_RETRIES && !assigned; attempt++) {
        try {
          await rawClient!.execute(
            `INSERT INTO jawir_tags
               (id, nickname, status_tag, category, trah, region_status, lat, lng, distance_km, coffee_count, device_hash, ip_hash, jawir_number)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, COALESCE(MAX(jawir_number), 0) + 1 FROM jawir_tags`,
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
            ]
          );
          assigned = true;
        } catch (err) {
          if (isDuplicateOnKey(err, 'idx_unique_device')) {
            const [dup] = await db.select().from(jawirTags).where(eq(jawirTags.deviceHash, deviceHash)).limit(1);
            if (dup) return deviceLimitResponse(dup);
          }
          if (!isDuplicateOnKey(err, 'idx_jawir_number')) throw err;
        }
      }
      if (!assigned) throw new Error('Gagal dapat nomor Jawir setelah beberapa percobaan');

      const [inserted] = await db
        .select({ jawirNumber: jawirTags.jawirNumber })
        .from(jawirTags)
        .where(eq(jawirTags.id, id))
        .limit(1);
      assignedJawirNumber = Number(inserted?.jawirNumber);
    } else {
      assignedJawirNumber = memoryStore.length + 1;
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
      });
    }

    const newTagItem: JawirTagItem = {
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

    return NextResponse.json(
      {
        success: true,
        data: newTagItem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error inserting jawir tag:', error);
    return NextResponse.json(
      { success: false, message: 'Pine mencelat, gagal ditancepke. Jajal maneh.' },
      { status: 500 }
    );
  }
}
