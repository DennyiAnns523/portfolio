import Link from 'next/link';
import { SignOut } from '@/components/admin/SignOut';
import { requireAdminPage } from '@/lib/server/auth';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/visitors', label: 'Visitors' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/ideas', label: 'Ideas' },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-6">
        <a href="/" className="text-2xl font-bold tracking-tight">
          dennyi<span className="text-orange">.*</span>
        </a>
        <nav aria-label="Admin" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-orange">
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOut />
      </header>
      <main className="py-10">{children}</main>
    </div>
  );
}
