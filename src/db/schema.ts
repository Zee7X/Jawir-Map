import {
  mysqlTable,
  varchar,
  decimal,
  timestamp,
  int,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/mysql-core';

export const jawirTags = mysqlTable(
  'jawir_tags',
  {
    id: varchar('id', { length: 36 }).primaryKey(), // UUID v4
    jawirNumber: int('jawir_number').notNull(), // Nomor urut KTP Jawir (#1, #2, dst), unik (idx_jawir_number), dihitung MAX+1 saat insert
    nickname: varchar('nickname', { length: 40 }).notNull(),
    statusTag: varchar('status_tag', { length: 120 }).notNull(),
    category: varchar('category', { length: 25 }).notNull().default('eksis'),
    // 'pejuang_rupiah' | 'cari_kawan' | 'butuh_info' | 'eksis'
    trah: varchar('trah', { length: 25 }).notNull().default('mataraman'),
    // 'mataraman' | 'ngapak' | 'arekan' | 'pantura' | 'rantau_lahir' | 'simpatisan'
    regionStatus: varchar('region_status', { length: 30 }).notNull().default('kandang'),
    // 'kandang' | 'sunda_empire' | 'antarpulau' | 'internasional'
    lat: decimal('lat', { precision: 9, scale: 6 }).notNull(),
    lng: decimal('lng', { precision: 9, scale: 6 }).notNull(),
    distanceKm: int('distance_km').notNull().default(0), // Jarak dari Gunung Lawu (-7.6250, 111.1925)
    coffeeCount: int('coffee_count').notNull().default(0), // Jumlah reaksi "Titip Kopi"
    deviceHash: varchar('device_hash', { length: 64 }).notNull(), // SHA-256 Fingerprint + Salt
    ipHash: varchar('ip_hash', { length: 64 }).notNull(), // SHA-256 IP + Salt
    // SHA-256 of the random owner token kept in the creator's httpOnly cookie. NULL for pins made before tokens existed.
    ownerHash: varchar('owner_hash', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    deviceHashIdx: uniqueIndex('idx_unique_device').on(table.deviceHash),
    jawirNumberIdx: uniqueIndex('idx_jawir_number').on(table.jawirNumber),
    coordsIdx: index('idx_coords').on(table.lat, table.lng),
    distanceIdx: index('idx_distance').on(table.distanceKm),
    coffeeIdx: index('idx_coffee').on(table.coffeeCount),
    ownerIdx: index('idx_owner').on(table.ownerHash),
  })
);

export const jawirCoffeeVotes = mysqlTable(
  'jawir_coffee_votes',
  {
    tagId: varchar('tag_id', { length: 36 }).notNull(),
    deviceHash: varchar('device_hash', { length: 64 }).notNull(),
    ipHash: varchar('ip_hash', { length: 64 }), // for the per-IP hourly limit; NULL on older votes
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tagId, table.deviceHash] }),
    ipIdx: index('idx_vote_ip').on(table.ipHash, table.createdAt),
  })
);

export type JawirTag = typeof jawirTags.$inferSelect;
export type NewJawirTag = typeof jawirTags.$inferInsert;
