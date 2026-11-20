import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { db, isDbConfigured, ensureTable } from '@/db';
import { jawirTags, jawirReports } from '@/db/schema';
import { memoryStore, memoryReports } from '@/lib/memoryStore';
import { rowToPublic, memoryToPublic, PUBLIC_COLUMNS, deletePinCascade } from '@/lib/tagStore';
import { envInt } from '@/lib/request';
import { isDuplicateKeyError } from '@/lib/dbErrors';
import type { PublicTag } from '@/lib/memoryStore';

export const REPORT_REASONS = ['saru', 'spam', 'sara', 'pribadi', 'liyane'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Distinct browsers that must report a pin before it is hidden automatically.
export const REPORT_HIDE_THRESHOLD = envInt('REPORT_HIDE_THRESHOLD', 3);
const MAX_REPORTS_PER_IP_PER_HOUR = envInt('MAX_REPORTS_PER_IP_PER_HOUR', 20);

export type ReportResult = 'reported' | 'hidden' | 'already' | 'limited' | 'not_found' | 'own';

export async function reportPin(input: {
  tagId: string;
  reporterHash: string;
  ipHash: string;
  ownerHash: string | null;
  reason: ReportReason;
}): Promise<ReportResult> {
  const { tagId, reporterHash, ipHash, ownerHash, reason } = input;

  if (isDbConfigured && db) {
    await ensureTable();
    const [pin] = await db
      .select({ id: jawirTags.id, ownerHash: jawirTags.ownerHash, hiddenAt: jawirTags.hiddenAt })
      .from(jawirTags)
      .where(eq(jawirTags.id, tagId))
      .limit(1);
    if (!pin || pin.hiddenAt) return 'not_found';
    if (ownerHash && pin.ownerHash === ownerHash) return 'own';

    const [recent] = await db
      .select({ val: count() })
      .from(jawirReports)
      .where(and(eq(jawirReports.ipHash, ipHash), sql`${jawirReports.createdAt} >= NOW() - INTERVAL 1 HOUR`));
    if (Number(recent?.val || 0) >= MAX_REPORTS_PER_IP_PER_HOUR) return 'limited';

    try {
      await db.insert(jawirReports).values({ tagId, reporterHash, ipHash, reason });
    } catch (err) {
      if (isDuplicateKeyError(err)) return 'already';
      throw err;
    }

    const [total] = await db.select({ val: count() }).from(jawirReports).where(eq(jawirReports.tagId, tagId));
    if (Number(total?.val || 0) >= REPORT_HIDE_THRESHOLD) {
      await db
        .update(jawirTags)
        .set({ hiddenAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(jawirTags.id, tagId), isNull(jawirTags.hiddenAt)));
      return 'hidden';
    }
    return 'reported';
  }

  const pin = memoryStore.find((t) => t.id === tagId);
  if (!pin || pin.hiddenAt) return 'not_found';
  if (ownerHash && pin.ownerHash === ownerHash) return 'own';
  const since = Date.now() - 60 * 60 * 1000;
  const recent = Array.from(memoryReports.values()).filter((r) => r.ipHash === ipHash && r.at >= since).length;
  if (recent >= MAX_REPORTS_PER_IP_PER_HOUR) return 'limited';
  const key = `${tagId}:${reporterHash}`;
  if (memoryReports.has(key)) return 'already';
  memoryReports.set(key, { tagId, reporterHash, ipHash, reason, at: Date.now() });
  const total = Array.from(memoryReports.values()).filter((r) => r.tagId === tagId).length;
  if (total >= REPORT_HIDE_THRESHOLD) {
    pin.hiddenAt = new Date().toISOString();
    return 'hidden';
  }
  return 'reported';
}

export interface AdminPin extends PublicTag {
  hiddenAt: string | null;
  reportCount: number;
  reasons: Record<string, number>;
  lastReportAt: string | null;
}

// Every pin, hidden ones included, with its reports; most-reported first, then newest.
export async function listPinsForAdmin(): Promise<AdminPin[]> {
  let pins: (PublicTag & { hiddenAt: string | null })[];
  let reports: { tagId: string; reason: string; at: string }[];

  if (isDbConfigured && db) {
    await ensureTable();
    const rows = await db
      .select({ ...PUBLIC_COLUMNS, hiddenAt: jawirTags.hiddenAt })
      .from(jawirTags)
      .orderBy(desc(jawirTags.createdAt));
    pins = rows.map((r) => ({ ...rowToPublic(r), hiddenAt: r.hiddenAt ? new Date(r.hiddenAt).toISOString() : null }));
    const rep = await db
      .select({ tagId: jawirReports.tagId, reason: jawirReports.reason, createdAt: jawirReports.createdAt })
      .from(jawirReports);
    reports = rep.map((r) => ({ tagId: r.tagId, reason: r.reason, at: new Date(r.createdAt).toISOString() }));
  } else {
    pins = memoryStore.map((t) => ({ ...memoryToPublic(t), hiddenAt: t.hiddenAt ?? null }));
    reports = Array.from(memoryReports.values()).map((r) => ({ tagId: r.tagId, reason: r.reason, at: new Date(r.at).toISOString() }));
  }

  const byTag = new Map<string, { count: number; reasons: Record<string, number>; last: string | null }>();
  for (const r of reports) {
    const e = byTag.get(r.tagId) ?? { count: 0, reasons: {}, last: null };
    e.count++;
    e.reasons[r.reason] = (e.reasons[r.reason] || 0) + 1;
    if (!e.last || r.at > e.last) e.last = r.at;
    byTag.set(r.tagId, e);
  }

  return pins
    .map((p) => {
      const e = byTag.get(p.id);
      return { ...p, reportCount: e?.count ?? 0, reasons: e?.reasons ?? {}, lastReportAt: e?.last ?? null };
    })
    .sort((a, b) => b.reportCount - a.reportCount || b.createdAt.localeCompare(a.createdAt));
}

export type AdminAction = 'hide' | 'unhide' | 'delete';

// unhide also clears the pin's reports, so it is not hidden again by the same reports.
export async function applyAdminAction(id: string, action: AdminAction): Promise<boolean> {
  if (isDbConfigured && db) {
    await ensureTable();
    const [pin] = await db.select({ id: jawirTags.id }).from(jawirTags).where(eq(jawirTags.id, id)).limit(1);
    if (!pin) return false;
    if (action === 'delete') await deletePinCascade(id);
    if (action === 'hide') await db.update(jawirTags).set({ hiddenAt: sql`CURRENT_TIMESTAMP` }).where(eq(jawirTags.id, id));
    if (action === 'unhide') {
      await db.update(jawirTags).set({ hiddenAt: null }).where(eq(jawirTags.id, id));
      await db.delete(jawirReports).where(eq(jawirReports.tagId, id));
    }
    return true;
  }
  const pin = memoryStore.find((t) => t.id === id);
  if (!pin) return false;
  if (action === 'delete') await deletePinCascade(id);
  if (action === 'hide') pin.hiddenAt = new Date().toISOString();
  if (action === 'unhide') {
    pin.hiddenAt = null;
    memoryReports.forEach((r, key) => {
      if (r.tagId === id) memoryReports.delete(key);
    });
  }
  return true;
}
