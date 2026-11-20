'use client';

import React from 'react';
import { Search } from 'lucide-react';
import Dossier from './Dossier';
import type { JawirTagData } from './TagModal';
import { CATEGORY_MAP, REGION_BADGE_MAP, TRAH_MAP, type RegionStatusType, type TagCategory, type TrahType } from '@/lib/geo';
import { EMPTY_FILTER, activeFilterCount, matchesFilter, type PinFilter } from '@/lib/pinFilter';
import { useLang } from '@/lib/i18n';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: JawirTagData[];
  filter: PinFilter;
  onChange: (f: PinFilter) => void;
  onPick: (tag: JawirTagData) => void;
}

const MAX_RESULTS = 8;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 min-h-10 px-2.5 rounded border text-sm transition ${
        on ? 'border-terra bg-[#fbeee4] font-bold text-ink' : 'border-amber-900/15 bg-white text-ink hover:border-amber-900/35'
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterModal({ isOpen, onClose, tags, filter, onChange, onPick }: FilterModalProps) {
  const { t } = useLang();
  if (!isOpen) return null;

  const matching = tags.filter((tag) => matchesFilter(tag, filter));
  const showResults = filter.query.trim().length > 0;
  const active = activeFilterCount(filter);

  return (
    <Dossier title={t('Golek lan Saring')} subtitle={t('Golek sedulur miturut jeneng, utawa saring peta miturut trah lan golongan.')} onClose={onClose}>
      <div className="p-4 sm:p-5 space-y-5">
        <div>
          <label htmlFor="jawir-search" className="block text-sm font-bold text-ink mb-1.5">
            {t('Golek jeneng utawa semboyan')}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft" aria-hidden />
            <input
              id="jawir-search"
              type="search"
              autoComplete="off"
              placeholder={t('Contone: Budi, Toronto, sego pecel')}
              value={filter.query}
              onChange={(e) => onChange({ ...filter, query: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 rounded border border-amber-900/25 bg-white text-base text-ink placeholder:text-[#8a817a] focus:outline-none focus:ring-2 focus:border-terra focus:ring-terra/25"
            />
          </div>
          {showResults && (
            <ul className="mt-2 divide-y divide-amber-900/10 rounded border border-amber-900/15 bg-white" aria-label={t('Asil golek')}>
              {matching.length === 0 ? (
                <li className="px-3 py-3 text-sm text-ink-soft">{t('Ora ketemu, lur. Jajal tembung liyane.')}</li>
              ) : (
                matching.slice(0, MAX_RESULTS).map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(tag);
                        onClose();
                      }}
                      className="w-full flex items-baseline gap-2 px-3 py-2.5 text-left text-sm hover:bg-parchment-deep"
                    >
                      <span aria-hidden>{CATEGORY_MAP[tag.category]?.icon}</span>
                      <span className="font-semibold truncate">{tag.nickname}</span>
                      <span className="leader" aria-hidden />
                      <span className="font-type text-xs text-terra-deep shrink-0">{tag.distanceKm.toLocaleString('id-ID')} km</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <fieldset>
          <legend className="block text-sm font-bold text-ink mb-1.5">{t('Trah')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(TRAH_MAP) as TrahType[]).map((k) => (
              <Chip key={k} on={filter.trahs.includes(k)} onClick={() => onChange({ ...filter, trahs: toggle(filter.trahs, k) })}>
                <span aria-hidden>{TRAH_MAP[k].icon}</span> {t(TRAH_MAP[k].short)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-sm font-bold text-ink mb-1.5">{t('Lagi ngapa')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CATEGORY_MAP) as TagCategory[]).map((k) => (
              <Chip key={k} on={filter.categories.includes(k)} onClick={() => onChange({ ...filter, categories: toggle(filter.categories, k) })}>
                <span aria-hidden>{CATEGORY_MAP[k].icon}</span> {t(CATEGORY_MAP[k].label)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-sm font-bold text-ink mb-1.5">{t('Kasta tlatah')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(REGION_BADGE_MAP) as RegionStatusType[]).map((k) => (
              <Chip key={k} on={filter.regions.includes(k)} onClick={() => onChange({ ...filter, regions: toggle(filter.regions, k) })}>
                <span aria-hidden>{REGION_BADGE_MAP[k].icon}</span> {t(REGION_BADGE_MAP[k].label)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            disabled={active === 0}
            className="h-12 px-4 rounded border border-amber-900/25 bg-white text-sm font-bold text-ink hover:border-amber-900/50 disabled:opacity-50"
          >
            {t('Reset')}
          </button>
          <button type="button" onClick={onClose} className="flex-1 h-12 px-4 rounded bg-terra hover:bg-terra-deep text-white text-sm font-bold">
            {t('Tampilke {n} pin neng peta', { n: matching.length })}
          </button>
        </div>
      </div>
    </Dossier>
  );
}
