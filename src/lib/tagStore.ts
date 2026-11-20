import { desc, eq } from 'drizzle-orm';
import { db, isDbConfigured, ensureTable } from '@/db';
import { jawirTags, jawirCoffeeVotes } from '@/db/schema';
import { NPC_PINS, type TagCategory, type TrahType, type RegionStatusType } from '@/lib/geo';
import { memoryStore, memoryCoffeeVotes, type JawirTagItem, type PublicTag } from '@/lib/memoryStore';

// Server-side reads shared by the API routes, the share metadata and the OG image.

export function rowToPublic(r: typeof jawirTags.$inferSelect): PublicTag {
  return {
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
  };
}

export function memoryToPublic(item: JawirTagItem): PublicTag {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deviceHash, ipHash, ownerHash, ...rest } = item;
  return { ...rest };
}

export async function listPublicTags(): Promise<PublicTag[]> {
  if (isDbConfigured && db) {
    await ensureTable();
    const rows = await db.select().from(jawirTags).orderBy(desc(jawirTags.createdAt));
    return rows.map(rowToPublic);
  }
  return memoryStore.map(memoryToPublic);
}

export async function findPublicTag(id: string): Promise<PublicTag | null> {
  if (isDbConfigured && db) {
    await ensureTable();
    const [row] = await db.select().from(jawirTags).where(eq(jawirTags.id, id)).limit(1);
    return row ? rowToPublic(row) : null;
  }
  const item = memoryStore.find((t) => t.id === id);
  return item ? memoryToPublic(item) : null;
}

// Anything a /?tag=<id> link can point at: a real pin or one of the legend NPCs.
export async function findShareableTag(id: string): Promise<PublicTag | null> {
  const npc = NPC_PINS.find((n) => n.id === id);
  if (npc) return { ...npc, jawirNumber: npc.jawirNumber ?? 0 };
  // UUIDs only; anything else cannot be a pin and is not worth a query.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return findPublicTag(id);
}

export async function findTagByOwner(ownerHash: string): Promise<PublicTag | null> {
  if (isDbConfigured && db) {
    await ensureTable();
    const [row] = await db.select().from(jawirTags).where(eq(jawirTags.ownerHash, ownerHash)).limit(1);
    return row ? rowToPublic(row) : null;
  }
  const item = memoryStore.find((t) => t.ownerHash === ownerHash);
  return item ? memoryToPublic(item) : null;
}

// Removes the owner's pin and the coffee votes it received. Returns false when the owner has no pin.
export async function deleteTagByOwner(ownerHash: string): Promise<boolean> {
  if (isDbConfigured && db) {
    await ensureTable();
    const [row] = await db
      .select({ id: jawirTags.id })
      .from(jawirTags)
      .where(eq(jawirTags.ownerHash, ownerHash))
      .limit(1);
    if (!row) return false;
    await db.delete(jawirTags).where(eq(jawirTags.id, row.id));
    await db.delete(jawirCoffeeVotes).where(eq(jawirCoffeeVotes.tagId, row.id));
    return true;
  }
  const index = memoryStore.findIndex((t) => t.ownerHash === ownerHash);
  if (index < 0) return false;
  const [removed] = memoryStore.splice(index, 1);
  memoryCoffeeVotes.forEach((key) => {
    if (key.startsWith(`${removed.id}:`)) memoryCoffeeVotes.delete(key);
  });
  return true;
}
