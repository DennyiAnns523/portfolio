'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from './api';

export function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut(everywhere: boolean) {
    if (everywhere && !window.confirm('Sign out every device, including this one?')) return;
    setBusy(true);
    await send('/api/admin/logout', 'POST', { everywhere });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" disabled={busy} onClick={() => signOut(false)}>
        Sign out
      </button>
      <button type="button" className="btn" disabled={busy} onClick={() => signOut(true)}>
        Sign out everywhere
      </button>
    </div>
  );
}
