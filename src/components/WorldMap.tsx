'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  LAWU_CENTER,
  CATEGORY_MAP,
  REGION_BADGE_MAP,
  TRAH_MAP,
  NPC_PINS,
  NpcPin,
  greatCirclePath,
  TagCategory,
  RegionStatusType,
  TrahType,
} from '@/lib/geo';
import { JawirTagData } from './TagModal';
import { pinShareUrl } from '@/lib/share';
import { readVisa, addVisa, VISA_TOTAL } from '@/lib/visa';
import { useLang } from '@/lib/i18n';

type TFn = ReturnType<typeof useLang>['t'];

interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  tagId?: string;
}

export type CoffeeResult = 'sent' | 'already' | 'own' | 'limited' | 'error';
export type ReportOutcome = { ok: boolean; hidden: boolean; message: string };

export interface PickCenter {
  lat: number;
  lng: number;
  zoom: number;
}

interface WorldMapProps {
  tags: JawirTagData[];
  userTagId?: string | null;
  flyToTarget: FlyToTarget | null;
  isPickingLocation: boolean;
  pickStart: { lat: number; lng: number } | null;
  onPickCenter: (center: PickCenter) => void;
  onOpenLore: () => void;
  onAddCoffee: (tagId: string) => Promise<CoffeeResult>;
  onReportPin: (tagId: string, reason: string) => Promise<ReportOutcome>;
  selectedTagForLine: JawirTagData | null;
  onSelectTagForLine: (tag: JawirTagData | null) => void;
}

const THREAD = '#b91c1c';

// Room kept free for the floating header (top) and action bar (bottom) when a popup is panned into view.
const POPUP_SAFE_TOP = 84;
const POPUP_SAFE_BOTTOM = 96;

const TOPO_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const WORLD_BOUNDS: L.LatLngBoundsLiteral = [
  [-85, -180],
  [85, 180],
];
// Esri answers uncovered tiles with this exact "Map data not yet available" JPEG.
const PLACEHOLDER_BYTES = 2521;
const MAX_OVERZOOM = 6;
const TILE_CACHE_MAX = 300;
const tileCache = new Map<string, Promise<ImageBitmap | null>>();

function loadTile(url: string): Promise<ImageBitmap | null> {
  let hit = tileCache.get(url);
  if (!hit) {
    hit = fetch(url)
      .then(async (res) => {
        if (!res.ok) return null;
        const blob = await res.blob();
        return blob.size === PLACEHOLDER_BYTES ? null : createImageBitmap(blob);
      })
      .catch(() => {
        tileCache.delete(url);
        return null;
      });
    tileCache.set(url, hit);
    if (tileCache.size > TILE_CACHE_MAX) tileCache.delete(tileCache.keys().next().value as string);
  }
  return hit;
}

