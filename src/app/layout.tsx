import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

// The public site is the static world at `/`; Next renders only the admin area and error pages.
export const metadata: Metadata = {
  title: { default: 'dennyi.*', template: '%s · dennyi.*' },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request headers renders every page per request, which is what lets Next
  // stamp the middleware's CSP nonce onto its scripts.
  await headers();
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
