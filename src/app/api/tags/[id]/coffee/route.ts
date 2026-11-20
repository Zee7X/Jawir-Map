import { NextRequest, NextResponse } from 'next/server';
import { db, isDbConfigured, ensureTable } from '@/db';
import { jawirTags, jawirCoffeeVotes } from '@/db/schema';
import { and, count, eq, sql } from 'drizzle-orm';
import { hashString } from '@/lib/hash';
import { isDuplicateKeyError } from '@/lib/dbErrors';
import { memoryStore, memoryCoffeeVotes, memoryCoffeeLog } from '@/lib/memoryStore';
import { getClientIp, readOwnerHash, readOrCreateVoterToken, setVoterCookie, envInt } from '@/lib/request';

export const dynamic = 'force-dynamic';

// The fingerprint comes from the browser, so a script could vote with endless fake ones; the IP cap bounds that.
// Many phones share one carrier IP (CGNAT), so the default is generous.
const MAX_COFFEE_PER_IP_PER_HOUR = envInt('MAX_COFFEE_PER_IP_PER_HOUR', 150);

// Pins with an owner token are matched by cookie only, since fingerprints collide across phones of the same model.
// Pins made before owner tokens existed fall back to the device fingerprint.
function isOwnPin(
  pin: { deviceHash?: string | null; ownerHash?: string | null },
  deviceHash: string,
  ownerHash: string | null
): boolean {
  if (pin.ownerHash) return ownerHash === pin.ownerHash;
  return pin.deviceHash === deviceHash;
}

const alreadyResponse = () =>
  NextResponse.json({ success: false, already: true, message: 'Kopimu wis kiriman, lur.' }, { status: 409 });
const ownResponse = () =>
  NextResponse.json(
    { success: false, own: true, message: 'Iki titikmu dhewe, lur. Kopine kanggo sedulur liya wae.' },
    { status: 403 }
  );
const notFoundResponse = () =>
  NextResponse.json({ success: false, message: 'Pin iki ora ono, lur' }, { status: 404 });
const limitedResponse = () =>
  NextResponse.json(
    { success: false, limited: true, message: 'Kopine entek, lur. Ngaso sedhela, mengko jajal maneh.' },
    { status: 429 }
  );

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Pin iki ora ono, lur' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const fingerprintId = body?.fingerprintId;
    if (!fingerprintId || typeof fingerprintId !== 'string' || fingerprintId.length > 128) {
      return NextResponse.json(
        { success: false, message: 'Pirantimu durung dicap. Refresh terus jajal maneh.' },
        { status: 400 }
      );
    }
    const deviceHash = hashString(fingerprintId.trim());
    const ipHash = hashString(getClientIp(request));
    const ownerHash = readOwnerHash(request);
    // Votes are keyed per browser (voter cookie), not per fingerprint, which collides across phones of the same model.
    // The value lives in the votes table's device_hash column; the prefix keeps it apart from old fingerprint votes.
    const voter = readOrCreateVoterToken(request);
    const voterHash = hashString(`voter:${voter.token}`);
    const respond = (response: NextResponse) => {
      if (voter.isNew) setVoterCookie(response, voter.token);
      return response;
    };

    if (isDbConfigured && db) {
      await ensureTable();

      const found = await db
        .select({ id: jawirTags.id, deviceHash: jawirTags.deviceHash, ownerHash: jawirTags.ownerHash })
        .from(jawirTags)
        .where(eq(jawirTags.id, id))
        .limit(1);
      if (found.length === 0) return notFoundResponse();
      if (isOwnPin(found[0], deviceHash, ownerHash)) return respond(ownResponse());

      const [recent] = await db
        .select({ val: count() })
        .from(jawirCoffeeVotes)
        .where(and(eq(jawirCoffeeVotes.ipHash, ipHash), sql`${jawirCoffeeVotes.createdAt} >= NOW() - INTERVAL 1 HOUR`));
      if (Number(recent?.val || 0) >= MAX_COFFEE_PER_IP_PER_HOUR) return respond(limitedResponse());

      // The (tag_id, device_hash) primary key makes the vote atomic: a duplicate throws.
      try {
        await db.insert(jawirCoffeeVotes).values({ tagId: id, deviceHash: voterHash, ipHash });
      } catch (err) {
        if (isDuplicateKeyError(err)) return respond(alreadyResponse());
        throw err;
      }

      await db
        .update(jawirTags)
        .set({ coffeeCount: sql`${jawirTags.coffeeCount} + 1` })
        .where(eq(jawirTags.id, id));

      const updated = await db
        .select({ coffeeCount: jawirTags.coffeeCount })
        .from(jawirTags)
        .where(eq(jawirTags.id, id))
        .limit(1);

      return respond(NextResponse.json({ success: true, coffeeCount: Number(updated[0]?.coffeeCount || 0) }));
    }

    const tag = memoryStore.find((item) => item.id === id);
    if (!tag) return notFoundResponse();
    if (isOwnPin(tag, deviceHash, ownerHash)) return respond(ownResponse());

    const since = Date.now() - 60 * 60 * 1000;
    while (memoryCoffeeLog.length && memoryCoffeeLog[0].at < since) memoryCoffeeLog.shift();
    if (memoryCoffeeLog.filter((v) => v.ipHash === ipHash && v.at >= since).length >= MAX_COFFEE_PER_IP_PER_HOUR) {
      return respond(limitedResponse());
    }

    const voteKey = `${id}:${voterHash}`;
    if (memoryCoffeeVotes.has(voteKey)) return respond(alreadyResponse());
    memoryCoffeeVotes.add(voteKey);
    memoryCoffeeLog.push({ ipHash, at: Date.now() });
    tag.coffeeCount += 1;

    return respond(NextResponse.json({ success: true, coffeeCount: tag.coffeeCount }));
  } catch (error) {
    console.error('Error incrementing coffee count:', error);
    return NextResponse.json(
      { success: false, message: 'Kopine kesenggol, tumpah' },
      { status: 500 }
    );
  }
}
