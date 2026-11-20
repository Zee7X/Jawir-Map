'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import Dossier from './Dossier';
import { getFingerprintId } from '@/lib/fingerprint';
import { isCleanText } from '@/lib/filter';
import {
  calculateDistanceFromLawu,
  detectRegionStatus,
  REGION_BADGE_MAP,
  CATEGORY_MAP,
  TRAH_MAP,
  TagCategory,
  TrahType,
} from '@/lib/geo';

export interface JawirTagData {
  id: string;
  jawirNumber?: number;
  nickname: string;
  statusTag: string;
  category: TagCategory;
  trah?: TrahType;
  regionStatus: string;
  lat: number;
  lng: number;
  distanceKm: number;
  coffeeCount?: number;
  createdAt: string;
  isNpc?: boolean;
}

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickedCoords: { lat: number; lng: number } | null;
  onStartPickOnMap: (from: { lat: number; lng: number } | null) => void;
  onTagCreated: (tag: JawirTagData) => void;
  onExistingTag: (tag: JawirTagData, message?: string) => void;
}

export default function TagModal({
  isOpen,
  onClose,
  pickedCoords,
  onStartPickOnMap,
  onTagCreated,
  onExistingTag,
}: TagModalProps) {
  const [nickname, setNickname] = useState('');
  const [statusTag, setStatusTag] = useState('');
  const [category, setCategory] = useState<TagCategory>('pejuang_rupiah');
  const [trah, setTrah] = useState<TrahType>('mataraman');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [isGettingGps, setIsGettingGps] = useState(false);
  const [fingerprintId, setFingerprintId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getFingerprintId()
      .then((visitorId) => {
        if (isMounted) {
          setFingerprintId(visitorId);
        }
      })
      .catch((err) => {
        console.error('Failed to get fingerprint:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // One id per time the form is opened, sent with every submit from it. The server uses it as the pin id,
  // so a double tap or retry cannot create a second pin whose owner cookie gets overwritten.
  const submissionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isOpen) submissionIdRef.current = null;
  }, [isOpen]);

  // Live content check, debounced; empty fields stay quiet (length rules run on submit).
  const [nickError, setNickError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNickError(nickname.trim() ? isCleanText(nickname).reason ?? null : null);
    }, 250);
    return () => clearTimeout(timer);
  }, [nickname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatusError(statusTag.trim() ? isCleanText(statusTag).reason ?? null : null);
    }, 250);
    return () => clearTimeout(timer);
  }, [statusTag]);

  useEffect(() => {
    if (pickedCoords) {
      setCoords(pickedCoords);
    }
  }, [pickedCoords]);

  if (!isOpen) return null;

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Browsermu ora iso GPS-an, lur. Pilih neng peta wae.');
      return;
    }

    setIsGettingGps(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setErrorMsg('Satelite bingung golek kosanmu. Pilih titike neng peta wae, lur.');
        setIsGettingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const previewDistance = coords ? calculateDistanceFromLawu(coords.lat, coords.lng) : null;
  const previewRegionStatus = coords ? detectRegionStatus(coords.lat, coords.lng) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nickname.trim() || nickname.trim().length < 2 || nickname.trim().length > 40) {
      setErrorMsg('Jenengmu kependeken utawa kedawan. 2 nganti 40 aksara wae, lur.');
      return;
    }

    if (!statusTag.trim() || statusTag.trim().length < 3 || statusTag.trim().length > 120) {
      setErrorMsg('Semboyane 3 nganti 120 aksara. Ojo kaya nulis skripsi.');
      return;
    }

    const nickCheck = isCleanText(nickname);
    const statusCheck = isCleanText(statusTag);
    setNickError(nickCheck.reason ?? null);
    setStatusError(statusCheck.reason ?? null);
    if (!nickCheck.clean || !statusCheck.clean) return;

    if (!coords) {
      setErrorMsg('Titikmu durung ono, lur. Nganggo GPS utawa tutul peta dhisik.');
      return;
    }

    if (!fingerprintId) {
      setErrorMsg('Sedhela, pirantimu lagi dicap. Jajal kirim maneh.');
      return;
    }

    setIsSubmitting(true);
    // randomUUID needs a secure context (https or localhost); without it the server picks the id.
    submissionIdRef.current ??= typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          statusTag: statusTag.trim(),
          category,
          trah,
          lat: coords.lat,
          lng: coords.lng,
          fingerprintId,
          submissionId: submissionIdRef.current ?? undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.existingTag) {
          localStorage.setItem('jawir_my_tag', JSON.stringify(data.existingTag));
          onExistingTag(
            data.existingTag,
            data.message || 'Woi, jatahmu mung sepisan salawase urip! Ojo srakah kaya pejabat.'
          );
          return;
        }
        throw new Error(data.message || 'Pine mencelat, gagal disimpen. Jajal maneh.');
      }

      if (data.success && data.data) {
        localStorage.setItem('jawir_my_tag', JSON.stringify(data.data));
        onTagCreated(data.data);
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Waduh, ana sing ora beres. Jajal maneh, lur.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const LABEL = 'block text-sm font-bold text-ink mb-1.5';
  const INPUT = (bad: boolean) =>
    `w-full px-3 py-2.5 rounded border bg-white text-ink placeholder:text-[#8a817a] text-base focus:outline-none focus:ring-2 ${
      bad ? 'border-stamp focus:border-stamp focus:ring-stamp/25' : 'border-amber-900/25 focus:border-terra focus:ring-terra/25'
    }`;
  const OPTION = (on: boolean) =>
    `flex items-center gap-2 px-2.5 py-2 min-h-11 rounded border text-left text-sm transition ${
      on ? 'border-terra bg-[#fbeee4] text-ink font-bold' : 'border-amber-900/15 bg-white text-ink hover:border-amber-900/35'
    }`;

  return (
    <Dossier title="Blangko Pendhaftaran Sedulur" subtitle="Siji piranti, siji pin, salawase urip. Ojo ngapusi." onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5" noValidate>
        {errorMsg && (
          <p role="alert" className="px-3 py-2.5 rounded border border-stamp/40 bg-[#fdecea] text-sm text-[#7f1d1d]">
            {errorMsg}
          </p>
        )}

        <div>
          <label htmlFor="jawir-nick" className={LABEL}>Jeneng celukan</label>
          <input
            id="jawir-nick"
            type="text"
            required
            maxLength={40}
            placeholder="Jeneng sing arep dicithak neng paspor"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            aria-invalid={!!nickError}
            aria-describedby={nickError ? 'jawir-nick-err' : undefined}
            className={INPUT(!!nickError)}
          />
          {nickError && (
            <p id="jawir-nick-err" role="alert" className="mt-1.5 text-sm text-[#7f1d1d]">{nickError}</p>
          )}
        </div>

        <fieldset>
          <legend className={LABEL}>Trah asal</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(Object.keys(TRAH_MAP) as TrahType[]).map((tKey) => (
              <button key={tKey} type="button" aria-pressed={trah === tKey} onClick={() => setTrah(tKey)} title={TRAH_MAP[tKey].desc} className={OPTION(trah === tKey)}>
                <span aria-hidden>{TRAH_MAP[tKey].icon}</span>
                <span className="leading-tight">{TRAH_MAP[tKey].label}</span>
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-2 text-xs text-ink-soft">
            <span aria-hidden>{TRAH_MAP[trah].icon}</span> {TRAH_MAP[trah].label}: {TRAH_MAP[trah].desc}
          </p>
        </fieldset>

        <fieldset>
          <legend className={LABEL}>Saiki lagi ngapa?</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(CATEGORY_MAP) as TagCategory[]).map((catKey) => (
              <button key={catKey} type="button" aria-pressed={category === catKey} onClick={() => setCategory(catKey)} className={OPTION(category === catKey)}>
                <span aria-hidden>{CATEGORY_MAP[catKey].icon}</span>
                <span className="leading-tight">{CATEGORY_MAP[catKey].label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="jawir-status" className={LABEL}>Semboyan neng paspor</label>
            <span className={`font-type text-xs ${statusTag.length > 110 ? 'text-terra-deep font-bold' : 'text-ink-soft'}`}>
              {statusTag.length}/120
            </span>
          </div>
          <textarea
            id="jawir-status"
            required
            rows={2}
            maxLength={120}
            placeholder="Salam utawa kabarmu kanggo sedulur rantau"
            value={statusTag}
            onChange={(e) => setStatusTag(e.target.value)}
            aria-invalid={!!statusError}
            aria-describedby={statusError ? 'jawir-status-err' : undefined}
            className={`${INPUT(!!statusError)} resize-none font-display`}
          />
          {statusError && (
            <p id="jawir-status-err" role="alert" className="mt-1.5 text-sm text-[#7f1d1d]">{statusError}</p>
          )}
        </div>

        <fieldset>
          <legend className={LABEL}>Titik panggonan</legend>
          <div className="flex flex-col sm:flex-row gap-1.5">
            <button
              type="button"
              onClick={handleGetGps}
              disabled={isGettingGps}
              className="flex-1 flex items-center justify-center gap-2 min-h-11 px-3 rounded border border-amber-900/25 bg-white text-sm font-bold text-ink hover:border-terra transition disabled:opacity-60"
            >
              {isGettingGps ? <Loader2 className="w-4 h-4 animate-spin text-terra" /> : <Navigation className="w-4 h-4 text-moss" />}
              <span>{isGettingGps ? 'Satelit lagi nggoleki kosanmu…' : 'Nganggo GPS'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onStartPickOnMap(coords);
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-2 min-h-11 px-3 rounded border border-amber-900/25 bg-white text-sm font-bold text-ink hover:border-terra transition"
            >
              <MapPin className="w-4 h-4 text-terra" />
              <span>Pilih neng peta</span>
            </button>
          </div>

          {coords && previewDistance !== null && previewRegionStatus ? (
            <div className="mt-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-type font-bold text-ink">
                  <span aria-hidden>{REGION_BADGE_MAP[previewRegionStatus].icon}</span>{' '}
                  {REGION_BADGE_MAP[previewRegionStatus].label} · {previewDistance.toLocaleString('id-ID')} km saka Lawu
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onStartPickOnMap(coords);
                    onClose();
                  }}
                  className="min-h-11 shrink-0 px-1 text-sm font-bold text-ink underline underline-offset-4 decoration-ink/40 hover:decoration-ink"
                >
                  Ganti titik
                </button>
              </div>
              <p className="font-type text-xs text-ink-soft">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
              {previewRegionStatus === 'kandang' && (
                <p className="text-xs font-bold text-ink pt-1">🏠 Isih neng kandang dhewe.</p>
              )}
              <p className="text-xs text-ink-soft pt-1">Titikmu digeser acak sawetara atus meter, dadi ibu kos ora iso nglacak kowe.</p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-soft">Durung ana titik. GPS-an utawa tutul langsung neng peta.</p>
          )}
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitting || !coords || !!nickError || !!statusError}
          className="w-full flex items-center justify-center gap-2 h-12 px-4 rounded bg-terra hover:bg-terra-deep text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{isSubmitting ? 'Lagi nyithak paspor…' : 'Tancepke pin lan terbitke paspor'}</span>
        </button>
      </form>
    </Dossier>
  );
}
