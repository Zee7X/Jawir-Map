import type { Metadata, Viewport } from 'next';
import { Fraunces, Courier_Prime } from 'next/font/google';
import './globals.css';

// Fraunces: old-style serif for the logbook voice. Courier Prime: typewriter for document fields & MRZ.
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', weight: ['600', '800'] });
const typewriter = Courier_Prime({ subsets: ['latin'], variable: '--font-type', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Jawir Tag Location: Ekspedisi Sedonya & Titik 0 Lawu',
  description:
    'Peta sedulur Jawir sedonya, sing neng omah utawa neng rantau. Tancepke siji titikmu neng bumi, jupuk KTP Jawir Digital, lan itung adohmu saka Titik 0 Pucak Gunung Lawu!',
  keywords: [
    'Jawir',
    'Perantau Jawa',
    'Wong Jawa',
    'KTP Jawir Digital',
    'Gunung Lawu Titik 0',
    'Sunda Empire',
    'Jawir Tag Location',
    'World Pinboard',
  ],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  authors: [{ name: 'Paguyuban Jawir Sedonya' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        className={`${display.variable} ${typewriter.variable} antialiased bg-parchment text-ink h-screen w-screen overflow-hidden select-none`}
      >
        {children}
      </body>
    </html>
  );
}
