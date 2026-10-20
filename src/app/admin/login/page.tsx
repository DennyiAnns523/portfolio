import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { getAdminSession } from '@/lib/server/auth';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await getAdminSession()) redirect('/admin');
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="eyebrow">dennyi.* / the back door</p>
      <h1 className="mt-4 font-serif text-4xl tracking-tight">Sign in</h1>
      <p className="mt-3 text-sm text-muted">Owner access to messages and the idea garden.</p>
      <LoginForm />
    </main>
  );
}
