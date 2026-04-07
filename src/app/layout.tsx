import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://livev.up.railway.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'LIVE V — Mini Fantasy Football',
  description: 'Pick your 5-a-side team and compete with friends on a single match.',
  openGraph: {
    title: 'LIVE V — Mini Fantasy Football',
    description: 'Pick 5 players. Watch them score live. Beat your mates.',
    siteName: 'LIVE V',
    type: 'website',
    images: [{ url: '/api/og', width: 400, height: 210, alt: 'LIVE V' }],
  },
  twitter: {
    card: 'summary',
    title: 'LIVE V — Mini Fantasy Football',
    description: 'Pick 5 players. Watch them score live. Beat your mates.',
    images: ['/api/og'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans antialiased"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <div className="mx-auto max-w-lg min-h-dvh flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
