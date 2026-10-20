// Post-deploy check against a live URL: the site is up, the security headers are on, and
// nothing private answers without a session.
//   node scripts/smoke.mjs https://your-site.vercel.app
const base = (process.argv[2] || process.env.SMOKE_URL || '').replace(/\/+$/, '');
if (!/^https:\/\//.test(base)) {
  console.error('Usage: node scripts/smoke.mjs https://your-site.vercel.app');
  process.exit(1);
}

const failures = [];
const check = (ok, msg) => {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures.push(msg);
};
const get = (path, init) => fetch(base + path, { redirect: 'manual', ...init });

console.log(`Smoke test: ${base}\n`);

const home = await get('/');
check(home.status === 200, `GET / → ${home.status}`);
const h = home.headers;
check(/default-src 'self'/.test(h.get('content-security-policy') ?? ''), 'Content-Security-Policy set');
check(/max-age=\d{7,}/.test(h.get('strict-transport-security') ?? ''), 'HSTS set');
check(h.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff');
check(h.get('x-frame-options') === 'DENY', 'X-Frame-Options: DENY');
check(!h.has('x-powered-by'), 'X-Powered-By hidden');

const health = await get('/api/health');
const body = await health.json().catch(() => ({}));
check(health.status === 200 && body.ok === true, `GET /api/health → ${health.status} ${JSON.stringify(body)}`);

const admin = await get('/admin');
check(
  [302, 303, 307, 308].includes(admin.status) && /\/admin\/login$/.test(admin.headers.get('location') ?? ''),
  `GET /admin without a session redirects to /admin/login (${admin.status})`,
);

// A same-origin write with no session must be refused by auth, not succeed or crash.
const write = await get('/api/admin/messages/000000000000000000000000', {
  method: 'PATCH',
  headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({ status: 'read' }),
});
check([401, 403].includes(write.status), `PATCH /api/admin/messages/… without a session → ${write.status}`);

// A cross-site write must be refused too.
const csrf = await get('/api/contact', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
  body: '{}',
});
check(csrf.status === 403, `POST /api/contact from another origin → ${csrf.status}`);

for (const path of ['/.env', '/.env.local', '/.git/config', '/package.json', '/next.config.ts']) {
  const r = await get(path);
  check(r.status === 404 || (r.status >= 300 && r.status < 400), `${path} not served (${r.status})`);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\n✓ Live site looks healthy and locked down');
