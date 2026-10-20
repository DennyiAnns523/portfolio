import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ActionButton } from '@/components/admin/ActionButton';
import { formatWhen } from '@/components/admin/StatusTabs';
import { requireAdminPage } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { NamedVisitor } from '@/lib/server/models';
import { getEnv } from '@/lib/server/env';
import { visitStats } from '@/lib/server/visits';

export const metadata: Metadata = { title: 'Visitors' };

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X / Twitter',
  github: 'GitHub',
  facebook: 'Facebook',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  google: 'Google search',
  direct: 'Direct / unknown',
  other: 'Other sites',
};
const PROFILE_LINKS = ['instagram', 'linkedin', 'x', 'github', 'facebook', 'youtube', 'whatsapp'];

async function siteOrigin() {
  const configured = getEnv().APP_ORIGIN;
  if (configured) return configured.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function Visitors() {
  await requireAdminPage();
  await connectDb();
  const [stats, origin, named] = await Promise.all([
    visitStats(30),
    siteOrigin(),
    NamedVisitor.find().sort({ lastSeenAt: -1 }).limit(200).lean(),
  ]);
  const peak = Math.max(1, ...stats.days.map((d) => d.visitors));
  const sourceTotal = Math.max(1, stats.sources.reduce((n, s) => n + s.visitors, 0));

  const cards = [
    { label: 'Visitors today', value: stats.today.visitors },
    { label: 'Visitors, last 30 days', value: stats.totals.visitors },
    { label: 'Page views, last 30 days', value: stats.totals.views },
    { label: 'Came back again', value: stats.totals.returning },
  ];

  return (
    <>
      <p className="eyebrow">Who&apos;s wandering in</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Visitors</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Counts are anonymous: no accounts or IP addresses are stored. A visitor is counted once per day; the
        &ldquo;came back&rdquo; number counts visitors whose browser had been here before. Names appear only for
        people who chose to give one.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="border border-line bg-panel p-5">
            <dt className="text-xs text-muted">{c.label}</dt>
            <dd className="mt-2 font-serif text-4xl">{c.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-12">
        <h2 className="eyebrow">Daily visitors · last 30 days (UTC)</h2>
        <div className="mt-4 flex h-40 items-end gap-1 border-b border-line" role="img" aria-label="Bar chart of daily visitors over the last 30 days">
          {stats.days.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full bg-plum/70 transition-colors group-hover:bg-orange"
                style={{ height: `${(d.visitors / peak) * 100}%`, minHeight: d.visitors ? 3 : 0 }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 font-mono text-[10px] text-paper group-hover:block">
                {d.day.slice(5)} · {d.visitors}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
          <span>{stats.days[0].day}</span>
          <span>today</span>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="eyebrow">Where they came from · last 30 days</h2>
        <ul className="mt-4 grid gap-3">
          {stats.sources.length === 0 && <li className="text-sm text-muted">No visits yet.</li>}
          {stats.sources.map((s) => (
            <li key={s.source} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm">
              <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
              <span className="h-2 bg-line">
                <span className="block h-full bg-orange" style={{ width: `${(s.visitors / sourceTotal) * 100}%` }} />
              </span>
              <span className="text-right font-mono text-xs">{s.visitors}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" id="named">
        <h2 className="eyebrow">People who said who they are</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Visitors who answered &ldquo;who&apos;s visiting?&rdquo;. Names are typed by the visitor, so they aren&apos;t
          verified. Removing someone just makes them anonymous again; their visits stay counted.
        </p>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {named.length === 0 && <li className="py-4 text-sm text-muted">Nobody yet.</li>}
          {named.map((v) => (
            <li key={v._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="break-words font-medium">{v.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {v.visits} {v.visits === 1 ? 'visit' : 'visits'} · came via {SOURCE_LABELS[v.source] ?? v.source} · first{' '}
                  {formatWhen(v.createdAt)} · last seen {formatWhen(v.lastSeenAt)}
                </p>
              </div>
              <ActionButton url={`/api/admin/visitors/${v._id}`} method="DELETE" label="Remove name" danger confirm={`Remove “${v.name}”? They become anonymous again.`} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="eyebrow">Links for your profiles</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Put the matching link in each bio. Apps like Instagram often hide where a visitor came from; the tag tells
          the counter anyway, and greets the visitor as &ldquo;Hey there, Instagram friend 👋&rdquo;.
        </p>
        <ul className="mt-4 grid gap-2 font-mono text-xs">
          {PROFILE_LINKS.map((p) => (
            <li key={p} className="flex flex-wrap items-center gap-3 border border-line bg-panel px-3 py-2">
              <span className="w-24 font-sans text-sm">{SOURCE_LABELS[p]}</span>
              <code className="select-all break-all">{`${origin}/?from=${p}`}</code>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
