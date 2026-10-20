// Pre-deploy gate: refuses to ship if a secret would be published or a check fails.
//   node scripts/preflight.mjs                  secrets + git + audit + lint + typecheck + tests + build
//   node scripts/preflight.mjs --secrets-only   just the secret scan (what CI runs)
//   node scripts/preflight.mjs --allow-dirty    don't require a clean working tree
// Vercel builds what is pushed to GitHub, so "what would be published" is every file git
// tracks or would add with `git add -A` (ignored files never leave this machine).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const secretsOnly = args.has('--secrets-only');
const allowDirty = args.has('--allow-dirty');
const isWin = process.platform === 'win32';

const failures = [];
const fail = (msg) => failures.push(msg);
const step = (name) => console.log(`\n▶ ${name}`);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });

// Files that should never be published, whatever is in them.
const FORBIDDEN_NAMES = [
  /(^|\/)\.env(\..+)?$/, // .env, .env.local, .env.production, …
  /\.(pem|key|p12|pfx)$/i,
  /(^|\/)id_(rsa|ed25519|ecdsa)$/,
  /(^|\/)\.vercel\//,
];
const ALLOWED_NAMES = [/(^|\/)\.env\.example$/];

// Content that looks like a live credential. Placeholders from .env.example and
// docker-compose.yml (local-only, bound to 127.0.0.1) are allowed.
const PLACEHOLDER = /change-me|app-password|<[^>]+>|\$\{|example\.com|user:pass(word)?@/i;
const PATTERNS = [
  { name: 'MongoDB URI with password', re: /mongodb(\+srv)?:\/\/[^\s:/@'"]+:[^\s@'"]+@[^\s'"]+/g },
  { name: 'SMTP URL with password', re: /smtps?:\/\/[^\s:/@'"]+:[^\s@'"]+@[^\s'"]+/g },
  { name: 'admin password hash', re: /scrypt:\d+:\d+:\d+:[\w-]{16,}:[\w-]{40,}/g, skip: /^tests\// },
  { name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'GitHub token', re: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: 'AI API key', re: /\bsk-(ant-)?[A-Za-z0-9_-]{32,}\b/g },
];
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|glb|gltf|bin|hdr|ktx2|woff2?|ttf|otf|mp3|mp4|webm|ogg|wav|zip|gz|pdf)$/i;
const MAX_BYTES = 5 * 1024 * 1024;

function scanSecrets() {
  step('Secret scan (files that would be pushed)');
  const files = git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
    .split('\0')
    .filter((f) => f && existsSync(f));

  // Real values from local env files must not appear anywhere in published files.
  // Addresses and origins aren't secret, so they may appear (e.g. in the README).
  const PUBLIC_KEYS = new Set(['NODE_ENV', 'ADMIN_EMAIL', 'APP_ORIGIN', 'CONTACT_NOTIFY_TO', 'CONTACT_NOTIFY_FROM']);
  const localValues = [];
  for (const envFile of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    if (!existsSync(envFile)) continue;
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      const value = m?.[2].replace(/^(['"])(.*)\1$/, '$2');
      if (value && value.length >= 12 && !PUBLIC_KEYS.has(m[1]) && !PLACEHOLDER.test(value)) localValues.push({ key: m[1], value });
    }
  }

  let found = 0;
  const report = (file, what) => {
    found++;
    fail(`${file}: ${what}`);
  };

  for (const file of files) {
    if (FORBIDDEN_NAMES.some((re) => re.test(file)) && !ALLOWED_NAMES.some((re) => re.test(file))) {
      report(file, 'this file must never be committed (add it to .gitignore)');
      continue;
    }
    if (BINARY.test(file) || statSync(file).size > MAX_BYTES) continue;
    const text = readFileSync(file, 'utf8');
    if (text.includes('\0')) continue;

    for (const { name, re, skip } of PATTERNS) {
      if (skip?.test(file)) continue;
      for (const [match] of text.matchAll(re)) {
        if (!PLACEHOLDER.test(match) && !/@(127\.0\.0\.1|localhost)[:/]/.test(match)) report(file, `looks like: ${name}`);
      }
    }
    for (const { key, value } of localValues) {
      if (text.includes(value)) report(file, `contains the real value of ${key} from your local env file`);
    }
  }

  // The ignore rules themselves must keep env files out.
  for (const f of ['.env', '.env.local', '.env.production']) {
    if (spawnSync('git', ['check-ignore', '-q', f]).status !== 0) {
      found++;
      fail(`.gitignore does not ignore ${f}`);
    }
  }

  console.log(found ? `  ✗ ${found} problem(s)` : `  ✓ ${files.length} files clean`);
}

function checkGit() {
  step('Git state');
  const dirty = git('status', '--porcelain').trim();
  if (dirty && !allowDirty) {
    fail('uncommitted changes: Vercel deploys what is on GitHub, so commit (or stash) first, or pass --allow-dirty');
    console.log(dirty.split('\n').slice(0, 15).map((l) => `    ${l}`).join('\n'));
  } else {
    console.log('  ✓ working tree clean');
  }
}

function run(name, cmd, cmdArgs) {
  step(name);
  // npm is a .cmd on Windows, which needs a shell; the arguments are fixed strings above.
  const r = isWin
    ? spawnSync([cmd, ...cmdArgs].join(' '), { stdio: 'inherit', shell: true })
    : spawnSync(cmd, cmdArgs, { stdio: 'inherit' });
  if (r.status !== 0) fail(`${name} failed`);
  return r.status === 0;
}

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 9)) fail(`Node ${process.versions.node} is too old; need 20.9+`);

scanSecrets();
if (!secretsOnly) {
  checkGit();
  // Stop before the slow steps if something is already wrong.
  if (!failures.length) {
    run('Dependency audit (production, high+)', 'npm', ['audit', '--omit=dev', '--audit-level=high']) &&
      run('Lint', 'npm', ['run', 'lint']) &&
      run('Typecheck', 'npm', ['run', 'typecheck']) &&
      run('Tests', 'npm', ['test']) &&
      run('Production build', 'npm', ['run', 'build']);
  }
}

if (failures.length) {
  console.error(`\n✗ Not safe to deploy:\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('\n✓ Preflight passed');
