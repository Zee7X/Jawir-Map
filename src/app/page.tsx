import type { Metadata } from 'next';
import JawirMapApp from '@/components/JawirMapApp';
import { findShareableTag } from '@/lib/tagStore';
import { SITE_NAME } from '@/lib/site';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

// A shared /?tag=<id> link previews that pin (title, semboyan, passport image) in WhatsApp, X, Telegram, etc.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const id = typeof searchParams.tag === 'string' ? searchParams.tag : null;
  if (!id) return {};

  try {
    const tag = await findShareableTag(id);
    if (!tag) return {};

    const title = `${tag.nickname} · ${tag.distanceKm.toLocaleString('id-ID')} km saka Lawu`;
    const description = `“${tag.statusTag}” Tancepke pinmu uga neng ${SITE_NAME}, lur.`;
    const query = `?tag=${encodeURIComponent(tag.id)}`;
    const image = { url: `/og${query}`, width: 1200, height: 630, alt: `Paspor Jawir ${tag.nickname}` };
    // No og:url or canonical here: Next 14 drops the query from "/?tag=…" URLs, and a bare "/" would make
    // Facebook and search engines fold every pin preview into the homepage. Without them, crawlers use the shared URL.
    return {
      title,
      description,
      alternates: { canonical: null },
      openGraph: { type: 'website', siteName: SITE_NAME, locale: 'id_ID', title, description, images: [image] },
      twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    };
  } catch (err) {
    console.error('Failed to build share metadata:', err);
    return {};
  }
}

export default function Page() {
  return <JawirMapApp />;
}
