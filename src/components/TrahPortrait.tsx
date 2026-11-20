import React from 'react';
import type { TrahType } from '@/lib/geo';

const INK = '#78350f';
const PAPER = '#efe2c6';

// Shared head-and-shoulders; each trah only swaps headwear and collar.
const HEAD_Y = 54;

const line = { fill: 'none', stroke: PAPER, strokeWidth: 1, strokeLinecap: 'round' as const };
const cloth = { fill: INK, fillOpacity: 0.85, stroke: INK, strokeWidth: 1, strokeLinejoin: 'round' as const };

function Headwear({ trah }: { trah: TrahType }) {
  switch (trah) {
    case 'mataraman':
      // Jogja blangkon: rounded crown plus the mondolan bun bulging at the back
      return (
        <g>
          <ellipse cx="59" cy="47" rx="5.5" ry="6.5" {...cloth} />
          <path d="M27 49 C26 34 33 30 42 30 C51 30 58 34 57 49 C50 44 34 44 27 49 Z" {...cloth} />
        </g>
      );
    case 'ngapak':
      // Banyumasan blangkon: flat top, no mondolan
      return <path d="M27 49 C26 40 29 36 34 35.5 L50 35.5 C55 36 58 40 57 49 C50 44 34 44 27 49 Z" {...cloth} />;
    case 'arekan':
      // udeng: head cloth band with a pointed knot at the front
      return (
        <g>
          <path d="M27 49 C26 38 32 34 42 34 C52 34 58 38 57 49 C50 44 34 44 27 49 Z" {...cloth} />
          <path d="M42 20 L49 35 L35 35 Z" {...cloth} />
          <path d="M42 25 L40 34 M45 29 L44 34" {...line} strokeWidth={0.8} />
        </g>
      );
    case 'pantura':
      // peci: tall flat-topped cap
      return (
        <g>
          <path d="M28 48 L29.5 30 L54.5 30 L56 48 C50 44.5 34 44.5 28 48 Z" {...cloth} />
          <path d="M31 37 L53 37" {...line} strokeWidth={0.8} />
        </g>
      );
    case 'rantau_lahir':
      // short modern cut
      return (
        <path
          d="M27.5 50 C24 33 33 31 42 31 C51 31 60 33 56.5 50 C55 43 50 40 42 40 C34 40 29 43 27.5 50 Z"
          {...cloth}
        />
      );
    default:
      return null;
  }
}

function Collar({ trah }: { trah: TrahType }) {
  switch (trah) {
    case 'mataraman':
      // beskap: stand-up neck band plus centre closure
      return (
        <g>
          <path d="M35 67 L35 80 L49 80 L49 67" {...cloth} fillOpacity={0.5} />
          <path d="M42 80 L42 106" {...line} />
          <circle cx="42" cy="88" r="1" fill={PAPER} />
          <circle cx="42" cy="96" r="1" fill={PAPER} />
        </g>
      );
    case 'ngapak':
      // lurik: thin vertical stripes across the shoulders
      return (
        <g>
          <path d="M34 78 Q42 86 50 78" {...line} />
          <path d="M14 92 L14 106 M20 88 L20 106 M26 84 L26 106 M58 84 L58 106 M64 88 L64 106 M70 92 L70 106" {...line} strokeWidth={0.8} />
        </g>
      );
    case 'arekan':
      // open collar
      return <path d="M31 77 L42 96 L53 77" {...line} />;
    case 'pantura':
      // koko: band collar with a short placket
      return (
        <g>
          <path d="M34.5 70 Q42 83 49.5 70" {...line} />
          <path d="M42 80 L42 94" {...line} />
          <circle cx="42" cy="86" r="1" fill={PAPER} />
          <circle cx="42" cy="92" r="1" fill={PAPER} />
        </g>
      );
    case 'rantau_lahir':
      // hoodie: hood behind the neck plus drawstrings
      return (
        <g>
          <path d="M24 84 C22 72 30 68 35 71 Q42 78 49 71 C54 68 62 72 60 84" {...line} />
          <path d="M33 78 Q42 90 51 78" {...line} />
          <path d="M38 85 L38 98 M46 85 L46 98" {...line} />
        </g>
      );
    default:
      // plain round collar
      return <path d="M34 77 Q42 89 50 77" {...line} />;
  }
}

export default function TrahPortrait({ trah, className, label }: { trah: TrahType; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 84 106"
      className={className ?? 'w-full h-full'}
      role="img"
      aria-label={label ?? `Pas foto ${trah}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* one group opacity so overlapping head, neck and shoulders do not stack darker */}
      <g opacity="0.55" fill={INK}>
        <path d="M5 106 C7 86 23 78 42 78 C61 78 77 86 79 106 Z" />
        <rect x="35" y="64" width="14" height="18" rx="3" />
        <circle cx="27.5" cy="56" r="3" />
        <circle cx="56.5" cy="56" r="3" />
        <ellipse cx="42" cy={HEAD_Y} rx="14.5" ry="17.5" />
      </g>
      <Collar trah={trah} />
      <Headwear trah={trah} />
    </svg>
  );
}
