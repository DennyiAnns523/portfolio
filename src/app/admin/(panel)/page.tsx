import type { Metadata } from 'next';
import Link from 'next/link';
import { formatWhen } from '@/components/admin/StatusTabs';
import { requireAdminPage } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { AuditEvent, ContactMessage, Feedback, Idea, NamedVisitor, Visit } from '@/lib/server/models';

export const metadata: Metadata = { title: 'Overview' };

const AUDIT_LABELS: Record<string, string> = {
  login_success: 'Signed in',
  login_failed: 'Failed sign-in',
  login_rate_limited: 'Sign-in rate limited',
  logout: 'Signed out',
  logout_all: 'Signed out everywhere',
  spam_dropped: 'Spam dropped',
};

export default async function Overview() {
  const session = await requireAdminPage();
  await connectDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [visitorsToday, namedVisitors, newFeedback, newMessages, pendingIdeas, failedLogins, events] = await Promise.all([
    Visit.countDocuments({ day: new Date().toISOString().slice(0, 10) }),
    NamedVisitor.countDocuments(),
    Feedback.countDocuments({ status: 'new' }),
    ContactMessage.countDocuments({ status: 'new' }),
    Idea.countDocuments({ status: 'pending' }),
    AuditEvent.countDocuments({ type: 'login_failed', createdAt: { $gte: since } }),
    AuditEvent.find().sort({ createdAt: -1 }).limit(12).lean(),
  ]);

  const stats = [
    { label: 'Visitors today', value: visitorsToday, href: '/admin/visitors' },
    { label: 'People who said who they are', value: namedVisitors, href: '/admin/visitors#named' },
    { label: 'New feedback', value: newFeedback, href: '/admin/feedback?status=new' },
    { label: 'New messages', value: newMessages, href: '/admin/messages?status=new' },
    { label: 'Ideas awaiting review', value: pendingIdeas, href: '/admin/ideas?status=pending' },
    { label: 'Failed sign-ins (24 h)', value: failedLogins },
  ];

  return (
    <>
      <p className="eyebrow">Overview</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">What&apos;s growing</h1>
      <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => {
          const body = (
            <>
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="mt-2 font-serif text-4xl">{s.value}</dd>
            </>
          );
          return s.href ? (
            <Link key={s.label} href={s.href} className="border border-line bg-panel p-5 transition hover:-translate-y-0.5">
              {body}
            </Link>
          ) : (
            <div key={s.label} className={`border bg-panel p-5 ${s.value > 0 ? 'border-orange' : 'border-line'}`}>
              {body}
            </div>
          );
        })}
      </dl>

      <section className="mt-12">
        <h2 className="eyebrow">Security log</h2>
        <p className="mt-2 text-xs text-muted">
          This session expires {formatWhen(session.expiresAt)}. Visitor IPs are stored only as keyed hashes.
        </p>
        <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
          {events.length === 0 && <li className="py-3 text-muted">No events yet.</li>}
          {events.map((e) => (
            <li key={String(e._id)} className="flex flex-wrap justify-between gap-2 py-3">
              <span className={e.type === 'login_failed' || e.type === 'login_rate_limited' ? 'text-red-700' : ''}>
                {AUDIT_LABELS[e.type] ?? e.type}
                {e.detail ? <span className="text-muted"> · {e.detail}</span> : null}
              </span>
              <span className="font-mono text-xs text-muted">
                {formatWhen(e.createdAt)} · {e.ipHash.slice(0, 8)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
