/** Client талын жижиг fetch туслах. Алдааны монгол мессежийг буцаана. */
export async function api<T = Record<string, unknown>>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Алдаа гарлаа, дахин оролдоно уу' };
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Сүлжээний алдаа. Интернэтээ шалгана уу.' };
  }
}
