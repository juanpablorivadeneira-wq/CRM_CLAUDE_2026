import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { SessionProvider } from '@/components/auth/session-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'BK-CRM',
  description: 'CRM comercial para constructoras — ecosistema BuildKontrol.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
