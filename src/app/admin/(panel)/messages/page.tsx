import type { Metadata } from 'next';
import { ActionButton } from '@/components/admin/ActionButton';
import { formatWhen, StatusTabs } from '@/components/admin/StatusTabs';
import { requireAdminPage } from '@/lib/server/auth';
import { connectDb } from '@/lib/server/db';
import { ContactMessage, MESSAGE_STATUSES } from '@/lib/server/models';

export const metadata: Metadata = { title: 'Messages' };

type Status = (typeof MESSAGE_STATUSES)[number];
const PAGE_SIZE = 50;

export default async function Messages({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage();
  const requested = (await searchParams).status;
  const status: Status = MESSAGE_STATUSES.includes(requested as Status) ? (requested as Status) : 'new';

  await connectDb();
  const [messages, ...totals] = await Promise.all([
    ContactMessage.find({ status }).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
    ...MESSAGE_STATUSES.map((s) => ContactMessage.countDocuments({ status: s })),
  ]);
  const counts = Object.fromEntries(MESSAGE_STATUSES.map((s, i) => [s, totals[i]])) as Record<Status, number>;

  return (
    <>
      <p className="eyebrow">Notes left through “Say hello”</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Messages</h1>
      <StatusTabs base="/admin/messages" statuses={MESSAGE_STATUSES} current={status} counts={counts} />

      <ul className="mt-8 grid gap-4">
        {messages.length === 0 && <li className="text-sm text-muted">Nothing here.</li>}
        {messages.map((m) => {
          const id = String(m._id);
          const url = `/api/admin/messages/${id}`;
          return (
            <li key={id} className="border border-line bg-panel p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {m.name}{' '}
                  <a href={`mailto:${m.email}`} className="text-sm text-plum underline-offset-2 hover:underline">
                    {m.email}
                  </a>
                </p>
                <time className="font-mono text-xs text-muted" dateTime={m.createdAt.toISOString()}>
                  {formatWhen(m.createdAt)}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{m.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {m.status !== 'read' && <ActionButton url={url} method="PATCH" body={{ status: 'read' }} label="Mark read" />}
                {m.status !== 'new' && <ActionButton url={url} method="PATCH" body={{ status: 'new' }} label="Mark unread" />}
                {m.status !== 'archived' && <ActionButton url={url} method="PATCH" body={{ status: 'archived' }} label="Archive" />}
                <ActionButton url={url} method="DELETE" label="Delete" danger confirm={`Delete the message from ${m.name} permanently?`} />
              </div>
            </li>
          );
        })}
      </ul>
      {counts[status] > PAGE_SIZE && (
        <p className="mt-6 text-xs text-muted">Showing the newest {PAGE_SIZE} of {counts[status]}. Archive or delete some to see older ones.</p>
      )}
    </>
  );
}
