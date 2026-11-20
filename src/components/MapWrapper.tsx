'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Mountain } from 'lucide-react';
import { JawirTagData } from './TagModal';
import type { PickCenter } from './WorldMap';

interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
  tagId?: string;
}

interface MapWrapperProps {
  tags: JawirTagData[];
  userTagId?: string | null;
  flyToTarget: FlyToTarget | null;
  isPickingLocation: boolean;
  pickStart: { lat: number; lng: number } | null;
  onPickCenter: (center: PickCenter) => void;
  onOpenLore: () => void;
  onAddCoffee: (tagId: string) => Promise<'sent' | 'already' | 'own' | 'error'>;
  selectedTagForLine: JawirTagData | null;
  onSelectTagForLine: (tag: JawirTagData | null) => void;
}

const DynamicWorldMap = dynamic(() => import('./WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#efe7d8] text-ink gap-2">
      <Mountain className="w-8 h-8 text-terra animate-pulse" />
      <p className="font-display text-lg font-extrabold">Sabar lur, petane lagi digelar…</p>
      <p className="text-xs text-ink-soft">Pin-pin sedulur lagi dikumpulke</p>
    </div>
  ),
});

export default function MapWrapper(props: MapWrapperProps) {
  return <DynamicWorldMap {...props} />;
}
