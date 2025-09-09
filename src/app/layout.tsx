import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import ThemeProvider from '@/components/providers/ThemeProvider';

import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Your Name - Full Stack Developer',
    template: '%s | Your Name',
  },
  description:
    'Full Stack Developer specializing in React, Node.js, and modern web technologies. Building scalable applications and beautiful user experiences.',
  keywords: ['Full Stack Developer', 'React', 'Node.js', 'Next.js', 'TypeScript', 'JavaScript'],
  authors: [{ name: 'Your Name', url: 'https://yourwebsite.com' }],
  creator: 'Your Name',
  publisher: 'Your Name',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourwebsite.com',
    title: 'Your Name - Full Stack Developer',
    description: 'Full Stack Developer specializing in React, Node.js, and modern web technologies.',
    siteName: 'Your Name Portfolio',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Your Name - Full Stack Developer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Name - Full Stack Developer',
    description: 'Full Stack Developer specializing in React, Node.js, and modern web technologies.',
    creator: '@yourtwitterhandle',
    images: ['/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  // Add icons here instead of manually placing a <head> block
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'manifest', url: '/manifest.json' },
      // you can add more: { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#5bbad5' }
    ],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 selection:bg-primary-200 dark:selection:bg-primary-800`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="min-h-screen flex flex-col">
            {/* Optional: add a skip link for accessibility */}
            <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50">
              Skip to content
            </a>

            <main id="content" className="flex-grow">
              {children}
            </main>
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
