'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MapWrapper from '@/components/MapWrapper';
import type { CoffeeResult, PickCenter, ReportOutcome } from '@/components/WorldMap';
import TopStatsBar from '@/components/TopStatsBar';
import BottomActionBar from '@/components/BottomActionBar';
import TagModal, { JawirTagData } from '@/components/TagModal';
import LoreModal from '@/components/LoreModal';
import FilterModal from '@/components/FilterModal';
import { EMPTY_FILTER, activeFilterCount, matchesFilter, type PinFilter } from '@/lib/pinFilter';
import LeaderboardModal from '@/components/LeaderboardModal';
import JawirIdCardModal from '@/components/JawirIdCardModal';
import { getFingerprintId } from '@/lib/fingerprint';
import { buildLeaderboard, trahWarLine } from '@/lib/leaderboard';
import { LAWU_CENTER, NPC_PINS, calculateDistanceKm, type NpcPin, type TrahType } from '@/lib/geo';
import { pinPath } from '@/lib/share';
import { useLang } from '@/lib/i18n';

const RADAR_KM = 3;
const MY_TAG_KEY = 'jawir_my_tag';

// Keeps the address bar on /p/<id> for the selected pin (a link that previews when shared) without navigating.
function syncTagParam(id: string | null) {
  const url = new URL(window.location.href);
  url.pathname = id ? pinPath(id) : '/';
  url.searchParams.delete('tag');
  window.history.replaceState(window.history.state, '', url);
}

function readSavedTag(): JawirTagData | null {
  try {
    const saved = localStorage.getItem(MY_TAG_KEY);
    return saved ? (JSON.parse(saved) as JawirTagData) : null;
  } catch {
    return null;
  }
}

function writeSavedTag(tag: JawirTagData | null) {
  try {
    if (tag) localStorage.setItem(MY_TAG_KEY, JSON.stringify(tag));
    else localStorage.removeItem(MY_TAG_KEY);
  } catch {
    // storage blocked: the pin is still known for this visit
  }
}

// The CDN keeps serving a deleted pin for up to ~75 s (s-maxage 15 + swr 60); hide it on this device meanwhile.
const DELETED_KEY = 'jawir_deleted';
const DELETED_HIDE_MS = 2 * 60 * 1000;

function recentlyDeletedIds(): Set<string> {
  try {
    const entries = JSON.parse(sessionStorage.getItem(DELETED_KEY) || '{}') as Record<string, number>;
    return new Set(Object.keys(entries).filter((id) => Date.now() - entries[id] < DELETED_HIDE_MS));
  } catch {
    return new Set();
  }
}

function rememberDeleted(id: string) {
  try {
    const entries = JSON.parse(sessionStorage.getItem(DELETED_KEY) || '{}') as Record<string, number>;
    entries[id] = Date.now();
    sessionStorage.setItem(DELETED_KEY, JSON.stringify(entries));
  } catch {
    // storage blocked: the pin may briefly reappear after a reload
  }
}

// Coffee count the owner last saw, so a return visit can say how many arrived since.
const coffeeSeenKey = (id: string) => `jawir_coffee_seen_${id}`;

