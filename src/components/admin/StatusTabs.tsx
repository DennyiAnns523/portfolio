import Link from 'next/link';

/** Filter tabs that live in the URL (`?status=`), so they work without client JS. */
export function StatusTabs<T extends string>({ base, statuses, current, counts }: {
  base: string;
  statuses: readonly T[];
  current: T;
  counts: Record<T, number>;
}) {
  return (
    <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
      {statuses.map((s) => (
        <Link
          key={s}
          href={`${base}?status=${s}`}
          aria-current={s === current ? 'page' : undefined}
          className={`btn capitalize ${s === current ? 'btn-primary' : ''}`}
        >
          {s} <span className="opacity-70">{counts[s]}</span>
        </Link>
      ))}
    </nav>
  );
}

export function formatWhen(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC';
}
