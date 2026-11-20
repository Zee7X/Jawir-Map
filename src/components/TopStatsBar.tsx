'use client';

import React from 'react';
import Image from 'next/image';
import { Trophy, BookOpen } from 'lucide-react';
import { JawirTagData } from './TagModal';

interface TopStatsBarProps {
  total: number;
  isLoading?: boolean;
  farthestTag: JawirTagData | null;
  onOpenLeaderboard: () => void;
  onOpenLore: () => void;
  onFlyToFarthest: (tag: JawirTagData) => void;
}

const CHROME =
  'bg-parchment-card border border-amber-900/20 shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)]';

export default function TopStatsBar({
  total,
  isLoading = false,
  farthestTag,
  onOpenLeaderboard,
  onOpenLore,
  onFlyToFarthest,
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
                <b className="text-terra">{total.toLocaleString('id-ID')}</b> sedulur kacathet
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
          onClick={onOpenLeaderboard}
          className="flex items-center gap-2 px-3.5 h-11 rounded-md bg-terra hover:bg-terra-deep text-white text-sm font-bold shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)] transition"
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span>Klasemen</span>
        </button>

        <button
          onClick={onOpenLore}
          aria-label="Filosofi Titik 0 Lawu"
          className={`flex items-center justify-center gap-2 px-3 h-11 min-w-11 rounded-md text-sm font-bold text-ink hover:bg-parchment-deep transition ${CHROME}`}
        >
          <BookOpen className="w-4 h-4 text-ink-soft shrink-0" />
          <span className="hidden sm:inline">Filosofi</span>
        </button>
      </nav>
    </header>
  );
}