function takeCoffeeNews(tag: JawirTagData): { fresh: number; total: number } | null {
  const total = tag.coffeeCount || 0;
  try {
    const raw = localStorage.getItem(coffeeSeenKey(tag.id));
    localStorage.setItem(coffeeSeenKey(tag.id), String(total));
    // First visit with this pin: start counting from now instead of announcing every past coffee.
    if (raw === null) return null;
    const fresh = total - Number(raw);
    return fresh > 0 ? { fresh, total } : null;
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
  return data as T;
}

// initialTagId comes from /p/<id>; the homepage also honours old /?tag=<id> links.
export default function JawirMapApp({ initialTagId }: { initialTagId?: string }) {
  const { lang, setLang, t, tm } = useLang();
  const [tags, setTags] = useState<JawirTagData[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [userTag, setUserTag] = useState<JawirTagData | null>(null);
  // True only when this browser holds the pin's owner cookie; legacy pins known from localStorage cannot be deleted.
  const [ownsByCookie, setOwnsByCookie] = useState(false);
  const [coffeeNews, setCoffeeNews] = useState<{ fresh: number; total: number } | null>(null);
  const [filter, setFilter] = useState<PinFilter>(EMPTY_FILTER);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isWide, setIsWide] = useState(false);

  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    tagId?: string;
  } | null>(null);

  const [selectedTagForLine, setSelectedTagForLine] = useState<JawirTagData | null>(null);

  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickStart, setPickStart] = useState<{ lat: number; lng: number } | null>(null);
  const [pickCenter, setPickCenter] = useState<PickCenter | null>(null);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [isNewCreation, setIsNewCreation] = useState(false);
  const [idCardNote, setIdCardNote] = useState<string | null>(null);
  // Pin whose map popup opens once the ID card closes (create/409 flows), so it never sits behind the modal.
  const [popupAfterClose, setPopupAfterClose] = useState<JawirTagData | null>(null);

  const total = tags.length;
  const leaderboard = useMemo(() => buildLeaderboard(tags), [tags]);
  const farthestTag = leaderboard.topFarthest[0] || null;
  const warLine = useMemo(() => trahWarLine(leaderboard.trahWar, userTag?.trah as TrahType | undefined, t), [leaderboard, userTag, t]);
  const advanceTicker = useCallback(() => setTickerIndex((i) => i + 1), []);
  const filterCount = activeFilterCount(filter);
  // The map, shuffle and the search list follow the filter; totals and the leaderboard always count every pin.
  const visibleTags = useMemo(() => (filterCount ? tags.filter((t) => matchesFilter(t, filter)) : tags), [tags, filter, filterCount]);

  // Desktop shows the farthest record in the top bar; phones get it as a second line in the rotating banner.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const selectTag = useCallback((tag: JawirTagData | null) => {
    setSelectedTagForLine(tag);
    syncTagParam(tag ? tag.id : null);
  }, []);

  // The pin list is CDN-cached for a few seconds; the owner lookup is not, so a fresh pin is never missing for its owner.
  const loadPins = useCallback(async (): Promise<JawirTagData[]> => {
    setLoadState('loading');
    const [list, me] = await Promise.allSettled([
      fetchJson<{ data: JawirTagData[] }>('/api/tags'),
      fetchJson<{ data: JawirTagData | null }>('/api/tags/me'),
    ]);

    if (list.status === 'rejected') {
      console.error('Failed to load jawir tags:', list.reason);
      setLoadState('error');
      return [];
    }

    const deleted = recentlyDeletedIds();
    let fetched = (list.value.data || []).filter((t) => !deleted.has(t.id));
    const mine = me.status === 'fulfilled' ? me.value.data : null;
    // /me is never cached, so its copy (fresh coffee count) replaces any stale one from the list.
    if (mine) fetched = [mine, ...fetched.filter((t) => t.id !== mine.id)];

    if (mine) {
      setUserTag(mine);
      setOwnsByCookie(true);
      writeSavedTag(mine);
      setCoffeeNews(takeCoffeeNews(mine));
    } else if (me.status === 'fulfilled') {
      // No owner cookie match. Pins made before owner cookies existed are still recognised from localStorage.
      const saved = readSavedTag();
      const legacy = saved ? fetched.find((t) => t.id === saved.id) : undefined;
      setUserTag(legacy || null);
      setOwnsByCookie(false);
      writeSavedTag(legacy || null);
      if (legacy) setCoffeeNews(takeCoffeeNews(legacy));
    }

    setTags(fetched);
    setLoadState('ok');
    return fetched;
  }, []);

  useEffect(() => {
    setUserTag(readSavedTag());
    loadPins().then((fetched) => {
      const id = initialTagId || new URLSearchParams(window.location.search).get('tag');
      if (!id) return;
      const target = [...fetched, ...NPC_PINS].find((t) => t.id === id);
      if (!target) {
        syncTagParam(null);
        return;
      }
      selectTag(target);
      setFlyToTarget({ lat: target.lat, lng: target.lng, zoom: 13, tagId: target.id });
    });
  }, [loadPins, selectTag, initialTagId]);

  const radarInfo = useMemo(() => {
    if (!userTag || tags.length <= 1) return null;

    let nearest: JawirTagData | null = null;
    let minDistance = Infinity;
    let nearbyCount = 0;

    for (const t of tags) {
      if (t.id === userTag.id) continue;
      const d = calculateDistanceKm(userTag.lat, userTag.lng, t.lat, t.lng);
      if (d < minDistance) {
        minDistance = d;
        nearest = t;
      }
      if (d <= RADAR_KM) {
        nearbyCount++;
      }
    }

    if (!nearest) return null;

    return {
      nearbyCount,
      radiusKm: RADAR_KM,
      nearestNickname: nearest.nickname,
      nearestDistanceKm: minDistance,
    };
  }, [userTag, tags]);

  const handleFlyToFarthest = (tag: JawirTagData) => {
    selectTag(tag);
    setFlyToTarget({
      lat: tag.lat,
      lng: tag.lng,
      zoom: 12,
      tagId: tag.id,
    });
  };

  const handleFlyToLawu = () => {
    selectTag(null);
    setFlyToTarget({
      lat: LAWU_CENTER.lat,
      lng: LAWU_CENTER.lng,
      zoom: 14,
      tagId: 'lawu',
    });
  };

  const handleFlyToMyTag = () => {
    if (!userTag) return;
    selectTag(userTag);
    setFlyToTarget({
      lat: userTag.lat,
      lng: userTag.lng,
      zoom: 15,
      tagId: userTag.id,
    });
  };

  const handleShuffle = () => {
    // Skip the pin that is already open, so Ngacak always goes somewhere new.
    const others = visibleTags.filter((t) => t.id !== selectedTagForLine?.id);
    const tags = others.length ? others : visibleTags;
    if (tags.length === 0) return;
    const randomIndex = Math.floor(Math.random() * tags.length);
    const chosen = tags[randomIndex];
    selectTag(chosen);
    setFlyToTarget({
      lat: chosen.lat,
      lng: chosen.lng,
      zoom: 13,
      tagId: chosen.id,
    });
  };

  const handleStartPickOnMap = (from: { lat: number; lng: number } | null) => {
    setPickStart(from);
    setPickCenter(null);
    setIsPickingLocation(true);
    setIsTagModalOpen(false);
  };

  const handleConfirmPick = () => {
    if (!pickCenter) return;
    setPickedCoords({ lat: pickCenter.lat, lng: pickCenter.lng });
    setIsPickingLocation(false);
    setIsTagModalOpen(true);
  };

  const handleCancelPickLocation = () => {
    setIsPickingLocation(false);
    setIsTagModalOpen(true);
  };

  const handleVisitNpc = (npc: NpcPin) => {
    setIsIdCardOpen(false);
    setPopupAfterClose(null);
    selectTag(npc);
    setFlyToTarget({ lat: npc.lat, lng: npc.lng, zoom: 13, tagId: npc.id });
  };

  const handleTagCreated = (newTag: JawirTagData) => {
    setUserTag(newTag);
    setOwnsByCookie(true);
    selectTag(newTag);
    setPickedCoords(null);
    setTags((prev) => (prev.some((t) => t.id === newTag.id) ? prev : [newTag, ...prev]));

    setFlyToTarget({ lat: newTag.lat, lng: newTag.lng, zoom: 15 });
    setPopupAfterClose(newTag);

    // Automatically trigger the Paspor Jawir modal with confetti celebration!
    setIsNewCreation(true);
    setIdCardNote(null);
    setIsIdCardOpen(true);
  };

  // 409 with the owner's own pin: show the old passport without the new-pin celebration.
  const handleExistingTag = (existing: JawirTagData, message?: string) => {
    setUserTag(existing);
    // existingTag is only returned when the owner cookie matched.
    setOwnsByCookie(true);
    setTags((prev) => (prev.some((t) => t.id === existing.id) ? prev : [existing, ...prev]));
    setPickedCoords(null);
    setIsTagModalOpen(false);
    selectTag(existing);
    setFlyToTarget({ lat: existing.lat, lng: existing.lng, zoom: 15 });
    setPopupAfterClose(existing);
    setIsNewCreation(false);
    setIdCardNote(message ?? null);
    setIsIdCardOpen(true);
  };

  // Resolves to an error message for the ID card, or null once the pin is gone.
  const handleDeleteMyTag = async (): Promise<string | null> => {
    if (!userTag) return null;
    try {
      const res = await fetch('/api/tags/me', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) return data.message ? tm(data.message) : t('Pine gagal dibusak. Jajal maneh, lur.');
    } catch {
      return t('Pine gagal dibusak. Jajal maneh, lur.');
    }
    const goneId = userTag.id;
    rememberDeleted(goneId);
    setTags((prev) => prev.filter((t) => t.id !== goneId));
    if (selectedTagForLine?.id === goneId) selectTag(null);
    setUserTag(null);
    setOwnsByCookie(false);
    writeSavedTag(null);
    setPopupAfterClose(null);
    setIsIdCardOpen(false);
    return null;
  };

  // A report that hides the pin removes it from this map at once; others stop seeing it within the cache window.
  const handleReportPin = async (tagId: string, reason: string): Promise<ReportOutcome> => {
    try {
      const res = await fetch(`/api/tags/${tagId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.hidden) {
        rememberDeleted(tagId);
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        if (selectedTagForLine?.id === tagId) selectTag(null);
      }
      const message = data.message ? tm(data.message) : t('Laporane gagal dikirim. Jajal maneh.');
      return { ok: !!data.success, hidden: !!data.hidden, message };
    } catch {
      return { ok: false, hidden: false, message: t('Laporane gagal dikirim. Jajal maneh.') };
    }
  };

  // Resolves to a CoffeeResult so the popup can show its own feedback.
  const handleAddCoffee = async (tagId: string): Promise<CoffeeResult> => {
    const storageKey = `jawir_coffee_${tagId}`;
    if (localStorage.getItem(storageKey)) return 'already';

    try {
      const fingerprintId = await getFingerprintId();
      const res = await fetch(`/api/tags/${tagId}/coffee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprintId }),
      });
      if (res.status === 409) {
        localStorage.setItem(storageKey, 'true');
        return 'already';
      }
      if (res.status === 403) return 'own';
      if (res.status === 429) return 'limited';
      const data = await res.json();
      if (!data.success) return 'error';
      localStorage.setItem(storageKey, 'true');
      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, coffeeCount: Number(data.coffeeCount) || (t.coffeeCount || 0) + 1 } : t))
      );
      return 'sent';
    } catch (err) {
      console.error('Failed to add coffee:', err);
      return 'error';
    }
  };

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-[#efe7d8]">
      {/* Top Floating Stats & Controls */}
      <TopStatsBar
        total={total}
        isLoading={loadState === 'loading' && total === 0}
        farthestTag={farthestTag}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenLore={() => setIsLoreModalOpen(true)}
        onFlyToFarthest={handleFlyToFarthest}
        onOpenSearch={() => setIsFilterOpen(true)}
        activeFilters={filterCount}
      />

      {loadState === 'error' && (
        <div
          role="alert"
          className="fixed top-[72px] left-3 right-[68px] sm:right-3 z-[900] mx-auto max-w-md flex items-center gap-3 px-3.5 py-2.5 rounded-md bg-[#fdecea] border border-stamp/40 text-sm text-[#7f1d1d] shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)]"
        >
          <span className="flex-1">{t('Pin-pin sedulur gagal diundhuh. Sinyalmu utawa servere lagi ngadat.')}</span>
          <button
            type="button"
            onClick={() => loadPins()}
            className="shrink-0 h-9 px-3 rounded bg-stamp hover:bg-[#991b1b] text-white font-bold transition"
          >
            {t('Jajal maneh')}
          </button>
        </div>
      )}

      {loadState === 'ok' && !isPickingLocation && !selectedTagForLine && filterCount > 0 && (
        <div className="fixed top-[72px] left-3 z-[890] max-w-[calc(100%-80px)] sm:max-w-md flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-md bg-ink text-parchment text-[13px] shadow-[0_2px_10px_-3px_rgba(67,48,30,0.4)] select-none">
          <button type="button" onClick={() => setIsFilterOpen(true)} className="flex-1 text-left py-0.5">
            {t('🔎 Nyaring:')} <b className="font-type">{visibleTags.length}</b> {t('saka')}{' '}
            <b className="font-type">{tags.length}</b> {t('pin')}
          </button>
          <button
            type="button"
            onClick={() => setFilter(EMPTY_FILTER)}
            className="shrink-0 h-8 px-2.5 rounded bg-parchment/15 hover:bg-parchment/25 text-xs font-bold"
          >
            {t('Reset')}
          </button>
        </div>
      )}

      {loadState === 'ok' && !isPickingLocation && !selectedTagForLine && filterCount === 0 && (
        <NewsTicker
          index={tickerIndex}
          onAdvance={advanceTicker}
          items={[
            !!warLine && {
              key: 'war',
              label: t('Perang Trah'),
              text: warLine as string,
              action: t('Klasemen'),
              onClick: () => setIsLeaderboardOpen(true),
            },
            !isWide && farthestTag && {
              key: 'record',
              label: t('Rekor paling adoh'),
              text: t('{name}, {km} km saka Lawu.', {
                name: farthestTag.nickname,
                km: farthestTag.distanceKm.toLocaleString('id-ID'),
              }),
              action: t('Mabur'),
              onClick: () => handleFlyToFarthest(farthestTag),
            },
          ]}
        />
      )}

      {/* Language switch: shows the language it switches to */}
      {!isPickingLocation && (
        <button
          type="button"
          onClick={() => setLang(lang === 'jv' ? 'id' : 'jv')}
          title={lang === 'jv' ? 'Ganti menyang Basa Indonesia' : 'Ganti ke Bahasa Jawa'}
          aria-label={lang === 'jv' ? 'Ganti menyang Basa Indonesia' : 'Ganti ke Bahasa Jawa'}
          className="fixed top-[72px] right-3 z-[890] h-11 min-w-11 px-2 rounded-md bg-parchment-card border border-amber-900/20 font-type font-bold text-sm text-ink hover:bg-parchment-deep shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)] transition select-none"
        >
          {lang === 'jv' ? 'ID' : 'JV'}
        </button>
      )}

      {/* Main Interactive Map */}
      <MapWrapper
        tags={visibleTags}
        userTagId={userTag?.id}
        flyToTarget={flyToTarget}
        isPickingLocation={isPickingLocation}
        pickStart={pickStart}
        onPickCenter={setPickCenter}
        onOpenLore={() => setIsLoreModalOpen(true)}
        onAddCoffee={handleAddCoffee}
        onReportPin={handleReportPin}
        selectedTagForLine={selectedTagForLine}
        onSelectTagForLine={selectTag}
      />

      {/* Bottom Floating Action Bar with Radar & Paspor Button */}
      <BottomActionBar
        userTag={userTag}
        radarInfo={radarInfo}
        isPickingLocation={isPickingLocation}
        pickCenter={pickCenter}
        onConfirmPick={handleConfirmPick}
        onCancelPickLocation={handleCancelPickLocation}
        onOpenTagModal={() => setIsTagModalOpen(true)}
        onOpenIdCardModal={() => {
          setIsNewCreation(false);
          setIdCardNote(null);
          setIsIdCardOpen(true);
        }}
        onFlyToMyTag={handleFlyToMyTag}
        onFlyToLawu={handleFlyToLawu}
        onShuffle={handleShuffle}
        coffeeNews={coffeeNews}
        onDismissCoffeeNews={() => setCoffeeNews(null)}
      />

      {/* Modals */}
      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        pickedCoords={pickedCoords}
        onStartPickOnMap={handleStartPickOnMap}
        onTagCreated={handleTagCreated}
        onExistingTag={handleExistingTag}
      />

      <LoreModal isOpen={isLoreModalOpen} onClose={() => setIsLoreModalOpen(false)} />

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        tags={tags}
        filter={filter}
        onChange={setFilter}
        onPick={(tag) => {
          // A picked result must stay on the map, so drop chip filters that would hide it.
          if (!matchesFilter(tag, { ...filter, query: '' })) setFilter(EMPTY_FILTER);
          else setFilter({ ...filter, query: '' });
          selectTag(tag);
          setFlyToTarget({ lat: tag.lat, lng: tag.lng, zoom: 13, tagId: tag.id });
        }}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        leaderboard={loadState === 'error' ? null : leaderboard}
        userTrah={userTag?.trah as TrahType | undefined}
        total={total}
        onSelectTag={(tag) => {
          selectTag(tag);
          setFlyToTarget({
            lat: tag.lat,
            lng: tag.lng,
            zoom: 14,
            tagId: tag.id,
          });
        }}
      />

      <JawirIdCardModal
        isOpen={isIdCardOpen}
        onClose={() => {
          setIsIdCardOpen(false);
          if (popupAfterClose) {
            setFlyToTarget({ lat: popupAfterClose.lat, lng: popupAfterClose.lng, zoom: 15, tagId: popupAfterClose.id });
            setPopupAfterClose(null);
          }
        }}
        tag={userTag}
        isNewCreation={isNewCreation}
        note={idCardNote}
        onDelete={ownsByCookie ? handleDeleteMyTag : undefined}
        onVisitNpc={handleVisitNpc}
      />
    </main>
  );
}

