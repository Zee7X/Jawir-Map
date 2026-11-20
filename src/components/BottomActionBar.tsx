'use client';

import React, { useEffect } from 'react';
import { MapPin, Crosshair, Mountain, Shuffle, IdCard, X } from 'lucide-react';
import { JawirTagData } from './TagModal';
import type { PickCenter } from './WorldMap';
import { calculateDistanceFromLawu, detectRegionStatus, REGION_BADGE_MAP } from '@/lib/geo';
import { useLang } from '@/lib/i18n';

interface RadarInfo {
  nearbyCount: number;
  radiusKm: number;
  nearestNickname: string;
  nearestDistanceKm: number;
}

interface BottomActionBarProps {
  userTag: JawirTagData | null;
  radarInfo: RadarInfo | null;
  isPickingLocation: boolean;
  pickCenter: PickCenter | null;
  onConfirmPick: () => void;
  onCancelPickLocation: () => void;
  onOpenTagModal: () => void;
  onOpenIdCardModal: () => void;
  onFlyToMyTag: () => void;
  onFlyToLawu: () => void;
  onShuffle: () => void;
  // Coffee that reached the viewer's pin since their last visit.
  coffeeNews?: { fresh: number; total: number } | null;
  onDismissCoffeeNews?: () => void;
}

const PICK_MIN_ZOOM = 11;

// Phones stack a short label under the icon, wider screens put the full label beside it.
const QUIET =
  'flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 h-11 min-w-11 px-2 sm:px-3 rounded-md text-[10px] sm:text-sm font-bold text-ink hover:bg-parchment-deep transition';

