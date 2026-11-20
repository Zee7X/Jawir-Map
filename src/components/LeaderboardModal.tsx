'use client';

import React, { useEffect, useState } from 'react';
import { JawirTagData } from './TagModal';
import Dossier from './Dossier';
import { TRAH_MAP, REGION_BADGE_MAP, type TrahType } from '@/lib/geo';
import { trahRanks, type LeaderboardData } from '@/lib/leaderboard';

export type { LeaderboardData };

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardData | null;
  total: number;
  onSelectTag: (tag: JawirTagData) => void;
  // Trah of the viewer's own pin, highlighted in Perang Trah.
  userTrah?: TrahType;
}

export type TabType = 'war' | 'farthest' | 'closest' | 'coffee' | 'census';
type BoardTab = Exclude<TabType, 'census' | 'war'>;

const TABS: { id: TabType; label: string }[] = [
  { id: 'war', label: 'Perang Trah' },
  { id: 'farthest', label: 'Paling Adoh' },
  { id: 'closest', label: 'Juru Kunci' },
  { id: 'coffee', label: 'Kopi' },
  { id: 'census', label: 'Sensus Kasta' },
];

// Titles are earned by rank in each board, so they never claim anything the data does not show.
const BOARDS: Record<BoardTab, { intro: string; titles: string[]; metric: (t: JawirTagData) => string }> = {
  farthest: {
    intro: 'Diukur garis lurus saka Pucak Lawu. Sapa sing paling nekat minggat.',
    titles: ['Penguasa Pojok Donya', 'Duta Besar Perantauan', 'Lali Dalan Mulih'],
    metric: (t) => `${t.distanceKm.toLocaleString('id-ID')} km`,
  },
  closest: {
    intro: 'Sing paling mepet kawah. Mulih mung sak lompatan.',
    titles: ['Penjaga Sego Pecel Mbok Yem', 'Tanggane Kawah', 'Isih Mambu Belerang'],
    metric: (t) => `${t.distanceKm.toLocaleString('id-ID')} km`,
  },
  coffee: {
    intro: 'Pin sing paling kerep dititipi kopi. Sugih relasi, sugih kafein.',
    titles: ['Juragan Kopi Sedonya', 'Sesepuh Ahli Ngopi', 'Langganan Angkringan'],
    metric: (t) => `${t.coffeeCount || 0} kopi`,
  },
};

const MEDALS = [
  { emoji: '🥇', label: 'Emas', step: 'h-20', ring: 'border-gold', tint: 'bg-[#fdf1d6]' },
  { emoji: '🥈', label: 'Salaka', step: 'h-14', ring: 'border-[#a8a29e]', tint: 'bg-[#f1efea]' },
  { emoji: '🥉', label: 'Prunggu', step: 'h-10', ring: 'border-[#b4693a]', tint: 'bg-[#f6e6d8]' },
];