// Warms tileCache (shared promises, so duplicates never refetch) with the tiles a viewport centred on `center` needs at `zoom`.
function prefetchTiles(map: L.Map, center: L.LatLng, zoom: number, limit: number) {
  const { x: w, y: h } = map.getSize();
  const c = map.project(center, zoom);
  const max = 2 ** zoom - 1;
  const cx = c.x / 256;
  const cy = c.y / 256;
  const spots: { x: number; y: number; d: number }[] = [];
  for (let x = Math.floor((c.x - w / 2) / 256) - 1; x <= Math.floor((c.x + w / 2) / 256) + 1; x++) {
    for (let y = Math.floor((c.y - h / 2) / 256) - 1; y <= Math.floor((c.y + h / 2) / 256) + 1; y++) {
      if (x >= 0 && y >= 0 && x <= max && y <= max) spots.push({ x, y, d: (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 });
    }
  }
  // Closest to the centre first, so the cap trims the margin and not the middle of the screen.
  spots.sort((a, b) => a.d - b.d).slice(0, limit).forEach((s) => loadTile(L.Util.template(TOPO_URL, { z: zoom, x: s.x, y: s.y })));
}

// Draws the tile itself, or the matching sub-square of the nearest real ancestor when Esri has no data this deep.
async function paintTile(coords: L.Coords, tile: HTMLCanvasElement, size: number): Promise<boolean> {
  const ctx = tile.getContext('2d');
  if (!ctx) return false;
  const own = await loadTile(L.Util.template(TOPO_URL, { z: coords.z, x: coords.x, y: coords.y }));
  if (own) {
    ctx.drawImage(own, 0, 0, size, size);
    return true;
  }
  // Ancestors load in parallel, nearest one that has real data wins.
  const ks = Array.from({ length: Math.min(MAX_OVERZOOM, coords.z) }, (_, i) => i + 1);
  const imgs = await Promise.all(ks.map((k) => loadTile(L.Util.template(TOPO_URL, { z: coords.z - k, x: coords.x >> k, y: coords.y >> k }))));
  const i = imgs.findIndex(Boolean);
  if (i < 0) return false;
  const k = ks[i];
  const part = size / 2 ** k;
  ctx.drawImage(imgs[i] as ImageBitmap, (coords.x - ((coords.x >> k) << k)) * part, (coords.y - ((coords.y >> k) << k)) * part, part, part, 0, 0, size, size);
  return true;
}

class TopoTileLayer extends L.TileLayer {
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const size = this.getTileSize().x;
    const tile = document.createElement('canvas');
    tile.width = tile.height = size;
    // Leaflet's _abortLoading drops old-zoom tiles unless `complete` is set, which a canvas lacks.
    const flagged = tile as HTMLCanvasElement & { complete?: boolean };
    flagged.complete = false;
    paintTile(coords, tile, size).then((ok) => {
      flagged.complete = true;
      done(ok ? undefined : new Error('tile unavailable'), tile);
    });
    return tile;
  }

  // Keep the previous zoom level on screen until the new one has painted; stock pruning only keeps 5 levels of parents, so a long dive left blank tiles.
  _pruneTiles() {
    const self = this as unknown as { _tiles: Record<string, { current: boolean; active?: boolean }> };
    if (Object.values(self._tiles).some((t) => t.current && !t.active)) return;
    (L.TileLayer.prototype as unknown as { _pruneTiles(): void })._pruneTiles.call(this);
  }
}

function TopoLayer() {
  const map = useMap();
  useEffect(() => {
    const layer = new TopoTileLayer(TOPO_URL, {
      attribution: 'Tiles &copy; Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS',
      maxZoom: 18,
      noWrap: true,
      keepBuffer: 4,
      // Request tiles only once the zoom settles; the prefetch in MapController has them ready by then.
      updateWhenZooming: false,
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map]);
  return null;
}

// Keeps the single world at least as large as the viewport so no grey band or second copy shows.
function MinZoomController() {
  const map = useMap();
  useEffect(() => {
    const crs = L.CRS.EPSG3857;
    const worldH = crs.latLngToPoint(L.latLng(-85, 0), 0).y - crs.latLngToPoint(L.latLng(85, 0), 0).y;
    const fit = () => {
      const { x, y } = map.getSize();
      map.setMinZoom(Math.max(2, Math.ceil(Math.log2(x / 256)), Math.ceil(Math.log2(y / worldH))));
    };
    fit();
    map.on('resize', fit);
    return () => {
      map.off('resize', fit);
    };
  }, [map]);
  return null;
}

function createLawuIcon(label: string) {
  return L.divIcon({
    className: 'lawu-div-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <svg width="44" height="34" viewBox="0 0 44 34" aria-hidden="true">
          <path d="M2 32 L17 8 L22 14 L27 6 L42 32 Z" fill="#9a3412" stroke="#fffdf8" stroke-width="2" stroke-linejoin="round"/>
          <path d="M23.5 11.5 L27 6 L30.5 11.5 L28.5 13 L27 11.5 L25 13.5 Z" fill="#fffdf8"/>
        </svg>
        <span style="margin-top:2px;background:#fffdf8;border:1px solid #9a3412;color:#7c2d12;font:700 10px/1 var(--font-type),monospace;padding:3px 5px;border-radius:2px;white-space:nowrap;">${label}</span>
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 32],
    popupAnchor: [0, -30],
  });
}

function createPinIcon(category: TagCategory, isUserTag: boolean, userLabel: string) {
  const cat = CATEGORY_MAP[category] || CATEGORY_MAP.eksis;
  const ring = isUserTag ? '#047857' : cat.pinHex;
  const label = isUserTag ? userLabel : '';

  return L.divIcon({
    className: 'jawir-div-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        ${
          label
            ? `<span style="position:absolute;top:-20px;white-space:nowrap;background:#047857;color:#fffdf8;font:700 10px/1 var(--font-type),monospace;padding:3px 5px;border-radius:2px;">${label}</span>`
            : ''
        }
        <div style="width:32px;height:32px;border-radius:9999px;background:#fffdf8;border:2.5px solid ${ring};box-shadow:0 2px 6px rgba(67,48,30,0.25);display:flex;align-items:center;justify-content:center;font-size:15px;">
          ${cat.icon}
        </div>
        <div style="width:2.5px;height:8px;background:${ring};"></div>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -40],
  });
}

