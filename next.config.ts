import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

const WORLD_FILE = 'world-demo.html';

// The world page allows exactly its own inline scripts (the import map) by hash, computed
// from the file at build time so the CSP can't drift from the markup.
function inlineScriptHashes(): string[] {
  const html = readFileSync(path.join(process.cwd(), 'public', WORLD_FILE), 'utf8');
  return [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .filter((m) => m[1].trim())
    .map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
}

// HSTS and upgrade-insecure-requests only where the site is really served over HTTPS
// (Vercel, or an https APP_ORIGIN), so `next start` on http://localhost keeps working.
const httpsOnly =
  process.env.NODE_ENV === 'production' && (process.env.VERCEL === '1' || !!process.env.APP_ORIGIN?.startsWith('https://'));

const worldCsp = [
  "default-src 'self'",
  `script-src 'self' ${inlineScriptHashes().join(' ')}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(httpsOnly ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  ...(httpsOnly ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['mongoose'],

  async rewrites() {
    // The world is the home page. beforeFiles so it wins over any app route at `/`.
    return { beforeFiles: [{ source: '/', destination: `/${WORLD_FILE}` }], afterFiles: [], fallback: [] };
  },

  async redirects() {
    return [
      { source: `/${WORLD_FILE}`, destination: '/', permanent: true },
      // Short links for social bios: /instagram → /?from=instagram (counted and greeted as Instagram).
      {
        source: '/:platform(instagram|ig|linkedin|x|twitter|github|facebook|youtube|whatsapp)',
        destination: '/?from=:platform',
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/', headers: [{ key: 'Content-Security-Policy', value: worldCsp }] },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

export default nextConfig;