function Podium({ items, titles, metric, onPick }: {
  items: JawirTagData[];
  titles: string[];
  metric: (t: JawirTagData) => string;
  onPick: (t: JawirTagData) => void;
}) {
  // Visual order 2-1-3 so the champion stands in the middle on the tallest step.
  const order = [1, 0, 2].filter((i) => items[i]);
  return (
    <ol className="grid grid-cols-3 items-end gap-2" aria-label="Telu paling dhuwur">
      {order.map((rank) => {
        const t = items[rank];
        const m = MEDALS[rank];
        return (
          <li key={t.id} className={rank === 0 ? 'order-2' : rank === 1 ? 'order-1' : 'order-3'}>
            <button
              onClick={() => onPick(t)}
              className="group w-full text-center flex flex-col items-center gap-1 px-1 pb-0 rounded-md hover:bg-parchment-deep/60 transition"
            >
              <span className={`text-[28px] leading-none ${rank === 0 ? 'sm:text-[34px]' : ''}`} aria-label={`Medali ${m.label}`}>
                {m.emoji}
              </span>
              <span className="font-display font-extrabold text-[15px] leading-tight text-ink group-hover:text-terra-deep break-words line-clamp-2">
                {t.nickname}
              </span>
              <span className="text-[11px] leading-tight text-ink-soft line-clamp-2">{titles[rank]}</span>
              <span className="font-type text-[13px] font-bold text-terra-deep">{metric(t)}</span>
              <span className={`mt-1 w-full ${m.step} ${m.tint} border-t-4 ${m.ring} rounded-t-sm flex items-start justify-center pt-1 font-display text-2xl font-extrabold text-ink/40`}>
                {rank + 1}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

function WarPanel({ leaderboard, userTrah }: { leaderboard: LeaderboardData; userTrah?: TrahType }) {
  const war = leaderboard.trahWar;
  const top = war[0]?.count || 0;
  const ranks = trahRanks(war);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-display text-lg font-extrabold">Trah endi sing paling akeh balane?</h3>
        <p className="text-xs text-ink-soft mb-3">Saben pin dadi siji bala kanggo trahe. Ajak sedulur sak trah ben trahmu menang.</p>
        <ol className="space-y-2.5">
          {war.map((w, i) => {
            const info = TRAH_MAP[w.trah];
            const mine = w.trah === userTrah;
            const rank = ranks[i];
            const gap = top - w.count;
            return (
              <li key={w.trah} className={`rounded px-2.5 py-2 ${mine ? 'bg-[#fbeee4] ring-1 ring-terra/40' : ''}`}>
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="w-6 shrink-0 text-center" aria-label={`Peringkat ${rank}`}>
                    {w.count > 0 && MEDAL_ICONS[rank - 1] ? MEDAL_ICONS[rank - 1] : <span className="font-type text-ink-soft">{rank}</span>}
                  </span>
                  <span aria-hidden>{info.icon}</span>
                  <span className="font-semibold text-ink">
                    {info.label}
                    {mine && <b className="ml-1.5 text-xs text-terra-deep">· trahmu</b>}
                  </span>
                  <span className="leader" aria-hidden />
                  <span className="font-type font-bold text-ink">{w.count}</span>
                </div>
                <span className="mt-1.5 ml-8 block h-2.5 rounded-sm bg-amber-900/10 overflow-hidden">
                  <span
                    className={`block h-full ${rank === 1 && w.count > 0 ? 'bg-gold' : 'bg-terra'} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
                    style={{ width: grown && top > 0 ? `${Math.round((w.count / top) * 100)}%` : 0 }}
                  />
                </span>
                {mine && gap > 0 && (
                  <p className="mt-1 ml-8 text-xs font-bold text-terra-deep">Kari {gap} bala maneh nyusul {TRAH_MAP[war[0].trah].short}!</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h3 className="font-display text-lg font-extrabold">Kutha paling rame</h3>
        <p className="text-xs text-ink-soft mb-2">Kutha sing paling akeh Jawir-e. Kuthamu durung mlebu? Ajak konco nancep.</p>
        {leaderboard.topCities.length === 0 ? (
          <p className="py-4 text-sm text-ink-soft">Durung ana kutha sing rame. Dadia sing kapisan.</p>
        ) : (
          <ol className="divide-y divide-amber-900/10">
            {leaderboard.topCities.map((c, i) => (
              <li key={c.name} className="flex items-baseline gap-2 py-2.5 text-sm">
                <span className="font-type text-ink-soft w-5">{i + 1}</span>
                <span className="font-semibold">{c.name}</span>
                <span className="leader" aria-hidden />
                <span className="font-type font-bold">{c.count} Jawir</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function CensusBar({ icon, label, desc, count, total }: { icon: string; label: string; desc?: string; count: number; total: number }) {
  const [open, setOpen] = useState(false);
  const [grown, setGrown] = useState(false);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <li>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={desc ? open : undefined}
        disabled={!desc}
        className="w-full text-left py-2 group disabled:cursor-default"
      >
        <span className="flex items-baseline gap-2 text-sm">
          <span aria-hidden>{icon}</span>
          <span className="font-semibold text-ink group-enabled:group-hover:text-terra-deep">{label}</span>
          <span className="leader" aria-hidden />
          <span className="font-type font-bold text-ink">{pct}%</span>
          <span className="font-type text-xs text-ink-soft w-14 text-right">{count} wong</span>
        </span>
        <span className="mt-1.5 block h-2.5 rounded-sm bg-amber-900/10 overflow-hidden">
          <span
            className="block h-full bg-terra transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: grown ? `${pct}%` : 0 }}
          />
        </span>
      </button>
      {open && desc && <p className="text-[13px] text-ink-soft pb-2 pl-6">{desc}</p>}
    </li>
  );
}

export default function LeaderboardModal({ isOpen, onClose, leaderboard, total, onSelectTag, userTrah }: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('war');

  if (!isOpen) return null;

  const pick = (t: JawirTagData) => {
    onSelectTag(t);
    onClose();
  };

  const lists: Record<BoardTab, JawirTagData[]> = {
    farthest: leaderboard?.topFarthest || [],
    closest: leaderboard?.topClosest || [],
    coffee: (leaderboard?.topCoffee || []).filter((t) => (t.coffeeCount || 0) > 0),
  };

  return (
    <Dossier title="Klasemen Sedulur" subtitle={`${total.toLocaleString('id-ID')} Jawir kacathet neng peta`} onClose={onClose}>
      <div role="tablist" aria-label="Golongan klasemen" className="flex gap-1.5 px-4 pt-1.5 border-b border-amber-900/15 overflow-x-auto overflow-y-hidden no-scrollbar">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(t.id)}
              className={`relative shrink-0 px-3 py-2.5 text-sm font-bold transition ${
                isActive
                  ? 'text-terra-deep font-extrabold'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <span>{t.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-terra rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="p-4 sm:p-5">
        {!leaderboard ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            Klasemene ngadat, lur. Tutup, terus bukak maneh.
          </p>
        ) : activeTab === 'war' ? (
          <WarPanel leaderboard={leaderboard} userTrah={userTrah} />
        ) : activeTab === 'census' ? (
          <div className="space-y-6">
            <section>
              <h3 className="font-display text-lg font-extrabold">Kasta tlatah</h3>
              <p className="text-xs text-ink-soft mb-2">Tutul barise kanggo ndeleng tegese.</p>
              <ul className="divide-y divide-amber-900/10">
                {Object.entries(REGION_BADGE_MAP).map(([key, info]) => (
                  <CensusBar key={key} icon={info.icon} label={info.label} desc={info.desc} count={leaderboard.regionStats[key] || 0} total={total} />
                ))}
              </ul>
            </section>
          </div>
        ) : lists[activeTab].length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            {activeTab === 'coffee'
              ? 'Durung ana sing dititipi kopi. Bukak pin sedulur, titipna kopi sing kapisan.'
              : 'Klasemene isih kosong melompong. Tancepke pinmu, dadi juara tanpa saingan.'}
          </p>
        ) : (
          <>
            <p className="text-[13px] text-ink-soft mb-4">{BOARDS[activeTab].intro}</p>
            <Podium
              items={lists[activeTab].slice(0, 3)}
              titles={BOARDS[activeTab].titles}
              metric={BOARDS[activeTab].metric}
              onPick={pick}
            />
            {lists[activeTab].length > 3 && (
              <ol start={4} className="mt-4 border-t border-amber-900/15">
                {lists[activeTab].slice(3).map((t, i) => (
                  <li key={t.id}>
                    <button
                      onClick={() => pick(t)}
                      className="w-full flex items-baseline gap-2 py-3 text-sm text-left hover:text-terra-deep"
                    >
                      <span className="font-type text-ink-soft w-5">{i + 4}</span>
                      <span className="font-semibold truncate max-w-[55%]">{t.nickname}</span>
                      <span className="leader" aria-hidden />
                      <span className="font-type font-bold">{BOARDS[activeTab].metric(t)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </Dossier>
  );
}
