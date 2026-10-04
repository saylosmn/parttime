'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { CheckCheck, SendHorizontal } from 'lucide-react';
import { api } from '@/lib/client';

type Msg = { id: string; mine: boolean; text: string; at: string; read: boolean; pending?: boolean };

const time = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const day = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

/**
 * Чатын жагсаалт + бичих талбар. Шинэ мессеж LiveRefresh (push эсвэл /api/live)-ээр
 * router.refresh() хийгдэж ирнэ; илгээсэн мессеж шууд (optimistic) харагдана.
 */
export function ChatView({ applicationId, messages }: { applicationId: string; meId: string; messages: Msg[] }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Msg[]>([]);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  // Server-ээс ирсэн жагсаалтад орсон optimistic мессежийг хасна
  const shown = [...messages, ...pending.filter((p) => !messages.some((m) => m.mine && m.text === p.text && Math.abs(+new Date(m.at) - +new Date(p.at)) < 60_000))];

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [shown.length]);

  useEffect(() => {
    // Шинэ мессеж ирэхэд уншсан болгоно
    if (messages.some((m) => !m.mine && !m.read)) api(`/api/messages/${applicationId}`, 'PATCH');
  }, [messages, applicationId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setErr('');
    const temp: Msg = { id: `tmp-${Date.now()}`, mine: true, text: t, at: new Date().toISOString(), read: false, pending: true };
    setPending((p) => [...p, temp]);
    setText('');
    const r = await api(`/api/messages/${applicationId}`, 'POST', { text: t });
    if (!r.ok) {
      setErr(r.error);
      setPending((p) => p.filter((m) => m.id !== temp.id));
      setText(t);
      return;
    }
    router.refresh();
  }

  let lastDay = '';
  return (
    <>
      <div className="flex-1 space-y-1.5 overflow-y-auto py-4">
        {shown.length === 0 && <p className="py-10 text-center text-sm text-muted">Анхны мессежээ бичээрэй. Ярилцлагын цаг, хаяг, авчрах зүйлсээ тохиролцоорой.</p>}
        {shown.map((m) => {
          const d = day(m.at);
          const showDay = d !== lastDay;
          lastDay = d;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] text-muted">{d}</p>}
              <div className={clsx('flex', m.mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={clsx(
                    'max-w-[80%] whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-[15px]',
                    m.mine ? 'rounded-br-md bg-accent text-accent-ink' : 'rounded-bl-md border border-line bg-surface',
                    m.pending && 'opacity-60',
                  )}
                >
                  {m.text}
                  <span className={clsx('ml-2 inline-flex items-center gap-0.5 align-bottom text-[10px]', m.mine ? 'text-accent-ink/70' : 'text-muted')}>
                    {time(m.at)}
                    {m.mine && !m.pending && <CheckCheck size={12} className={m.read ? '' : 'opacity-50'} />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {err && <p className="pb-2 text-sm text-danger">{err}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line pt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget.form as HTMLFormElement).requestSubmit();
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Мессеж бичих…"
          className="input max-h-32 min-h-[48px] resize-none py-3"
          aria-label="Мессеж"
        />
        <button className="btn-primary h-12 w-12 shrink-0 px-0" disabled={!text.trim()} aria-label="Илгээх">
          <SendHorizontal size={20} />
        </button>
      </form>
    </>
  );
}
