'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Download, Share2, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { JawirTagData } from './TagModal';
import Dossier from './Dossier';
import TrahPortrait from './TrahPortrait';
import { REGION_BADGE_MAP, TRAH_MAP, NPC_PINS, RegionStatusType, TrahType, type NpcPin } from '@/lib/geo';
import { pinShareUrl, challengeText } from '@/lib/share';
import { readVisa, VISA_TOTAL } from '@/lib/visa';

interface JawirIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: JawirTagData | null;
  isNewCreation?: boolean;
  note?: string | null;
  // Resolves to an error message, or null once the pin is deleted.
  onDelete?: () => Promise<string | null>;
  // Flies to a legend site from an empty visa slot.
  onVisitNpc?: (npc: NpcPin) => void;
}

// Kaca Visa: one slot per Situs Legendha, stamped once it has been sowan-ed from this browser.
function VisaPage({ onVisitNpc }: { onVisitNpc?: (npc: NpcPin) => void }) {
  const [visa, setVisa] = useState<string[]>([]);
  useEffect(() => setVisa(readVisa()), []);
  const done = visa.length >= VISA_TOTAL;

  return (
    <section aria-label="Kaca visa" className="rounded-md border border-dashed border-[#78350f]/40 bg-[#fbf3e2] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-base font-extrabold text-ink">Kaca Visa</h3>
        <span className={`font-type text-sm font-bold ${done ? 'text-moss' : 'text-terra-deep'}`}>
          Cap visa {visa.length}/{VISA_TOTAL}
        </span>
      </div>
      <p className="text-xs text-ink-soft mt-0.5">
        {done ? 'Kabeh juru kunci wis disowani. Paspormu lengkap, lur!' : 'Sowan menyang Situs Legendha neng peta kanggo ngumpulke cap.'}
      </p>
      <ul className="mt-2.5 grid grid-cols-4 gap-2">
        {NPC_PINS.map((npc) => {
          const stamped = visa.includes(npc.id);
          return (
            <li key={npc.id}>
              <button
                type="button"
                onClick={() => !stamped && onVisitNpc?.(npc)}
                disabled={stamped || !onVisitNpc}
                aria-label={stamped ? `${npc.title}: wis disowani` : `${npc.title}: durung disowani, tutul kanggo mabur mrana`}
                title={stamped ? `${npc.title}: wis disowani` : `${npc.title}: durung disowani, tutul kanggo mabur mrana`}
                className={`w-full aspect-square rounded-full flex flex-col items-center justify-center text-center transition ${
                  stamped
                    ? 'border-[3px] border-stamp text-stamp rotate-[-12deg] opacity-85 mix-blend-multiply'
                    : 'border-2 border-dashed border-ink/25 text-ink-soft hover:border-terra hover:text-terra-deep'
                }`}
              >
                <span className={`text-xl leading-none ${stamped ? '' : 'grayscale opacity-40'}`} aria-hidden>
                  {npc.glyph}
                </span>
                <span className="font-type text-[8px] font-bold leading-tight mt-0.5">{stamped ? 'DISOWANI' : 'DURUNG'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DeletePin({ onDelete }: { onDelete: () => Promise<string | null> }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setStep('busy');
    setError(null);
    const message = await onDelete();
    if (message) {
      setError(message);
      setStep('confirm');
    }
  };

  if (step === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStep('confirm')}
        className="min-h-11 -ml-1 px-1 text-sm text-ink-soft underline underline-offset-4 decoration-ink/30 hover:text-stamp hover:decoration-stamp"
      >
        Busak pinku
      </button>
    );
  }

  return (
    <div className="rounded border border-stamp/40 bg-[#fdecea] p-3 space-y-2.5" role="group" aria-label="Busak pin">
      <p className="text-sm text-[#7f1d1d]">
        Pin, paspor, lan kabeh kopi sing wis mlebu bakal ilang salawase. Nomer Jawirmu ora iso dibalekake.
      </p>
      {error && (
        <p className="text-sm font-bold text-[#7f1d1d]" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setStep('idle');
            setError(null);
          }}
          disabled={step === 'busy'}
          className="h-11 px-4 rounded border border-amber-900/25 bg-white text-sm font-bold text-ink hover:border-amber-900/50 transition disabled:opacity-60"
        >
          Ora sida
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={step === 'busy'}
          className="flex-1 h-11 px-4 rounded bg-stamp hover:bg-[#991b1b] text-white text-sm font-bold transition disabled:opacity-60"
        >
          {step === 'busy' ? 'Lagi mbusak…' : 'Iya, busak pinku'}
        </button>
      </div>
    </div>
  );
}

const MRZ_LEN = 44;

// MRZ band backdrop: three overlapping sine waves, drawn once at module load.
const GUILLOCHE = [
  { amp: 14, per: 38, ph: 0 },
  { amp: 11, per: 26, ph: 1.7 },
  { amp: 8, per: 17, ph: 3.1 },
].map(({ amp, per, ph }) => {
  let d = '';
  for (let x = 0; x <= 420; x += 4) {
    d += `${x ? 'L' : 'M'}${x} ${(35 + amp * Math.sin((x / per) * Math.PI + ph)).toFixed(1)} `;
  }
  return d;
});
const MICROTEXT = 'ZONA WACAN MESIN · PAGUYUBAN JAWIR SEDONYA · '.repeat(4);

// ICAO 9303 check digit (weights 7-3-1), so the MRZ reads like a real passport strip.
function mrzCheck(s: string): number {
  const val = (c: string) => (c === '<' ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);
  return s.split('').reduce((sum, c, i) => sum + val(c) * [7, 3, 1][i % 3], 0) % 10;
}

function buildMrz(tag: JawirTagData): [string, string] {
  const words = tag.nickname.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const name = (words.length > 1 ? `${words[0]}<<${words.slice(1).join('<')}` : words[0] || 'JAWIR').slice(0, 30);
  const km = String(Math.min(tag.distanceKm, 999999)).padStart(6, '0');
  const line1 = `P<JWR${name}`.padEnd(MRZ_LEN - km.length, '<') + km;

  const doc = `JWR${String(tag.jawirNumber || 1).padStart(6, '0')}`;
  const issued = new Date(tag.createdAt);
  const yymmdd = Number.isNaN(issued.getTime())
    ? '000000'
    : issued.toISOString().slice(2, 10).replace(/-/g, '');
  const body = `${doc}${mrzCheck(doc)}IDN${yymmdd}${mrzCheck(yymmdd)}<LAWU<TITIK<NOL`;
  const line2 = body.padEnd(MRZ_LEN - 1, '<') + mrzCheck(body);
  return [line1, line2];
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[10px] leading-none text-[#78350f]">{label}</dt>
      <dd className="font-type text-[13px] font-bold text-ink leading-tight mt-0.5 break-words">{children}</dd>
    </div>
  );
}

export default function JawirIdCardModal({ isOpen, onClose, tag, isNewCreation = false, note, onDelete, onVisitNpc }: JawirIdCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !isNewCreation) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Fire as the stamp lands, in the card's own ink colors.
    const t = setTimeout(() => {
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.65 },
        // Dossier shell is z-[1000]; the default canvas z-index (100) plays behind its overlay.
        zIndex: 1100,
        colors: ['#c2410c', '#d97706', '#047857', '#b91c1c', '#f5f0e6'],
        disableForReducedMotion: true,
      });
    }, 650);
    return () => clearTimeout(t);
  }, [isOpen, isNewCreation]);

  if (!isOpen || !tag) return null;

  const trahInfo = TRAH_MAP[tag.trah as TrahType] || TRAH_MAP.mataraman;
  const regBadge = REGION_BADGE_MAP[tag.regionStatus as RegionStatusType] || REGION_BADGE_MAP.kandang;
  const [mrz1, mrz2] = buildMrz(tag);
  const regNo = `JWR-${String(tag.jawirNumber || 1).padStart(6, '0')}`;
  const issued = new Date(tag.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    setDownloadError(false);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: '#f5f0e6' });
      const link = document.createElement('a');
      link.download = `Paspor-Jawir-${tag.nickname.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download card:', err);
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = pinShareUrl(tag.id);
    const dare = challengeText(tag, trahInfo.short);
    const text = `${dare} ${shareUrl}`;
    if (navigator.share) {
      try {
        // The share sheet adds the url itself, so it is left out of the text here.
        await navigator.share({ title: `Paspor Jawir ${tag.nickname}`, text: dare, url: shareUrl });
        return;
      } catch {
        // user cancelled or share unsupported for this payload; fall back to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // clipboard blocked; nothing else to try
    }
  };

  return (
    <Dossier
      title={isNewCreation ? 'Paspor Panjenengan sampun medal' : 'Paspor Jawirku'}
      subtitle="Simpen kertune, pamerke neng Story. Ben kanca-kancamu iri."
      onClose={onClose}
      maxWidth="sm:max-w-[460px]"
    >
      <div className="p-4 sm:p-5 space-y-4">
        {/* Everything inside cardRef is what lands in the PNG */}
        <div ref={cardRef} className="bg-parchment-deep p-2.5 rounded-lg">
          <article className="relative overflow-hidden rounded-md bg-[#fbf3e2] border border-[#78350f]/40 text-ink">
            <div className="kawung absolute inset-0 opacity-[0.09]" aria-hidden />

            <header className="relative flex items-end justify-between gap-2 px-3.5 pt-3 pb-2 bg-terra-deep text-[#fbf3e2]">
              <div className="leading-none">
                <p className="text-[10px] tracking-wide">Paguyuban Jawir Sedonya</p>
                <p className="font-display text-[19px] font-extrabold mt-1">Paspor Diplomatik</p>
              </div>
              <p className="font-type text-[11px] text-right leading-tight">
                P · JWR
                <br />
                {regNo}
              </p>
            </header>

            <div className="relative">
            <div className="relative flex gap-3 px-3.5 pt-3">
              <figure className="shrink-0 w-[84px]">
                <div className="h-[106px] rounded-sm border border-[#78350f]/50 bg-[#efe2c6] overflow-hidden">
                  <TrahPortrait trah={tag.trah as TrahType} label={`Pas foto ${trahInfo.label}`} />
                </div>
                <figcaption className="text-[10px] text-center text-[#78350f] mt-1 leading-tight">
                  {trahInfo.label}
                </figcaption>
              </figure>

              <dl className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-2 content-start">
                <Field label="Asma samaran" className="col-span-2">
                  <span className="font-display text-[17px] font-extrabold leading-tight">{tag.nickname}</span>
                </Field>
                <Field label="Kasta tlatah" className="col-span-2">
                  {regBadge.icon} {regBadge.label}
                </Field>
                <Field label="Tebihipun saking Titik 0">{tag.distanceKm.toLocaleString('id-ID')} km</Field>
                <Field label="Tanggal medal">{issued}</Field>
                <Field label="Lumampah ngantos">Salaminipun gesang</Field>
                <Field label="Bangsa">Jawir</Field>
              </dl>
            </div>

            <blockquote className="relative mx-3.5 mt-2.5 pr-[92px] font-display text-[14px] leading-snug border-t border-dashed border-[#78350f]/35 pt-2">
              &ldquo;{tag.statusTag}&rdquo;
            </blockquote>

            <div
              className={`absolute z-10 right-2.5 -bottom-1 w-[104px] h-[104px] rounded-full border-[3px] border-stamp text-stamp flex flex-col items-center justify-center text-center rotate-[-14deg] opacity-85 mix-blend-multiply pointer-events-none ${
                isNewCreation ? 'stamp-press' : ''
              }`}
              aria-label="Cap: kasahaken dening Juru Kunci Gunung Lawu"
            >
              <div className="absolute inset-[5px] rounded-full border border-stamp" />
              <span className="text-[8px] font-bold leading-tight">KASAHAKEN DENING</span>
              <span className="font-display text-[14px] font-extrabold leading-none my-0.5">JURU KUNCI</span>
              <span className="text-[8px] font-bold leading-tight">GUNUNG LAWU</span>
              <span className="font-type text-[9px] mt-1">3.265 mdpl</span>
            </div>

            </div>

            <footer
              className="relative mt-3 px-3.5 py-1.5 bg-[#f3e6cb] border-t border-[#78350f]/40 overflow-hidden"
              aria-label="Kode MRZ paspor"
            >
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 420 70"
                preserveAspectRatio="none"
                fill="none"
                stroke="#78350f"
                strokeWidth="0.8"
                opacity="0.12"
                aria-hidden
              >
                {GUILLOCHE.map((d, i) => (
                  <path key={i} d={d} vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              <span className="sr-only">
                {mrz1} {mrz2}
              </span>
              <svg
                className="relative block w-full h-auto"
                viewBox="0 0 420 50"
                fontFamily="var(--font-type)"
                aria-hidden
              >
                <text x="0" y="6" fontSize="5" fill="#78350f" fillOpacity="0.5" textLength="420" lengthAdjust="spacing">
                  {MICROTEXT}
                </text>
                {[mrz1, mrz2].map((line, i) => (
                  <text
                    key={i}
                    x="0"
                    y={26 + i * 18}
                    fontSize="13"
                    fontWeight="700"
                    fill="#1c1917"
                    xmlSpace="preserve"
                    textLength="420"
                    lengthAdjust="spacing"
                  >
                    {line}
                  </text>
                ))}
              </svg>
            </footer>
          </article>
        </div>

        <p className="flex items-baseline gap-2 text-sm">
          <span aria-hidden>☕</span>
          <span className="text-ink-soft">Kopi saka sedulur</span>
          <span className="leader" aria-hidden />
          <b className="font-type text-terra-deep">{tag.coffeeCount || 0}</b>
        </p>

        {tag.hidden && (
          <p role="status" className="rounded border border-stamp/40 bg-[#fdecea] px-3 py-2.5 text-sm text-[#7f1d1d]">
            Pinmu lagi didhelikake saka peta amarga dilaporke sawetara sedulur. Admin bakal mriksa. Yen ana sing salah, busak terus pasang maneh.
          </p>
        )}

        <VisaPage onVisitNpc={onVisitNpc} />

        {note && (
          <p className="text-sm text-ink" role="status">
            {note}
          </p>
        )}

        {downloadError && (
          <p className="text-sm text-stamp" role="alert">
            Waduh, gambare gagal dicithak. Jajal maneh, utawa screenshot wae, lur.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 h-12 px-4 rounded bg-terra hover:bg-terra-deep text-white text-sm font-bold transition disabled:opacity-60"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isDownloading ? 'Lagi nyithak paspor…' : 'Simpen PNG kanggo Story'}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 h-12 px-4 rounded border border-amber-900/25 text-ink text-sm font-bold hover:bg-parchment-deep transition"
          >
            {isCopied ? <Check className="w-4 h-4 text-moss" /> : <Share2 className="w-4 h-4 text-ink-soft" />}
            <span>{isCopied ? 'Wis disalin' : 'Kirimke'}</span>
          </button>
        </div>

        {/* Keyed by pin so a confirm left open never carries over to another passport */}
        {onDelete && !isNewCreation && <DeletePin key={tag.id} onDelete={onDelete} />}
      </div>
    </Dossier>
  );
}
