import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { findShareableTag } from '@/lib/tagStore';
import { NPC_PINS, REGION_BADGE_MAP, TRAH_MAP, type RegionStatusType, type TrahType } from '@/lib/geo';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const SIZE = { width: 1200, height: 630 };
const INK = '#292524';
const INK_SOFT = '#57534e';
const TERRA = '#c2410c';
const TERRA_DEEP = '#9a3412';
const PAPER = '#fbf3e2';
const HOST = SITE_URL.replace(/^https?:\/\//, '');

// Google Fonts returns a TTF (which Satori can read) when asked without a browser user agent. `text` subsets it to the glyphs used.
async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    return res.ok ? res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function loadLogo(origin: string): Promise<string | null> {
  try {
    const res = await fetch(new URL('/logo.png', origin));
    if (!res.ok) return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

function Mountain({ width }: { width: number }) {
  return (
    <svg width={width} height={(width * 34) / 44} viewBox="0 0 44 34">
      <path d="M2 32 L17 8 L22 14 L27 6 L42 32 Z" fill={TERRA_DEEP} stroke="#fffdf8" strokeWidth="2" strokeLinejoin="round" />
      <path d="M23.5 11.5 L27 6 L30.5 11.5 L28.5 13 L27 11.5 L25 13.5 Z" fill="#fffdf8" />
    </svg>
  );
}

function Frame({ children, logo }: { children: React.ReactNode; logo: string | null }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#efe2c6', padding: 28 }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: PAPER,
          border: `2px solid rgba(120,53,15,0.45)`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: TERRA_DEEP, color: PAPER, padding: '18px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            {logo && <img src={logo} width={52} height={52} style={{ borderRadius: 8 }} />}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'Fraunces', fontSize: 34, lineHeight: 1 }}>{SITE_NAME}</span>
              <span style={{ fontSize: 18, marginTop: 6, opacity: 0.85 }}>{SITE_TAGLINE}</span>
            </div>
          </div>
          <span style={{ fontFamily: 'Courier Prime', fontSize: 22 }}>{HOST}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', padding: '32px 40px' }}>{children}</div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('tag');
  const tag = id ? await findShareableTag(id).catch(() => null) : null;
  const npc = tag ? NPC_PINS.find((n) => n.id === tag.id) : undefined;

  const nickname = tag ? (npc ? npc.title : tag.nickname) : '';
  const quote = tag ? `“${tag.statusTag}”` : '';
  const km = tag ? `${tag.distanceKm.toLocaleString('id-ID')} km` : '';
  const region = tag ? REGION_BADGE_MAP[tag.regionStatus as RegionStatusType] : null;
  const trah = tag?.trah ? TRAH_MAP[tag.trah as TrahType] : null;
  const docNo = tag && !npc ? `No. ${String(tag.jawirNumber || 0).padStart(4, '0')}` : 'SITUS LEGENDHA';

  const chips = [region && `${region.label}`, !npc && trah && `${trah.label}`].filter(Boolean).join('');
  const intro = 'Tancepke siji titikmu neng bumi, jupuk Paspor Jawir, lan itung adohmu saka Titik 0 Pucak Gunung Lawu.';
  // Each font is subset to exactly the text drawn with it.
  const displayText = `${SITE_NAME}${SITE_TAGLINE}${nickname}`;
  const typeText = `${HOST}${km}${docNo}Paspor Diplomatik Jawir · `;
  // The body font also covers the display and typewriter text, so a failed Fraunces or Courier load never shows tofu.
  const bodyText = `${SITE_TAGLINE}${quote}${chips}${intro}Tancepke pinmu, lur!saka Titik 0 Pucak Gunung Lawu${displayText}${typeText}`;
  const [body400, fraunces, courier, logo] = await Promise.all([
    loadGoogleFont('Noto Sans', 400, bodyText),
    loadGoogleFont('Fraunces', 800, displayText),
    loadGoogleFont('Courier Prime', 700, typeText),
    loadLogo(request.nextUrl.origin),
  ]);
  // Custom fonts replace the built-in one, so without the body font fall back to the default set entirely.
  const fonts = body400
    ? [
        { name: 'Noto Sans', data: body400, weight: 400 as const, style: 'normal' as const },
        ...(fraunces ? [{ name: 'Fraunces', data: fraunces, weight: 800 as const, style: 'normal' as const }] : []),
        ...(courier ? [{ name: 'Courier Prime', data: courier, weight: 700 as const, style: 'normal' as const }] : []),
      ]
    : undefined;

  const body = tag ? (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: INK }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: 'Courier Prime', fontSize: 24, color: TERRA_DEEP }}>
          {npc ? `${npc.glyph} ${docNo}` : `Paspor Diplomatik Jawir · ${docNo}`}
        </span>
        <span
          style={{
            fontFamily: 'Fraunces',
            fontSize: nickname.length > 24 ? 60 : 78,
            lineHeight: 1.05,
            marginTop: 10,
          }}
        >
          {nickname}
        </span>
        <span style={{ fontSize: 30, lineHeight: 1.35, marginTop: 18, color: INK_SOFT, maxWidth: 1000 }}>{quote}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 22 }}>
            {[region && `${region.icon} ${region.label}`, !npc && trah && `${trah.icon} ${trah.label}`]
              .filter(Boolean)
              .map((chip) => (
                <span
                  key={chip as string}
                  style={{ padding: '6px 14px', border: '1.5px solid #d6c7b2', background: '#f5f0e6', borderRadius: 4 }}
                >
                  {chip}
                </span>
              ))}
          </div>
          <span style={{ fontSize: 22, color: INK_SOFT }}>Tancepke pinmu, lur!</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Mountain width={70} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontFamily: 'Courier Prime', fontSize: 52, color: TERRA }}>{km}</span>
            <span style={{ fontSize: 22, color: INK_SOFT }}>saka Titik 0 Pucak Gunung Lawu</span>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: INK }}>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 700 }}>
        <span style={{ fontFamily: 'Fraunces', fontSize: 84, lineHeight: 1 }}>{SITE_NAME}</span>
        <span style={{ fontFamily: 'Fraunces', fontSize: 40, lineHeight: 1.15, marginTop: 14, color: TERRA_DEEP }}>{SITE_TAGLINE}</span>
        <span style={{ fontSize: 28, lineHeight: 1.4, marginTop: 24, color: INK_SOFT }}>{intro}</span>
      </div>
      <Mountain width={300} />
    </div>
  );

  return new ImageResponse(<Frame logo={logo}>{body}</Frame>, {
    ...SIZE,
    fonts,
    emoji: 'twemoji',
    // Lowercase key on purpose: it replaces next/og's default one-year immutable header, so a deleted pin's card can expire.
    headers: { 'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
