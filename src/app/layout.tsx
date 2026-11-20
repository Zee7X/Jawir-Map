import type { Metadata, Viewport } from 'next';
import { Fraunces, Courier_Prime } from 'next/font/google';
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from '@/lib/site';
import './globals.css';

// Fraunces: old-style serif for the logbook voice. Courier Prime: typewriter for document fields & MRZ.
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', weight: ['600', '800'] });
const typewriter = Courier_Prime({ subsets: ['latin'], variable: '--font-type', weight: ['400', '700'] });

const TITLE = `${SITE_NAME} · ${SITE_TAGLINE}`;
const OG_IMAGE = { url: '/og', width: 1200, height: 630, alt: `${SITE_NAME}: ${SITE_TAGLINE}` };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Jawir Map',
    'Jawir',
    'Perantau Jawa',
    'Wong Jawa',
    'Paspor Jawir Digital',
    'Gunung Lawu Titik 0',
    'Sunda Empire',
    'Peta Perantau',
  ],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  authors: [{ name: 'Paguyuban Jawir Sedonya' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'id_ID',
    url: '/',
    title: TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

// Pinch-zoom stays allowed so modal text can be enlarged; the map handles its own gestures.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#faf8f5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="jv">
      <body
        className={`${display.variable} ${typewriter.variable} antialiased bg-parchment text-ink h-screen w-screen overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
