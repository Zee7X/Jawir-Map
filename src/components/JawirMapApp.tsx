'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MapWrapper from '@/components/MapWrapper';
import type { CoffeeResult, PickCenter } from '@/components/WorldMap';
import TopStatsBar from '@/components/TopStatsBar';
import BottomActionBar from '@/components/BottomActionBar';
import TagModal, { JawirTagData } from '@/components/TagModal';
import LoreModal from '@/components/LoreModal';
import LeaderboardModal from '@/components/LeaderboardModal';
import JawirIdCardModal from '@/components/JawirIdCardModal';
import { getFingerprintId } from '@/lib/fingerprint';
import { buildLeaderboard } from '@/lib/leaderboard';
import { LAWU_CENTER, NPC_PINS, calculateDistanceKm } from '@/lib/geo';
import { pinPath } from '@/lib/share';

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
  return data as T;
}

// initialTagId comes from /p/<id>; the homepage also honours old /?tag=<id> links.
export default function JawirMapApp({ initialTagId }: { initialTagId?: string }) {
  const [tags, setTags] = useState<JawirTagData[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [userTag, setUserTag] = useState<JawirTagData | null>(null);
  // True only when this browser holds the pin's owner cookie; legacy pins known from localStorage cannot be deleted.
  const [ownsByCookie, setOwnsByCookie] = useState(false);

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
    } else if (me.status === 'fulfilled') {
      // No owner cookie match. Pins made before owner cookies existed are still recognised from localStorage.
      const saved = readSavedTag();
      const legacy = saved ? fetched.find((t) => t.id === saved.id) : undefined;
      setUserTag(legacy || null);
      setOwnsByCookie(false);
      writeSavedTag(legacy || null);
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

  const handleTagCreated = (newTag: JawirTagData) => {
    setUserTag(newTag);
    setOwnsByCookie(true);
    selectTag(newTag);
    setPickedCoords(null);
    setTags((prev) => (prev.some((t) => t.id === newTag.id) ? prev : [newTag, ...prev]));

    setFlyToTarget({ lat: newTag.lat, lng: newTag.lng, zoom: 15 });
    setPopupAfterClose(newTag);

    // Automatically trigger KTP Jawir Digital modal with confetti celebration!
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
      if (!res.ok || !data.success) return data.message || 'Pine gagal dibusak. Jajal maneh, lur.';
    } catch {
      return 'Pine gagal dibusak. Jajal maneh, lur.';
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
      />

      {loadState === 'error' && (
        <div
          role="alert"
          className="fixed top-[72px] left-3 right-3 z-[900] mx-auto max-w-md flex items-center gap-3 px-3.5 py-2.5 rounded-md bg-[#fdecea] border border-stamp/40 text-sm text-[#7f1d1d] shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)]"
        >
          <span className="flex-1">Pin-pin sedulur gagal diundhuh. Sinyalmu utawa servere lagi ngadat.</span>
          <button
            type="button"
            onClick={() => loadPins()}
            className="shrink-0 h-9 px-3 rounded bg-stamp hover:bg-[#991b1b] text-white font-bold transition"
          >
            Jajal maneh
          </button>
        </div>
      )}

      {/* Main Interactive Map */}
      <MapWrapper
        tags={tags}
        userTagId={userTag?.id}
        flyToTarget={flyToTarget}
        isPickingLocation={isPickingLocation}
        pickStart={pickStart}
        onPickCenter={setPickCenter}
        onOpenLore={() => setIsLoreModalOpen(true)}
        onAddCoffee={handleAddCoffee}
        selectedTagForLine={selectedTagForLine}
        onSelectTagForLine={selectTag}
      />

      {/* Bottom Floating Action Bar with Radar & KTP Button */}
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

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        leaderboard={loadState === 'error' ? null : leaderboard}
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
      />
    </main>
  );
}
