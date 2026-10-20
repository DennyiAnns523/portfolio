import type { Metadata } from 'next';
import { ActionButton } from '@/components/admin/ActionButton';
import { formatWhen, StatusTabs } from '@/components/admin/StatusTabs';
import { requireAdminPage } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { Idea, IDEA_STATUSES } from '@/lib/server/models';

export const metadata: Metadata = { title: 'Ideas' };

type Status = (typeof IDEA_STATUSES)[number];
const PAGE_SIZE = 100;

export default async function Ideas({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const requested = (await searchParams).status;
  const status: Status = IDEA_STATUSES.includes(requested as Status) ? (requested as Status) : 'pending';

  await connectDb();
  const [ideas, ...totals] = await Promise.all([
    Idea.find({ status }).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
    ...IDEA_STATUSES.map((s) => Idea.countDocuments({ status: s })),
  ]);
  const counts = Object.fromEntries(IDEA_STATUSES.map((s, i) => [s, totals[i]])) as Record<Status, number>;

  return (
    <>
      <p className="eyebrow">The idea garden</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Ideas</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Approved ideas appear under “From other wanderers” in the idea garden. The newest 24 are shown there.
      </p>
      <StatusTabs base="/admin/ideas" statuses={IDEA_STATUSES} current={status} counts={counts} />

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {ideas.length === 0 && <li className="py-4 text-sm text-muted">Nothing here.</li>}
        {ideas.map((idea) => {
          const id = String(idea._id);
          const url = `/api/admin/ideas/${id}`;
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="break-words">✳ {idea.text}</p>
                <p className="mt-1 font-mono text-xs text-muted">{formatWhen(idea.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {idea.status !== 'approved' && <ActionButton url={url} method="PATCH" body={{ status: 'approved' }} label="Approve" />}
                {idea.status !== 'rejected' && <ActionButton url={url} method="PATCH" body={{ status: 'rejected' }} label="Reject" />}
                <ActionButton url={url} method="DELETE" label="Delete" danger confirm="Delete this idea permanently?" />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