interface TickerItem {
  key: string;
  label: string;
  text: string;
  action: string;
  onClick: () => void;
}

const TICKER_MS = 7000;

// One banner under the header that rotates through short news lines (trah war, record holder).
function NewsTicker({ items, index, onAdvance }: { items: (TickerItem | null | false | undefined)[]; index: number; onAdvance: () => void }) {
  const list = items.filter(Boolean) as TickerItem[];
  useEffect(() => {
    if (list.length < 2) return;
    const t = setTimeout(onAdvance, TICKER_MS);
    return () => clearTimeout(t);
  }, [index, list.length, onAdvance]);
  if (list.length === 0) return null;
  const item = list[index % list.length];

  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-live="polite"
      className="fixed top-[72px] left-3 z-[890] max-w-[calc(100%-80px)] sm:max-w-md flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-md bg-parchment-card border border-dashed border-terra/50 text-left text-[13px] leading-snug text-ink shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)] hover:border-terra transition select-none"
    >
      <span key={item.key} className="flex-1 animate-[ticker-in_300ms_ease-out] motion-reduce:animate-none">
        <b className="text-terra-deep">{item.label}:</b> {item.text}
      </span>
      <span className="shrink-0 font-type text-xs font-bold text-terra-deep underline underline-offset-2">{item.action}</span>
    </button>
  );
}
