import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LIVE V — Mini Fantasy Football',
  description: 'Pick your 5-a-side team and compete with friends on a single match.',
  openGraph: {
    title: 'LIVE V — Mini Fantasy Football',
    description: 'Pick 5 players. Watch them score live. Beat your mates.',
    siteName: 'LIVE V',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LIVE V — Mini Fantasy Football',
    description: 'Pick 5 players. Watch them score live. Beat your mates.',
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