function QuietLabel({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span className="sm:hidden leading-none">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}

export default function BottomActionBar({
  userTag,
  radarInfo,
  isPickingLocation,
  pickCenter,
  onConfirmPick,
  onCancelPickLocation,
  onOpenTagModal,
  onOpenIdCardModal,
  onFlyToMyTag,
  onFlyToLawu,
  onShuffle,
  coffeeNews,
  onDismissCoffeeNews,
}: BottomActionBarProps) {
  const { t } = useLang();
  useEffect(() => {
    if (!isPickingLocation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelPickLocation();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPickingLocation, onCancelPickLocation]);

  const region = pickCenter ? REGION_BADGE_MAP[detectRegionStatus(pickCenter.lat, pickCenter.lng)] : null;
  const tooFar = !pickCenter || pickCenter.zoom < PICK_MIN_ZOOM;

  return (
    <div className="fixed bottom-6 left-3 right-3 z-[900] pointer-events-none select-none flex flex-col items-center gap-2 pb-[env(safe-area-inset-bottom,0px)]">
      {isPickingLocation && (
        <section
          aria-label={t('Milih titik neng peta')}
          className="pointer-events-auto w-full max-w-md p-3 rounded-md bg-parchment-card border border-amber-900/20 shadow-[0_6px_20px_-6px_rgba(67,48,30,0.4)]"
        >
          <div aria-live="polite">
            <p className="font-type text-sm font-bold text-ink leading-snug">
              {region && pickCenter ? (
                <>
                  <span aria-hidden>{region.icon}</span> {t(region.label)} ·{' '}
                  {t('{km} km saka Lawu', {
                    km: calculateDistanceFromLawu(pickCenter.lat, pickCenter.lng).toLocaleString('id-ID'),
                  })}
                </>
              ) : (
                t('Maca peta…')
              )}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {pickCenter && tooFar
                ? t('Zoom-in dhisik, ben ora salah kecamatan.')
                : t('Titik bakal digeser ±500 m kanggo privasimu.')}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onCancelPickLocation}
              className="h-11 px-4 rounded border border-amber-900/25 bg-white text-sm font-bold text-ink hover:border-amber-900/50 transition"
            >
              {t('Batal')}
            </button>
            <button
              type="button"
              onClick={onConfirmPick}
              disabled={tooFar}
              className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded bg-terra hover:bg-terra-deep text-white text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{t('Pasang neng kene')}</span>
            </button>
          </div>
        </section>
      )}

      {!isPickingLocation && coffeeNews && (
        <div
          role="status"
          className="pointer-events-auto w-full max-w-md flex items-center gap-3 pl-3.5 pr-1.5 py-1.5 rounded-md bg-ink text-parchment shadow-[0_6px_20px_-6px_rgba(67,48,30,0.5)]"
        >
          <span className="text-xl" aria-hidden>☕</span>
          <p className="flex-1 text-[13px] leading-snug">
            <b>{t('{n} sedulur', { n: coffeeNews.fresh })}</b> {t('nitip kopi wiwit kowe mampir pungkasan. Saiki total')}{' '}
            <b className="font-type">{coffeeNews.total}</b> {t('kopi.')}
          </p>
          <button
            type="button"
            onClick={() => {
              onDismissCoffeeNews?.();
              onFlyToMyTag();
            }}
            className="shrink-0 h-9 px-3 rounded bg-terra hover:bg-terra-deep text-white text-xs font-bold transition"
          >
            {t('Deleng')}
          </button>
          <button
            type="button"
            onClick={onDismissCoffeeNews}
            aria-label={t('Tutup kabar kopi')}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded text-parchment/70 hover:text-parchment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isPickingLocation && radarInfo && (
        <p className="pointer-events-auto max-w-full px-3.5 py-2 rounded-md bg-parchment-card border border-dashed border-amber-900/35 text-[13px] text-ink leading-snug text-center shadow-[0_2px_10px_-3px_rgba(67,48,30,0.3)]">
          <span aria-hidden>📡 </span>
          {radarInfo.nearbyCount > 0 ? (
            <>
              <b>Radar:</b> {t('ana')}{' '}
              <b className="text-moss">{t('{n} sedulur Jawir', { n: radarInfo.nearbyCount })}</b>{' '}
              {t('neng radius {km} km! Ayo ngopi bareng.', { km: radarInfo.radiusKm })}
            </>
          ) : (
            <>
              <b>Radar:</b> {t('sepi nyenyet. Sedulur paling cedhak')} <b>{radarInfo.nearestNickname}</b>,{' '}
              <span className="font-type">{radarInfo.nearestDistanceKm.toLocaleString('id-ID')} km</span>.
            </>
          )}
        </p>
      )}

      {!isPickingLocation && (
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-md bg-parchment-card border border-amber-900/20 shadow-[0_6px_20px_-6px_rgba(67,48,30,0.4)]">
          {userTag ? (
            <>
              <button
                onClick={onOpenIdCardModal}
                className="flex items-center gap-2 h-11 px-4 rounded bg-terra hover:bg-terra-deep text-white text-sm font-bold transition"
              >
                <IdCard className="w-4 h-4 shrink-0" />
                <span>{t('Paspor Jawirku')}</span>
              </button>
              <button onClick={onFlyToMyTag} className={QUIET} title={t('Menyang titikku')}>
                <Crosshair className="w-4 h-4 text-moss shrink-0" />
                <span className="leading-none sm:leading-normal">{t('Titikku')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenTagModal}
              className="flex items-center gap-2 h-11 px-4 rounded bg-terra hover:bg-terra-deep text-white text-sm font-bold transition"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{t('Tancepke pin')}</span>
            </button>
          )}

          <span className="w-px h-6 bg-amber-900/15 mx-0.5" aria-hidden />

          <button onClick={onFlyToLawu} className={QUIET} title={t('Menyang Pucak Lawu')}>
            <Mountain className="w-4 h-4 text-terra shrink-0" />
            <QuietLabel short={t('Lawu')} full={t('Titik 0 Lawu')} />
          </button>
          <button onClick={onShuffle} className={QUIET} title={t('Mlumpat menyang Jawir sembarang')}>
            <Shuffle className="w-4 h-4 text-ink-soft shrink-0" />
            <span className="leading-none sm:leading-normal">{t('Ngacak')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
