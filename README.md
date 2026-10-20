# dennyi.* — a little world, still becoming

Dennyi Anns's personal site: an interactive world (a floating island with a mini me, a black hole, free throws, a Rubik's cube and a 3D garden) with a small, hardened backend for leaving notes and planting shared ideas, plus a private admin area to read and moderate them.

Live: [den-s-portfolio-4737.vercel.app](https://den-s-portfolio-4737.vercel.app/)

## How it fits together

| Part | What it is |
| --- | --- |
| `/` | The world: static HTML/JS in `public/` (`world-demo.html`, served at `/` by a rewrite). See [PLAYGROUND.md](PLAYGROUND.md) for every scene. |
| `/journey` | The academic/professional side: résumé, education and experience timeline, research, projects, skills and contact. Content lives in `src/content/journey.ts`; printable as a PDF. Indexed by search engines (the admin area is not). |
| `/api/*` | Next.js 15 route handlers (Node runtime): contact notes, shared ideas, admin actions, health. |
| `/admin` | Next.js pages for the owner: overview and security log, messages, idea moderation. |
| Database | MongoDB through Mongoose: messages, ideas, sessions, rate limits, audit log. |

Two doors in the world talk to the backend:

- **Say hello** (header and footer) sends a note to `POST /api/contact`. Notes are stored for the admin and, optionally, e-mailed to you.
- **Visitors** are counted anonymously (`public/visit.js` → `POST /api/visit`) and greeted: "Hey there, Instagram friend 👋" on a first visit from a tagged link, and "Hey, welcome back 👋" after that. `/admin/visitors` shows daily visitors, page views, returning visitors and where people came from, plus a ready-made link for each profile (`/?from=instagram`, `/?from=linkedin`, …). A website can't see who someone is on social media, so there are no names: just counts and the platform.
- **"Who's visiting?"** When the visitor reaches the end of the page, Moriar the cat walks in carrying an envelope and drops it; it pops open into a note that asks once: type a name or @handle, or "Stay anonymous" (never asked again). Visitors who answer are greeted by name ("Hey @rahul 👋 Welcome back!") and listed on `/admin/visitors` with their visit count, platform and last visit. Names aren't verified. The visitor can "Forget me" from the feedback door, and you can remove any name. Anonymous visitors never get a record (`POST`/`DELETE /api/hello`). The same note then asks for feedback (an optional face rating and a comment). Reduced-motion visitors, or anyone with cat visits off, get the note without the walk.
- **Feedback** ("Feedback" in the header, "Leave feedback" in the footer) takes an optional 1–5 rating and a comment, privately, for `/admin/feedback` (`POST /api/feedback`). If the visitor gave a name, it's attached from what they saved, not from the request, so nobody can post as someone else.
- **The idea garden** still keeps ideas in the visitor's browser. With "Share it with Dennyi" ticked, it also sends them to `POST /api/ideas`. Ideas you approve appear for everyone under "From other wanderers".

## Run it locally

Requires Node 20.9+ and Docker (for MongoDB).

```bash
npm install
npm run db:up                    # MongoDB 8 on 127.0.0.1:27017
cp .env.example .env.local       # then fill it in:
npm run hash-password            # prompts for a password, prints ADMIN_PASSWORD_HASH=...
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"   # IP_HASH_SECRET
npm run dev                      # http://localhost:3000, admin at /admin
```

| Script | Does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm test` | API and security tests (Vitest with an in-memory MongoDB) plus the game-rule tests |
| `npm run lint` / `typecheck` | ESLint, TypeScript |
| `npm run db:up` / `db:down` | Start or stop local MongoDB (data persists in a Docker volume) |
| `npm run hash-password` | Hash an admin password for `.env.local` or your host's env settings |

## Environment

All server settings are validated on first use; a missing or malformed value fails with a message naming it. See [.env.example](.env.example).

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas in production. Use a database user with `readWrite` on this database only. |
| `ADMIN_EMAIL` | yes | The one admin account. |
| `ADMIN_PASSWORD_HASH` | yes | From `npm run hash-password` (scrypt). The plain password is never stored anywhere. |
| `IP_HASH_SECRET` | yes | 32+ random characters; keys the hash used instead of storing visitor IPs. |
| `APP_ORIGIN` | no | e.g. `https://your.domain`. Pins the CSRF origin check, and turns on HSTS off Vercel. |
| `SMTP_URL`, `CONTACT_NOTIFY_TO`, `CONTACT_NOTIFY_FROM` | no | E-mail notification for new notes. |

## Deploy (Vercel + MongoDB Atlas)

1. Create a free Atlas cluster and a database user scoped to `readWrite` on one database. Under Network Access, allow `0.0.0.0/0`, because Vercel has no fixed IPs. The password-protected user is the boundary.
2. In Vercel → Project → Settings → Environment Variables, add the variables above for Production. Generate a **new** password hash and IP secret for production; don't reuse local ones.
3. Deploy. Check `https://<your-domain>/api/health` returns `{"ok":true,"db":"up"}`, then sign in at `/admin`.

### Shipping changes safely

Vercel deploys from GitHub: every branch gets a preview URL, and `main` is production.

```powershell
git switch -c feat/my-change      # work on a branch, never straight on main
git add -A; git commit -m "..."
npm run deploy                    # preflight, then push: Vercel builds a preview, CI runs
# open the PR, merge when CI is green -> production
npm run smoke -- https://<your-domain>   # check the live site afterwards
```

| Script | Does |
| --- | --- |
| `npm run preflight` | Blocks the deploy on: a secret in any file that would be pushed (incl. the real values in `.env.local`), env files not ignored, uncommitted changes, `npm audit` high+, lint, typecheck, tests, build |
| `npm run check:secrets` | Just the secret scan (also the first CI step) |
| `npm run deploy` | Preflight, refuses if the remote branch is ahead, pushes without `--force`; on `main` asks you to type `deploy` |
| `npm run smoke -- <url>` | Live checks: health, CSP/HSTS/nosniff/frame headers, `/admin` redirects, admin API refuses without a session, cross-site writes blocked, `.env`/`.git` not served |

CI also runs gitleaks over the whole git history (`.gitleaks.toml`). If a secret ever reaches GitHub, **rotate it** (new Atlas password, `npm run hash-password`, new `IP_HASH_SECRET`); deleting the commit is not enough.

Collections and indexes (including the TTL indexes that expire sessions, rate-limit windows and old audit events) are created automatically on first use.

## Security model

- **Authentication.** There is one admin account. The password is hashed with scrypt (memory-hard; parameters live in the hash string). Sessions are server-side: a 256-bit random token sits in an `HttpOnly; Secure; SameSite=Strict` cookie with the `__Host-` prefix, and only its SHA-256 is stored. A session expires 12 h after sign-in or after 2 h idle. Sign-out revokes the session in the database, and "Sign out everywhere" revokes all of them.
- **Authorisation.** Every admin page and API route checks the session against the database itself. The middleware's cookie check is only a fast redirect, never the boundary.
- **Brute force.** Sign-in allows 5 attempts per IP per 15 min and 30 globally per hour. A wrong email and a wrong password take the same time and return the same response. Failures and lockouts go to the audit log shown on `/admin`.
- **CSRF.** State-changing requests must carry a matching `Origin`, use a JSON body (which blocks plain cross-site form posts), and rely on SameSite=Strict cookies.
- **Input.** Every body is size-capped while streaming and validated with zod (types, lengths, no control characters, so no header injection). Strict typing also stops NoSQL operator injection, and ids must be ObjectIds.
- **Abuse.** Per-IP and global rate limits are stored in MongoDB, so they hold across serverless instances. A honeypot field and a minimum fill time silently drop bots. The review queue for ideas is capped.
- **Output.** Visitor text is rendered only as text (React escaping in admin, `textContent` in the world). Public endpoints expose approved idea text and nothing else.
- **Headers.** The world runs under a CSP with no inline script, except its import map, which is allowed by a SHA-256 computed from the file at build time. Admin pages use a per-request nonce with `strict-dynamic`. Both deny framing and plugins and restrict `connect-src` to the site itself. Every response also gets `nosniff`, a strict `Referrer-Policy`, COOP/CORP, a locked-down `Permissions-Policy`, and HSTS when served over HTTPS.
- **Privacy.** Visitor IPs are stored only as keyed HMACs. Visit counting uses a hash of IP + browser + date that changes every day, so no one can be followed across days. There are no tracking cookies (the welcome-back greeting uses a visit counter in the browser's own storage), bots and link previews are skipped, and visit records expire after about 13 months. Audit events expire after 90 days. Notes are visible only to the admin.
- **Supply chain.** Production dependencies audit clean. CI runs `npm audit --omit=dev`, lint, typecheck, tests and build on every push and PR; Dependabot proposes updates weekly.

Known trade-offs:
- Rate-limit keys trust `x-real-ip` / `x-forwarded-for`, which is correct on Vercel. If you self-host, run behind a proxy that sets them, or per-IP limits can be dodged; the global caps still hold.
- `npm audit` (including dev dependencies) reports `braces` via Tailwind 3's file watcher. It only runs at dev/build time with our own glob patterns; it goes away with a Tailwind 4 migration.

## Project structure

```
public/                 the world (static): world-demo.html, world.js, visit.js, scenes, vendor/three
src/app/api/            route handlers: contact, ideas, visit, hello, feedback, health, admin/{login,logout,messages,ideas,feedback,visitors}
src/app/admin/          sign-in page and the (panel) pages: overview, visitors, feedback, messages, ideas
src/components/admin/   client components for the admin UI
src/lib/server/         env, db, models, auth, sessions, passwords, rate limits, validation, mail
src/middleware.ts       nonce CSP + signed-out redirect for Next-rendered pages
next.config.ts          world rewrite, security headers, world CSP
tests/                  Vitest API/security tests; games-core.test.cjs (node:test)
```

## License

MIT
