/** Client талын жижиг fetch туслах. Алдааны монгол мессежийг буцаана. */
export async function api<T = Record<string, unknown>>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Zod-ийн алдааг талбар бүрээр нь (эхний мессеж) буцаана — формын тухайн талбарт харуулна
      const fields: Record<string, string> = {};
      for (const i of (data.issues ?? []) as { path?: (string | number)[]; message: string }[]) {
        const k = String(i.path?.[0] ?? '');
        if (k && !fields[k]) fields[k] = i.message;
      }
      return { ok: false, error: data.error || 'Алдаа гарлаа, дахин оролдоно уу', fields };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Сүлжээний алдаа. Интернэтээ шалгана уу.' };
  }
}
