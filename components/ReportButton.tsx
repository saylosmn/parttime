'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, X } from 'lucide-react';
import { api } from '@/lib/client';

export function ReportButton({ jobId, loggedIn }: { jobId: string; loggedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');

  return (
    <>
      <button
        className="btn-ghost px-3 text-muted"
        onClick={() => (loggedIn ? setOpen(true) : router.push(`/login?callbackUrl=/jobs/${jobId}`))}
      >
        <Flag size={16} /> Гомдол мэдүүлэх
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setOpen(false)}>
          <div className="safe-bottom w-full max-w-lg rounded-t-[24px] border border-line bg-surface p-5 sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="h-display text-lg">Гомдол мэдүүлэх</h2>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Хаах">
                <X size={18} />
              </button>
            </div>
            {state === 'done' ? (
              <p className="py-6 text-center text-soft">Баярлалаа. Админ удахгүй шалгана.</p>
            ) : (
              <>
                <textarea
                  className="input py-3"
                  rows={4}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Юу буруу байгааг бичнэ үү (хуурамч зар, цалин өгөөгүй, гэх мэт)"
                />
                {err && <p className="mt-2 text-sm text-danger">{err}</p>}
                <button
                  className="btn-primary mt-4 w-full"
                  disabled={state === 'busy' || reason.trim().length < 5}
                  onClick={async () => {
                    setState('busy');
                    const r = await api('/api/reports', 'POST', { jobId, reason });
                    if (!r.ok) {
                      setErr(r.error);
                      setState('idle');
                    } else setState('done');
                  }}
                >
                  Илгээх
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
