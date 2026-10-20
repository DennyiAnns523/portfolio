/** JSON request to our own API from admin client components. `error` is null on success. */
export async function send(url: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown = {}): Promise<{ status: number; error: string | null }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    if (res.ok) return { status: res.status, error: null };
    const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
    return { status: res.status, error: typeof data?.error === 'string' ? data.error : `Request failed (${res.status}).` };
  } catch {
    return { status: 0, error: 'Network error. Check your connection.' };
  }
}
