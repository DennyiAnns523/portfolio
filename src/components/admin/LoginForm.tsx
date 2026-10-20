'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from './api';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await send('/api/admin/login', 'POST', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });
    if (error) {
      setError(error);
      setBusy(false);
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <label className="grid gap-1.5 text-xs text-muted">
        Email
        <input className="input" name="email" type="email" autoComplete="username" required maxLength={254} />
      </label>
      <label className="grid gap-1.5 text-xs text-muted">
        Password
        <input className="input" name="password" type="password" autoComplete="current-password" required maxLength={256} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button className="btn btn-primary mt-2 justify-self-start" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in ↗'}
      </button>
    </form>
  );
}
