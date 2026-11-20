'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, LogOut, RefreshCw } from 'lucide-react';
import { CATEGORY_MAP, TRAH_MAP, type TagCategory, type TrahType } from '@/lib/geo';
import { pinPath } from '@/lib/share';

interface AdminPin {
  id: string;
  jawirNumber: number;
  nickname: string;
  statusTag: string;
  category: TagCategory;
  trah: TrahType;
  distanceKm: number;
  coffeeCount: number;
  createdAt: string;
  hiddenAt: string | null;
  reportCount: number;
  reasons: Record<string, number>;
}

const REASON_LABEL: Record<string, string> = {
  saru: 'Saru / kasar',
  spam: 'Spam / judol',
  sara: 'SARA',
  pribadi: 'Data pribadi',
  liyane: 'Liyane',
};

type View = 'reported' | 'hidden' | 'all';
const VIEWS: { id: View; label: string }[] = [
  { id: 'reported', label: 'Dilaporke' },
  { id: 'hidden', label: 'Didhelikake' },
  { id: 'all', label: 'Kabeh' },
];

const fmt = (iso: string) => new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminPanel() {
  const [state, setState] = useState<'checking' | 'disabled' | 'login' | 'ready'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pins, setPins] = useState<AdminPin[]>([]);
  const [threshold, setThreshold] = useState(3);
  const [view, setView] = useState<View>('reported');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pins');
      if (res.status === 401) return setState('login');
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPins(data.data);
      setThreshold(data.threshold);
      setState('ready');
    } catch {
      setError('Data gagal dijupuk. Jajal maneh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/admin/session')
      .then(async (res) => {
        if (res.status === 404) return setState('disabled');
        const data = await res.json();
        if (data.admin) load();
        else setState('login');
      })
      .catch(() => setState('login'));
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.message || 'Gagal mlebu.');
    setPassword('');
    load();
  };

  const logout = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setPins([]);
    setState('login');
  };

  const act = async (pin: AdminPin, action: 'hide' | 'unhide' | 'delete') => {
    if (action === 'delete' && !window.confirm(`Busak pin "${pin.nickname}" salawase? Ora iso dibalekake.`)) return;
    setBusy(pin.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pins/${pin.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.status === 401) return setState('login');
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError('Aksine gagal. Jajal maneh.');
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(() => {
    if (view === 'reported') return pins.filter((p) => p.reportCount > 0);
    if (view === 'hidden') return pins.filter((p) => p.hiddenAt);
    return pins;
  }, [pins, view]);

  const counts = {
    reported: pins.filter((p) => p.reportCount > 0).length,
    hidden: pins.filter((p) => p.hiddenAt).length,
    all: pins.length,
  };

  if (state === 'checking') {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-parchment">
        <Loader2 className="w-6 h-6 animate-spin text-terra" />
      </main>
    );
  }

  if (state === 'disabled') {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-parchment p-6 text-center">
        <p className="max-w-sm text-ink-soft">
          Admin durung diaktifke. Isi <code className="font-type">ADMIN_PASSWORD</code> (paling ora 12 aksara) neng environment variables, terus deploy maneh.
        </p>
      </main>
    );
  }

  if (state === 'login') {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-parchment p-6">
        <form onSubmit={login} className="w-full max-w-sm space-y-4 rounded-lg border border-amber-900/20 bg-parchment-card p-6 shadow">
          <h1 className="font-display text-2xl font-extrabold">Admin Jawir Map</h1>
          {error && (
            <p role="alert" className="rounded border border-stamp/40 bg-[#fdecea] px-3 py-2 text-sm text-[#7f1d1d]">
              {error}
            </p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Sandi</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-amber-900/25 bg-white px-3 py-2.5 text-base focus:border-terra focus:outline-none focus:ring-2 focus:ring-terra/25"
            />
          </label>
          <button type="submit" className="h-11 w-full rounded bg-terra font-bold text-white hover:bg-terra-deep">
            Mlebu
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-y-auto bg-parchment text-ink">
      <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Admin Jawir Map</h1>
            <p className="text-sm text-ink-soft">
              Pin otomatis didhelikake sawise dilaporke {threshold} wong. &quot;Tampilke&quot; mbusak laporane.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="flex h-10 items-center gap-2 rounded border border-amber-900/25 bg-white px-3 text-sm font-bold hover:border-terra disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Anyari
            </button>
            <button onClick={logout} className="flex h-10 items-center gap-2 rounded border border-amber-900/25 bg-white px-3 text-sm font-bold hover:border-terra">
              <LogOut className="w-4 h-4" /> Metu
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="rounded border border-stamp/40 bg-[#fdecea] px-3 py-2 text-sm text-[#7f1d1d]">
            {error}
          </p>
        )}

        <div role="tablist" className="flex gap-1.5 border-b border-amber-900/15">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={`relative px-3 py-2.5 text-sm font-bold ${view === v.id ? 'text-terra-deep' : 'text-ink-soft hover:text-ink'}`}
            >
              {v.label} <span className="font-type">({counts[v.id]})</span>
              {view === v.id && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-terra" />}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="py-12 text-center text-ink-soft">Ora ana pin neng kene.</p>
        ) : (
          <ul className="space-y-3">
            {shown.map((p) => (
              <li key={p.id} className={`rounded-lg border bg-parchment-card p-4 ${p.hiddenAt ? 'border-stamp/40' : 'border-amber-900/20'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-type text-xs text-ink-soft">
                      No. {String(p.jawirNumber).padStart(4, '0')} · {fmt(p.createdAt)} · {TRAH_MAP[p.trah]?.short ?? p.trah} ·{' '}
                      {CATEGORY_MAP[p.category]?.label ?? p.category} · {p.distanceKm.toLocaleString('id-ID')} km · ☕ {p.coffeeCount}
                    </p>
                    <h2 className="font-display text-lg font-extrabold break-words">{p.nickname}</h2>
                    <p className="font-display text-[15px] break-words">&ldquo;{p.statusTag}&rdquo;</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                      {p.hiddenAt && <span className="rounded-sm bg-stamp px-2 py-0.5 text-white">Didhelikake {fmt(p.hiddenAt)}</span>}
                      {p.reportCount > 0 && (
                        <span className="rounded-sm border border-stamp/40 bg-[#fdecea] px-2 py-0.5 text-[#7f1d1d]">{p.reportCount} laporan</span>
                      )}
                      {Object.entries(p.reasons).map(([r, n]) => (
                        <span key={r} className="rounded-sm border border-[#d6c7b2] bg-[#f5f0e6] px-2 py-0.5">
                          {REASON_LABEL[r] ?? r} ×{n}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!p.hiddenAt && (
                      <a href={pinPath(p.id)} target="_blank" rel="noreferrer" className="flex h-10 items-center rounded border border-amber-900/25 bg-white px-3 text-sm font-bold hover:border-terra">
                        Deleng
                      </a>
                    )}
                    {p.hiddenAt ? (
                      <button disabled={busy === p.id} onClick={() => act(p, 'unhide')} className="h-10 rounded border border-moss/50 bg-white px-3 text-sm font-bold text-moss hover:bg-[#ecfdf5] disabled:opacity-60">
                        Tampilke
                      </button>
                    ) : (
                      <button disabled={busy === p.id} onClick={() => act(p, 'hide')} className="h-10 rounded border border-amber-900/25 bg-white px-3 text-sm font-bold hover:border-terra disabled:opacity-60">
                        Dhelikake
                      </button>
                    )}
                    <button disabled={busy === p.id} onClick={() => act(p, 'delete')} className="h-10 rounded bg-stamp px-3 text-sm font-bold text-white hover:bg-[#991b1b] disabled:opacity-60">
                      Busak
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
