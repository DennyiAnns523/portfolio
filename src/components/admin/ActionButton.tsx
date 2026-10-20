'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { send } from './api';

interface Props {
  url: string;
  method: 'PATCH' | 'DELETE';
  body?: unknown;
  label: string;
  confirm?: string;
  danger?: boolean;
}

/** Calls an admin API endpoint, then re-renders the server page with fresh data. */
export function ActionButton({ url, method, body, label, confirm, danger }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    const result = await send(url, method, body);
    setBusy(false);
    if (result.status === 401) {
      router.replace('/admin/login');
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={run} disabled={busy || refreshing} className={`btn ${danger ? 'btn-danger' : ''}`}>
        {label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
