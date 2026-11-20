import { NextRequest, NextResponse } from 'next/server';
import { db, isDbConfigured, ensureTable } from '@/db';
import { jawirTags, jawirCoffeeVotes } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashString } from '@/lib/hash';
import { isDuplicateKeyError } from '@/lib/dbErrors';
import { memoryStore, memoryCoffeeVotes } from '@/lib/memoryStore';

const alreadyResponse = () =>
  NextResponse.json({ success: false, already: true, message: 'Kopimu wis kiriman, lur.' }, { status: 409 });
const ownResponse = () =>
  NextResponse.json(
    { success: false, own: true, message: 'Iki titikmu dhewe, lur. Kopine kanggo sedulur liya wae.' },
    { status: 403 }
  );
const notFoundResponse = () =>
  NextResponse.json({ success: false, message: 'Pin iki ora ono, lur' }, { status: 404 });

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
    if (!fingerprintId || typeof fingerprintId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Pirantimu durung dicap. Refresh terus jajal maneh.' },
        { status: 400 }
      );
    }
    const deviceHash = hashString(fingerprintId.trim());

    if (isDbConfigured && db) {
      await ensureTable();

      const found = await db
        .select({ id: jawirTags.id, deviceHash: jawirTags.deviceHash })
        .from(jawirTags)
        .where(eq(jawirTags.id, id))
        .limit(1);
      if (found.length === 0) return notFoundResponse();
      if (found[0].deviceHash === deviceHash) return ownResponse();

      // The (tag_id, device_hash) primary key makes the vote atomic: a duplicate throws.
      try {
        await db.insert(jawirCoffeeVotes).values({ tagId: id, deviceHash });
      } catch (err) {
        if (isDuplicateKeyError(err)) return alreadyResponse();
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

      return NextResponse.json({ success: true, coffeeCount: Number(updated[0]?.coffeeCount || 0) });
    }

    const tag = memoryStore.find((item) => item.id === id);
    if (!tag) return notFoundResponse();
    if (tag.deviceHash === deviceHash) return ownResponse();

    const voteKey = `${id}:${deviceHash}`;
    if (memoryCoffeeVotes.has(voteKey)) return alreadyResponse();
    memoryCoffeeVotes.add(voteKey);
    tag.coffeeCount += 1;

    return NextResponse.json({ success: true, coffeeCount: tag.coffeeCount });
  } catch (error) {
    console.error('Error incrementing coffee count:', error);
    return NextResponse.json(
      { success: false, message: 'Kopine kesenggol, tumpah' },
      { status: 500 }
    );
  }
}
