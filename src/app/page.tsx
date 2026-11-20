'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MapWrapper from '@/components/MapWrapper';
import type { PickCenter } from '@/components/WorldMap';
import TopStatsBar from '@/components/TopStatsBar';
import BottomActionBar from '@/components/BottomActionBar';
import TagModal, { JawirTagData } from '@/components/TagModal';
import LoreModal from '@/components/LoreModal';
import LeaderboardModal, { LeaderboardData } from '@/components/LeaderboardModal';
import JawirIdCardModal from '@/components/JawirIdCardModal';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { LAWU_CENTER, NPC_PINS, calculateDistanceKm } from '@/lib/geo';

const RADAR_KM = 3;

let fingerprintPromise: Promise<string> | null = null;
function getFingerprintId(): Promise<string> {
  if (!fingerprintPromise) {
    fingerprintPromise = FingerprintJS.load()
      .then((fp) => fp.get())
      .then((result) => result.visitorId)
      .catch((err) => {
        fingerprintPromise = null;
        throw err;
      });
  }
  return fingerprintPromise;
}

// Keeps the address bar on /?tag=<id> for the selected pin without navigating.
function syncTagParam(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('tag', id);
  else url.searchParams.delete('tag');
  window.history.replaceState(window.history.state, '', url);
}

export default function Home() {
  const [tags, setTags] = useState<JawirTagData[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [farthestTag, setFarthestTag] = useState<JawirTagData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [userTag, setUserTag] = useState<JawirTagData | null>(null);

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

  const selectTag = useCallback((tag: JawirTagData | null) => {
    setSelectedTagForLine(tag);
    syncTagParam(tag ? tag.id : null);
  }, []);

  const fetchTags = useCallback(async (): Promise<JawirTagData[]> => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.success) {
        const fetchedTags: JawirTagData[] = data.data || [];
        setTags(fetchedTags);
        setTotal(data.total || 0);
        setFarthestTag(data.farthestTag || null);
        setLeaderboard(data.leaderboard || null);

        try {
          const saved = localStorage.getItem('jawir_my_tag');
          if (saved) {
            const parsed = JSON.parse(saved);
            const found = fetchedTags.find((t) => t.id === parsed.id);
            if (found) {
              setUserTag(found);
            } else {
              localStorage.removeItem('jawir_my_tag');
              setUserTag(null);
            }
          }
        } catch {
          // ignore
        }
        return fetchedTags;
      }
    } catch (err) {
      console.error('Failed to load jawir tags:', err);
    }
    return [];
  }, []);

  useEffect(() => {
    fetchTags().then((fetched) => {
      const id = new URLSearchParams(window.location.search).get('tag');
      if (!id) return;
      const target = [...fetched, ...NPC_PINS].find((t) => t.id === id);
      if (!target) return;
      selectTag(target);
      setFlyToTarget({ lat: target.lat, lng: target.lng, zoom: 13, tagId: target.id });
    });

    try {
      const saved = localStorage.getItem('jawir_my_tag');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUserTag(parsed);
      }
    } catch {
      // localstorage error ignore
    }
  }, [fetchTags, selectTag]);

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
    selectTag(newTag);
    setPickedCoords(null);
    setTags((prev) => {
      const exists = prev.some((t) => t.id === newTag.id);
      if (exists) return prev;
      return [newTag, ...prev];
    });
    setTotal((prev) => prev + 1);

    if (!farthestTag || newTag.distanceKm > farthestTag.distanceKm) {
      setFarthestTag(newTag);
    }

    setFlyToTarget({ lat: newTag.lat, lng: newTag.lng, zoom: 15 });
    setPopupAfterClose(newTag);

    // Automatically trigger KTP Jawir Digital modal with confetti celebration!
    setIsNewCreation(true);
    setIdCardNote(null);
    setIsIdCardOpen(true);
  };

  // 409: this device already owns a pin. Show the old passport without the new-pin celebration or counters.
  const handleExistingTag = (existing: JawirTagData, message?: string) => {
    setUserTag(existing);
    setPickedCoords(null);
    setIsTagModalOpen(false);
    selectTag(existing);
    setFlyToTarget({ lat: existing.lat, lng: existing.lng, zoom: 15 });
    setPopupAfterClose(existing);
    setIsNewCreation(false);
    setIdCardNote(message ?? null);
    setIsIdCardOpen(true);
  };

  // Resolves to 'sent' | 'already' | 'own' | 'error' so the popup can show its own feedback.
  const handleAddCoffee = async (tagId: string): Promise<'sent' | 'already' | 'own' | 'error'> => {
    const storageKey = `jawir_coffee_${tagId}`;
    if (localStorage.getItem(storageKey)) return 'already';

    const bumpLocal = () =>
      setTags((prev) =>
        prev.map((t) =>
          t.id === tagId ? { ...t, coffeeCount: (t.coffeeCount || 0) + 1 } : t
        )
      );

    // NPC pins only exist on the client.
    if (tagId.startsWith('npc-')) {
      localStorage.setItem(storageKey, 'true');
      bumpLocal();
      return 'sent';
    }

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
      const data = await res.json();
      if (!data.success) return 'error';
      localStorage.setItem(storageKey, 'true');
      bumpLocal();
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
        farthestTag={farthestTag}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenLore={() => setIsLoreModalOpen(true)}
        onFlyToFarthest={handleFlyToFarthest}
      />

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
        leaderboard={leaderboard}
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
      />
    </main>
  );
}
