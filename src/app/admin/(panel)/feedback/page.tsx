import type { Metadata } from 'next';
import { ActionButton } from '@/components/admin/ActionButton';
import { formatWhen, StatusTabs } from '@/components/admin/StatusTabs';
import { requireAdminPage } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { Feedback, FEEDBACK_STATUSES } from '@/lib/server/models';

export const metadata: Metadata = { title: 'Feedback' };

type Status = (typeof FEEDBACK_STATUSES)[number];
const PAGE_SIZE = 100;
const FACES = ['', '😞', '😐', '🙂', '😄', '🤩'];
const WORDS = ['', 'Not great', 'Okay', 'Good', 'Great', 'Loved it'];

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const requested = (await searchParams).status;
  const status: Status = FEEDBACK_STATUSES.includes(requested as Status) ? (requested as Status) : 'new';

  await connectDb();
  const [items, ratings, ...totals] = await Promise.all([
    Feedback.find({ status }).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
    Feedback.aggregate<{ _id: null; avg: number; n: number }>([
      { $match: { rating: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
    ]),
    ...FEEDBACK_STATUSES.map((s) => Feedback.countDocuments({ status: s })),
  ]);
  const counts = Object.fromEntries(FEEDBACK_STATUSES.map((s, i) => [s, totals[i]])) as Record<Status, number>;
  const avg = ratings[0];

  return (
    <>
      <p className="eyebrow">What visitors told you</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Feedback</h1>
      {avg && (
        <p className="mt-3 text-sm text-muted">
          Average rating {FACES[Math.round(avg.avg)]} <strong className="text-ink">{avg.avg.toFixed(1)}</strong> / 5 from {avg.n}{' '}
          {avg.n === 1 ? 'rating' : 'ratings'}.
        </p>
      )}
      <StatusTabs base="/admin/feedback" statuses={FEEDBACK_STATUSES} current={status} counts={counts} />

      <ul className="mt-8 grid gap-4">
        {items.length === 0 && <li className="text-sm text-muted">Nothing here.</li>}
        {items.map((f) => {
          const id = String(f._id);
          const url = `/api/admin/feedback/${id}`;
          return (
            <li key={id} className="border border-line bg-panel p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {f.name ?? <span className="text-muted">Anonymous</span>}
                  {f.rating ? (
                    <span className="ml-3 text-sm font-normal text-muted" title={WORDS[f.rating]}>
                      {FACES[f.rating]} {WORDS[f.rating]}
                    </span>
                  ) : null}
                </p>
                <time className="font-mono text-xs text-muted" dateTime={f.createdAt.toISOString()}>
                  {formatWhen(f.createdAt)}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{f.comment}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {f.status === 'new' ? (
                  <ActionButton url={url} method="PATCH" body={{ status: 'read' }} label="Mark read" />
                ) : (
                  <ActionButton url={url} method="PATCH" body={{ status: 'new' }} label="Mark unread" />
                )}
                <ActionButton url={url} method="DELETE" label="Delete" danger confirm="Delete this feedback permanently?" />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
