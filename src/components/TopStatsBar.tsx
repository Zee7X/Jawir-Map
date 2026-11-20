'use client';

import React from 'react';
import Image from 'next/image';
import { Trophy, BookOpen, Search } from 'lucide-react';
import { JawirTagData } from './TagModal';

interface TopStatsBarProps {
  total: number;
  isLoading?: boolean;
  farthestTag: JawirTagData | null;
  onOpenLeaderboard: () => void;
  onOpenLore: () => void;
  onFlyToFarthest: (tag: JawirTagData) => void;
  onOpenSearch: () => void;
  activeFilters?: number;
}

// Phones stack a small label under the icon so four controls fit beside the logo.
const BTN =
  'flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 h-11 min-w-11 px-2 sm:px-3.5 rounded-md text-[10px] sm:text-sm font-bold transition';

const CHROME =
  'bg-parchment-card border border-amber-900/20 shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)]';

export default function TopStatsBar({
  total,
  isLoading = false,
  farthestTag,
  onOpenLeaderboard,
  onOpenLore,
  onFlyToFarthest,
  onOpenSearch,
  activeFilters = 0,
}: TopStatsBarProps) {
  return (
    <header className="fixed top-3 left-3 right-3 z-[900] pointer-events-none select-none flex items-start justify-between gap-2">
      <div className={`pointer-events-auto flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-md ${CHROME}`}>
        <Image src="/logo.png" alt="" width={36} height={36} className="rounded" priority />
        <div className="leading-none">
          <h1 className="font-display text-[17px] font-extrabold text-ink">Jawir Map</h1>
          <p className="font-type text-[11px] text-ink-soft mt-1 whitespace-nowrap" aria-live="polite">
            {isLoading ? (
              'Ngitung sedulur…'
            ) : (
              <>
                <b className="text-terra">{total.toLocaleString('id-ID')}</b> sedulur<span className="hidden sm:inline"> kacathet</span>
              </>
            )}
          </p>
        </div>
      </div>

      <nav className="pointer-events-auto flex items-center gap-1.5">
        {farthestTag && (
          <button
            onClick={() => onFlyToFarthest(farthestTag)}
            className={`hidden md:flex items-center gap-2.5 pl-2.5 pr-3 h-11 rounded-md text-left hover:border-terra transition ${CHROME}`}
            title="Mabur menyang rekor paling adoh"
          >
            {/* luggage-tag eyelet */}
            <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-900/40 shrink-0" aria-hidden />
            <span className="leading-tight">
              <span className="block text-[11px] text-ink-soft">Rekor paling adoh</span>
              <span className="block text-xs font-bold text-ink max-w-[220px] truncate">
                {farthestTag.nickname}
                <span className="font-type text-terra"> · {farthestTag.distanceKm.toLocaleString('id-ID')} km</span>
              </span>
            </span>
          </button>
        )}

        <button
          onClick={onOpenSearch}
          title="Golek sedulur lan saring peta"
          className={`relative ${BTN} text-ink hover:bg-parchment-deep ${CHROME}`}
        >
          <Search className="w-4 h-4 text-ink-soft shrink-0" />
          <span className="leading-none sm:leading-normal">Golek</span>
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-terra text-white font-type text-[11px] font-bold flex items-center justify-center" aria-label={`${activeFilters} saringan aktif`}>
              {activeFilters}
            </span>
          )}
        </button>

        <button
          onClick={onOpenLeaderboard}
          className={`${BTN} bg-terra hover:bg-terra-deep text-white shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)]`}
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="leading-none sm:leading-normal">Klasemen</span>
        </button>

        <button
          onClick={onOpenLore}
          title="Filosofi Titik 0 Lawu"
          className={`${BTN} text-ink hover:bg-parchment-deep ${CHROME}`}
        >
          <BookOpen className="w-4 h-4 text-ink-soft shrink-0" />
          <span className="leading-none sm:leading-normal">Filosofi</span>
        </button>
      </nav>
    </header>
  );
}
