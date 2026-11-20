'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DossierProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

// Shared dialog shell: bottom sheet on phones, centered document on desktop, Escape closes.
export default function Dossier({ title, subtitle, onClose, maxWidth = 'sm:max-w-lg', children }: DossierProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center sm:p-4 bg-[#1c1917]/55"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} max-h-[92dvh] flex flex-col bg-parchment-card text-ink border border-amber-900/20 rounded-t-xl sm:rounded-lg shadow-2xl overflow-hidden`}
      >
        <header className="flex items-start justify-between gap-3 pl-5 pr-2 pt-4 pb-3 border-b border-amber-900/15 shrink-0">
          <div className="min-w-0 pt-1">
            <h2 className="font-display text-xl font-extrabold leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-ink-soft mt-1">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Tutup"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-md text-ink-soft hover:text-ink hover:bg-parchment-deep transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}
