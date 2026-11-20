import type { Metadata } from 'next';
import JawirMapApp from '@/components/JawirMapApp';
import { LangProvider } from '@/lib/i18n';
import { findShareableTag } from '@/lib/tagStore';
import { pinPath, challengeText } from '@/lib/share';
import { TRAH_MAP, type TrahType } from '@/lib/geo';
import { SITE_NAME } from '@/lib/site';

interface PinPageProps {
  params: { id: string };
}

// Each pin page is rendered once and reused for 5 minutes, so link previews cost at most one query per pin per 5 min.
export const revalidate = 300;

// Nothing is prebuilt; each pin page is generated on its first visit and then cached (ISR).
export function generateStaticParams(): { id: string }[] {
  return [];
}

// A shared /p/<id> link previews that pin (title, semboyan, passport image) in WhatsApp, X, Telegram, etc.
export async function generateMetadata({ params }: PinPageProps): Promise<Metadata> {
  try {
    const tag = await findShareableTag(decodeURIComponent(params.id));
    if (!tag) return {};

    const title = `${tag.nickname} · ${tag.distanceKm.toLocaleString('id-ID')} km saka Lawu`;
    // Written as a dare from the pin owner, so whoever opens the link answers with their own distance.
    const trahShort = tag.trah ? TRAH_MAP[tag.trah as TrahType]?.short : undefined;
    const description = `“${tag.statusTag}” ${challengeText(tag, trahShort)}`;
    const image = { url: `/og?tag=${encodeURIComponent(tag.id)}`, width: 1200, height: 630, alt: `Paspor Jawir ${tag.nickname}` };
    const path = pinPath(tag.id);

    return {
      title,
      description,
      alternates: { canonical: path },
      openGraph: { type: 'website', siteName: SITE_NAME, locale: 'id_ID', title, description, url: path, images: [image] },
      twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    };
  } catch (err) {
    console.error('Failed to build share metadata:', err);
    return {};
  }
}

export default function PinPage({ params }: PinPageProps) {
  return (
    <LangProvider>
      <JawirMapApp initialTagId={decodeURIComponent(params.id)} />
    </LangProvider>
  );
}