// Situs Keramat: gold octagon seal with a ribbon below, deliberately unlike the round white people pins and the Lawu mountain.
function createLegendIcon(npc: NpcPin, label: string) {
  return L.divIcon({
    className: 'legend-div-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="legend-seal" style="position:relative;width:40px;height:40px;">
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
            <polygon points="12,1 28,1 39,12 39,28 28,39 12,39 1,28 1,12" fill="#d97706" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
            <polygon points="13,6 27,6 34,13 34,27 27,34 13,34 6,27 6,13" fill="#fef3c7" stroke="#b45309" stroke-width="1.5" stroke-linejoin="round"/>
          </svg>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:17px;line-height:1;">${npc.glyph}</span>
        </div>
        <span style="margin-top:3px;background:#b45309;color:#fffdf8;font:700 9px/1 var(--font-type),monospace;letter-spacing:.04em;padding:3px 5px;border-radius:2px;white-space:nowrap;">${label}</span>
      </div>
    `,
    iconSize: [64, 58],
    iconAnchor: [32, 20],
    popupAnchor: [0, -22],
  });
}

function formatRelativeTime(dateStr: string, t: TFn): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (!Number.isFinite(diffMin) || diffMin < 1) return t('lagi wae');
  if (diffMin < 60) return t('{n} menit kepungkur', { n: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('{n} jam kepungkur', { n: diffHour });
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return t('{n} dina kepungkur', { n: diffDay });
  return new Date(dateStr).toLocaleDateString('id-ID');
}

// Great-circle route; when it crosses the antimeridian a second copy is drawn so both ends meet their markers.
function flightPath(tag: JawirTagData): [number, number][][] {
  const pts = greatCirclePath(tag, LAWU_CENTER);
  const offset = Math.round((pts[pts.length - 1][1] - LAWU_CENTER.lng) / 360) * 360;
  return offset === 0 ? [pts] : [pts, pts.map(([la, ln]) => [la, ln - offset] as [number, number])];
}

function CoffeeButton({ tag, onAddCoffee }: { tag: JawirTagData; onAddCoffee: WorldMapProps['onAddCoffee'] }) {
  const { t } = useLang();
  const [puffs, setPuffs] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    const result = await onAddCoffee(tag.id);
    setBusy(false);
    if (result === 'sent') {
      const id = Date.now();
      setPuffs((p) => [...p, id]);
      setTimeout(() => setPuffs((p) => p.filter((x) => x !== id)), 1300);
      setNote(t('Kopi wis dikirim, isih kemebul. Matur nuwun, lur.'));
    } else if (result === 'already') {
      setNote(t('Kowe wis tau ngirim kopi. Siji wae, ojo boros, lur.'));
    } else if (result === 'own') {
      setNote(t('Iki titikmu dhewe, lur. Kopine kanggo sedulur liya wae.'));
    } else if (result === 'limited') {
      setNote(t('Kopine entek, lur. Ngaso sedhela, mengko jajal maneh.'));
    } else {
      setNote(t('Kopine kesenggol, tumpah. Jajal maneh.'));
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="relative w-full flex items-center justify-center gap-2 h-11 px-3 rounded bg-ink hover:bg-black text-parchment text-sm font-bold transition disabled:opacity-60"
      >
        <span className="relative inline-block" aria-hidden>
          ☕
          {puffs.map((id) =>
            [-6, 0, 6].map((drift, i) => (
              <span
                key={`${id}-${i}`}
                className="steam"
                style={{ left: `${4 + i * 3}px`, animationDelay: `${i * 0.12}s`, ['--drift' as string]: `${drift}px` }}
              />
            ))
          )}
        </span>
        <span>{t('Titip kopi')}</span>
        <span className="font-type font-normal text-parchment/80">({tag.coffeeCount || 0})</span>
      </button>
      <p className="text-xs text-ink-soft mt-1.5 min-h-[1rem]" aria-live="polite">
        {note}
      </p>
    </div>
  );
}

function ShareButton({ tagId }: { tagId: string }) {
  const { t } = useLang();
  const [note, setNote] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(pinShareUrl(tagId));
      setNote(t('Link wis disalin'));
    } catch {
      setNote(t('Link gagal disalin. Salin saka bar alamat.'));
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 -mt-3">
      <button
        type="button"
        onClick={handleClick}
        className="min-h-11 -ml-1 px-1 text-sm font-bold text-ink underline underline-offset-4 decoration-ink/40 hover:decoration-ink"
      >
        {t('Bagikan')}
      </button>
      <p className="text-xs text-ink-soft text-right" aria-live="polite">
        {note}
      </p>
    </div>
  );
}

const REPORT_REASONS: { id: string; label: string }[] = [
  { id: 'saru', label: 'Saru / kasar' },
  { id: 'spam', label: 'Spam / judol' },
  { id: 'sara', label: 'SARA' },
  { id: 'pribadi', label: 'Data pribadi' },
  { id: 'liyane', label: 'Liyane' },
];

const reportedKey = (id: string) => `jawir_reported_${id}`;

// "Laporke": pick a reason, send once. Enough reports from different browsers hide the pin until an admin checks it.
function ReportButton({ tagId, onReport }: { tagId: string; onReport: WorldMapProps['onReportPin'] }) {
  const { t, tm } = useLang();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(reportedKey(tagId))) setDone(true);
    } catch {
      // storage blocked
    }
  }, [tagId]);

  const send = async (reason: string) => {
    setBusy(true);
    const r = await onReport(tagId, reason);
    setBusy(false);
    setNote(r.message);
    if (r.ok || /wis tau/.test(r.message)) {
      setDone(true);
      setOpen(false);
      try {
        localStorage.setItem(reportedKey(tagId), '1');
      } catch {
        // storage blocked
      }
    }
  };

  if (done) {
    return <p className="text-xs text-ink-soft" aria-live="polite">{note ? tm(note) : t('Kowe wis nglaporke pin iki.')}</p>;
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="min-h-11 -mr-1 px-1 text-sm text-ink-soft underline underline-offset-4 decoration-ink/30 hover:text-stamp hover:decoration-stamp"
        >
          {t('Laporke')}
        </button>
      ) : (
        <div className="rounded border border-stamp/30 bg-[#fdf3f2] p-2.5 space-y-2" role="group" aria-label={t('Laporke pin iki')}>
          <p className="text-xs font-bold text-[#7f1d1d]">{t('Apa sing salah karo pin iki?')}</p>
          <div className="flex flex-wrap gap-1.5">
            {REPORT_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  send(r.id);
                }}
                className="min-h-9 px-2.5 rounded border border-stamp/30 bg-white text-xs font-bold text-ink hover:border-stamp disabled:opacity-60"
              >
                {t(r.label)}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#7f1d1d]" aria-live="polite">{note ? tm(note) : null}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="min-h-9 px-1 text-xs text-ink-soft underline underline-offset-2"
            >
              {t('Batal')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SowanButton({ npc }: { npc: NpcPin }) {
  const { t } = useLang();
  const [state, setState] = useState<'idle' | 'stamping' | 'done'>('idle');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const visa = readVisa();
    setCount(visa.length);
    if (visa.includes(npc.id)) setState('done');
  }, [npc.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCount(addVisa(npc.id).length);
    setState('stamping');
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        {state === 'idle' ? (
          <>
            <button
              type="button"
              onClick={handleClick}
              className="w-full h-11 rounded border border-ink/30 bg-white hover:bg-parchment-deep text-ink text-sm font-bold transition"
            >
              {t('Sowan')}
            </button>
            <p className="text-xs text-ink-soft mt-1.5">
              {t('{hint} · koleksimu {count}/{total}', { hint: t(npc.unlockHint), count, total: VISA_TOTAL })}
            </p>
          </>
        ) : (
          <div aria-live="polite">
            <p className="text-sm font-bold text-moss">{t('Wis disowani ✓')}</p>
            <p className="text-xs text-ink-soft mt-0.5">
              {count >= VISA_TOTAL
                ? t('Cap visa {count}/{total}. Paspormu wis lengkap, lur!', { count, total: VISA_TOTAL })
                : t('Cap visa {count}/{total}. Golek juru kunci liyane neng peta.', { count, total: VISA_TOTAL })}
            </p>
          </div>
        )}
      </div>
      {state !== 'idle' && (
        <div
          className={`relative shrink-0 w-[76px] h-[76px] rounded-full border-[3px] border-stamp text-stamp flex flex-col items-center justify-center text-center rotate-[-14deg] opacity-85 mix-blend-multiply pointer-events-none ${
            state === 'stamping' ? 'stamp-press' : ''
          }`}
          aria-label={t('Cap visa {title}', { title: t(npc.title) })}
        >
          <div className="absolute inset-[4px] rounded-full border border-stamp" />
          <span className="text-[8px] font-bold leading-tight">{t('CAP VISA')}</span>
          <span className="text-[18px] leading-none my-0.5">{npc.glyph}</span>
          <span className="font-type text-[8px] leading-tight">{t('DISOWANI')}</span>
        </div>
      )}
    </div>
  );
}

function LegendPopupBody({ npc }: { npc: NpcPin }) {
  const { t } = useLang();
  return (
    <div className="p-2.5 w-[290px] sm:w-[320px] box-border">
      <div className="border-2 border-dashed border-gold-deep/70 rounded-sm bg-parchment-card p-3 space-y-3">
        <div className="pr-6">
          <p className="font-type text-xs font-bold text-gold-deep">{t('SITUS LEGENDHA · {glyph}', { glyph: npc.glyph })}</p>
          <h4 className="font-display text-lg font-extrabold leading-tight text-ink break-words">{t(npc.title)}</h4>
          <p className="font-type text-xs text-ink-soft">{t('Juru kunci: {name}', { name: t(npc.nickname) })}</p>
        </div>

        <blockquote className="font-display text-[15px] leading-snug text-ink border-l-2 border-gold-deep/40 pl-3 break-words">
          {t(npc.lore)}
        </blockquote>

        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-ink-soft">{t('Adohe saka Lawu')}</span>
          <span className="leader" aria-hidden />
          <b className="font-type text-terra-deep">{npc.distanceKm.toLocaleString('id-ID')} km</b>
        </div>

        <SowanButton npc={npc} />
        <ShareButton tagId={npc.id} />
      </div>
    </div>
  );
}

// Pick mode: the needle stays at the screen centre, so the map centre is the picked point.
function PickController({
  active,
  start,
  onCenter,
  onLifted,
}: {
  active: boolean;
  start: { lat: number; lng: number } | null;
  onCenter: (center: PickCenter) => void;
  onLifted: (lifted: boolean) => void;
}) {
  const map = useMap();
  const latest = useRef({ start, onCenter, onLifted });
  latest.current = { start, onCenter, onLifted };

  useEffect(() => {
    if (!active) return;
    const report = () => {
      const c = map.getCenter();
      latest.current.onCenter({ lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)), zoom: map.getZoom() });
    };
    const lift = () => latest.current.onLifted(true);
    const drop = () => {
      latest.current.onLifted(false);
      report();
    };

    map.closePopup();
    map.on('movestart', lift);
    map.on('moveend', drop);

    const { start: from } = latest.current;
    if (from) {
      map.flyTo([from.lat, from.lng], 15, { duration: 1 });
      latest.current.onCenter({ ...from, zoom: map.getZoom() });
    } else {
      if (map.getZoom() < 12) map.flyTo(map.getCenter(), 12, { duration: 1 });
      report();
    }

    return () => {
      map.off('movestart', lift);
      map.off('moveend', drop);
      latest.current.onLifted(false);
    };
  }, [active, map]);

  return null;
}

function PickNeedle({ lifted }: { lifted: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[800] h-0 w-0" aria-hidden>
      <span
        className={`absolute left-0 top-0 block rounded-full bg-ink/40 transition-all duration-150 motion-reduce:transition-none ${
          lifted ? 'h-2 w-5 opacity-60' : 'h-1 w-3 opacity-90'
        }`}
        style={{ transform: 'translate(-50%, -50%)' }}
      />
      <span
        className="absolute left-0 top-0 flex flex-col items-center transition-transform duration-150 motion-reduce:transition-none"
        style={{ transform: `translate(-50%, calc(-100% ${lifted ? '- 8px' : '+ 0px'}))` }}
      >
        <span className="block h-[22px] w-[22px] rounded-full border-[3px] border-parchment-card bg-terra shadow-[0_2px_8px_rgba(0,0,0,0.3)]" />
        <span className="block h-3 w-[3px] bg-ink" />
      </span>
    </div>
  );
}

function MapController({
  flyToTarget,
  isPickingLocation,
  onSelectTagForLine,
  markerRefs,
  lawuRef,
}: {
  flyToTarget: FlyToTarget | null;
  isPickingLocation: boolean;
  onSelectTagForLine: (tag: JawirTagData | null) => void;
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
  lawuRef: React.MutableRefObject<L.Marker | null>;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      if (isPickingLocation) {
        map.panTo(e.latlng);
      } else {
        onSelectTagForLine(null);
      }
    },
  });

  useEffect(() => {
    // Leaflet auto-pans a popup before React has rendered its content, then skips the second pan once the content
    // grows, so tall popups ended up under the header. Pan again after the content has painted, top edge first.
    const onOpen = (e: L.PopupEvent) => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = e.popup.getElement();
          if (!el || !map.hasLayer(e.popup)) return;
          const box = map.getContainer().getBoundingClientRect();
          const r = el.getBoundingClientRect();
          const top = r.top - box.top;
          const bottomGap = box.bottom - r.bottom;
          let dy = 0;
          if (top < POPUP_SAFE_TOP) dy = top - POPUP_SAFE_TOP;
          else if (bottomGap < POPUP_SAFE_BOTTOM) dy = Math.min(POPUP_SAFE_BOTTOM - bottomGap, top - POPUP_SAFE_TOP);
          if (dy) map.panBy([0, dy], { animate: true, duration: 0.25 });
        })
      );
    };
    map.on('popupopen', onOpen);
    return () => {
      map.off('popupopen', onOpen);
    };
  }, [map]);

  useEffect(() => {
    // Leaflet scales the SVG overlay with CSS while zooming, which turns the dotted route into blobs, so hide it until the zoom settles.
    const el = map.getContainer();
    const hide = () => el.classList.add('map-zooming');
    const show = () => el.classList.remove('map-zooming');
    map.on('zoomstart', hide);
    map.on('zoomend', show);
    return () => {
      map.off('zoomstart', hide);
      map.off('zoomend', show);
      show();
    };
  }, [map]);

  useEffect(() => {
    if (!flyToTarget) return;

    const target = flyToTarget.zoom || 14;
    const delta = Math.abs(target - map.getZoom());
    const dest = L.latLng(flyToTarget.lat, flyToTarget.lng);
    // ~60 requests in total: 40 at the target zoom, 10 each at two coarser levels that are still deeper than now.
    prefetchTiles(map, dest, target, 40);
    [target - 3, target - 6].forEach((z) => z > map.getZoom() && prefetchTiles(map, dest, z, 10));
    // Long dives get at least 1.8s so the prefetch can land before the flight ends.
    map.flyTo(dest, target, { duration: Math.min(2.2, Math.max(delta >= 8 ? 1.8 : 0, 1.5 + Math.max(0, delta - 4) * 0.1)) });

    const id = flyToTarget.tagId;
    if (id) {
      // The cluster layer mounts markers in chunks after the move settles, so the target may not be on the map yet.
      // Re-read the ref and retry for up to ~2 s instead of opening once and silently failing.
      const markerFor = () => (id === 'lawu' ? lawuRef.current : markerRefs.current[id]);
      let t: ReturnType<typeof setTimeout>;
      const tryOpen = (left: number) => {
        const marker = markerFor();
        if (marker && map.hasLayer(marker)) marker.openPopup();
        else if (left > 0) t = setTimeout(() => tryOpen(left - 1), 120);
      };
      const open = () => {
        t = setTimeout(() => tryOpen(16), 150);
      };
      map.once('moveend', open);
      return () => {
        map.off('moveend', open);
        clearTimeout(t);
      };
    }
  }, [flyToTarget, map, markerRefs, lawuRef]);

  return null;
}

export default function WorldMap({
  tags,
  userTagId,
  flyToTarget,
  isPickingLocation,
  pickStart,
  onPickCenter,
  onOpenLore,
  onAddCoffee,
  onReportPin,
  selectedTagForLine,
  onSelectTagForLine,
}: WorldMapProps) {
  const { t } = useLang();
  const [needleLifted, setNeedleLifted] = useState(false);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const lawuRef = useRef<L.Marker | null>(null);
  // Tracks the selection synchronously: opening pin B closes pin A's popup, and that late 'remove' must not clear B's line.
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedTagForLine?.id ?? null;
  const clearIfSelected = (id: string) => {
    if (selectedIdRef.current === id) onSelectTagForLine(null);
  };
  const selectPin = (tag: JawirTagData) => {
    selectedIdRef.current = tag.id;
    onSelectTagForLine(tag);
  };

  return (
    <div className={`relative w-full h-full ${isPickingLocation ? 'map-picking' : ''}`}>
      <MapContainer
        center={[LAWU_CENTER.lat, LAWU_CENTER.lng]}
        zoom={6}
        minZoom={2}
        maxZoom={18}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={1}
        worldCopyJump={false}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapController
          flyToTarget={flyToTarget}
          isPickingLocation={isPickingLocation}
          onSelectTagForLine={onSelectTagForLine}
          markerRefs={markerRefs}
          lawuRef={lawuRef}
        />

        <PickController active={isPickingLocation} start={pickStart} onCenter={onPickCenter} onLifted={setNeedleLifted} />
        <MinZoomController />
        <TopoLayer />

        {/* Red thread of destiny: the great-circle route a plane would fly home to Lawu */}
        {selectedTagForLine && (
          <Polyline
            positions={flightPath(selectedTagForLine)}
            pathOptions={{ color: THREAD, weight: 2.5, dashArray: '1 7', lineCap: 'round', opacity: 0.95 }}
            eventHandlers={{
              click: (e) => {
                if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                onSelectTagForLine(null);
              },
            }}
          >
            <Tooltip permanent direction="center" className="flight-tag">
              {t('✈ {km} km menyang Lawu', { km: selectedTagForLine.distanceKm.toLocaleString('id-ID') })}
            </Tooltip>
          </Polyline>
        )}

        <Marker
          position={[LAWU_CENTER.lat, LAWU_CENTER.lng]}
          icon={createLawuIcon(t('TITIK 0'))}
          zIndexOffset={1000}
          ref={(ref) => {
            lawuRef.current = ref;
          }}
          eventHandlers={{
            click: (e) => {
              if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
              onSelectTagForLine(null);
            },
          }}
        >
          <Popup className="jawir-map-popup" eventHandlers={{ remove: () => onSelectTagForLine(null) }}>
            <div className="p-4 pr-10 w-[290px] sm:w-[320px] space-y-3 box-border">
              <div>
                <p className="font-type text-xs text-terra-deep">0 km · {LAWU_CENTER.elevation}</p>
                <h3 className="font-display text-lg font-extrabold leading-tight text-ink">{t(LAWU_CENTER.name)}</h3>
                <p className="font-type text-xs text-ink-soft">
                  {LAWU_CENTER.lat}, {LAWU_CENTER.lng}
                </p>
              </div>
              <p className="text-[13px] text-ink leading-relaxed">{t(LAWU_CENTER.lore)}</p>
              <button
                type="button"
                onClick={onOpenLore}
                className="w-full h-11 rounded bg-terra hover:bg-terra-deep text-white text-sm font-bold transition"
              >
                {t('Waosen filosofi Titik 0')}
              </button>
            </div>
          </Popup>
        </Marker>

        <MarkerClusterGroup chunkedLoading maxClusterRadius={45} spiderfyOnMaxZoom={true}>
          {tags.map((tag) => {
            const isUserTag = tag.id === userTagId;
            const cat = CATEGORY_MAP[tag.category] || CATEGORY_MAP.eksis;
            const regBadge =
              REGION_BADGE_MAP[tag.regionStatus as RegionStatusType] || REGION_BADGE_MAP.internasional;
            const trahInfo = tag.trah ? TRAH_MAP[tag.trah as TrahType] : null;

            return (
              <Marker
                key={tag.id}
                position={[tag.lat, tag.lng]}
                icon={createPinIcon(tag.category, isUserTag, t('TITIKKU'))}
                ref={(ref) => {
                  markerRefs.current[tag.id] = ref;
                }}
                eventHandlers={{
                  click: (e) => {
                    if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                    selectPin(tag);
                  },
                }}
              >
                <Popup className="jawir-map-popup" eventHandlers={{ add: () => selectPin(tag), remove: () => clearIfSelected(tag.id) }}>
                  <div className="p-4 w-[290px] sm:w-[320px] space-y-3 box-border">
                    <div className="pr-8">
                      <p className="font-type text-xs text-ink-soft">
                        {tag.jawirNumber ? `No. ${String(tag.jawirNumber).padStart(4, '0')} · ` : ''}
                        {formatRelativeTime(tag.createdAt, t)}
                        {isUserTag && <b className="text-moss"> · {t('titikmu')}</b>}
                      </p>
                      <h4 className="font-display text-lg font-extrabold leading-tight text-ink break-words">
                        {tag.nickname}
                      </h4>
                    </div>

                    <ul className="flex flex-wrap gap-1.5 text-xs font-semibold">
                      {[`${cat.icon} ${t(cat.label)}`, trahInfo && `${trahInfo.icon} ${t(trahInfo.label)}`, `${regBadge.icon} ${t(regBadge.label)}`]
                        .filter(Boolean)
                        .map((chip) => (
                          <li key={chip as string} className={`px-2 py-0.5 rounded-sm border ${cat.badgeClass}`}>
                            {chip}
                          </li>
                        ))}
                    </ul>

                    <blockquote className="font-display text-[15px] leading-snug text-ink border-l-2 border-amber-900/25 pl-3 break-words">
                      &ldquo;{tag.statusTag}&rdquo;
                    </blockquote>

                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-ink-soft">{t('Adohe saka Lawu')}</span>
                      <span className="leader" aria-hidden />
                      <b className="font-type text-terra-deep">{tag.distanceKm.toLocaleString('id-ID')} km</b>
                    </div>

                    {isUserTag ? (
                      <p className="font-type text-sm text-ink-soft">{t('☕ {count} kopi saka sedulur', { count: tag.coffeeCount || 0 })}</p>
                    ) : (
                      <CoffeeButton tag={tag} onAddCoffee={onAddCoffee} />
                    )}
                    <ShareButton tagId={tag.id} />
                    {!isUserTag && <ReportButton tagId={tag.id} onReport={onReportPin} />}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
        {/* Situs Keramat stay outside the cluster group so they never merge into a count */}
        {NPC_PINS.map((npc) => {
          const npcTitle = t('Situs Legendha: {title}', { title: t(npc.title) });
          return (
            <Marker
              key={npc.id}
              position={[npc.lat, npc.lng]}
              icon={createLegendIcon(npc, t('LEGENDHA'))}
              zIndexOffset={500}
              title={npcTitle}
              ref={(ref) => {
                markerRefs.current[npc.id] = ref;
                // react-leaflet sets `title` only on creation; keep it in step when the language changes.
                if (ref) {
                  ref.options.title = npcTitle;
                  ref.getElement()?.setAttribute('title', npcTitle);
                }
              }}
              eventHandlers={{
                click: (e) => {
                  if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                  selectPin(npc);
                },
              }}
            >
              <Popup className="jawir-map-popup" eventHandlers={{ add: () => selectPin(npc), remove: () => clearIfSelected(npc.id) }}>
                <LegendPopupBody npc={npc} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {isPickingLocation && <PickNeedle lifted={needleLifted} />}
    </div>
  );
}
