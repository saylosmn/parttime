'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Download, Share, SquarePlus, Smartphone, X } from 'lucide-react';

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const ASK_KEY = 'tsag:askPush';
const DISMISS_KEY = 'tsag:pushDismissed';

function store(k: string, v?: string) {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {}
  return null;
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Push зөвшөөрөл авч subscription-ыг сервер рүү хадгална. */
export async function enablePush(): Promise<'granted' | 'denied' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported';
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return 'error';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    return res.ok ? 'granted' : 'error';
  } catch (e) {
    console.error(e);
    return 'error';
  }
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  }
}

/** Анхны өргөдөл/зар илгээсний дараа дуудна — дараагийн хуудсанд PushPrompt гарна. */
export function requestPushPromptLater() {
  store(ASK_KEY, '1');
}

export function IOSInstallSteps() {
  return (
    <ol className="space-y-2.5 text-sm text-soft">
      <li className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
          <Share size={16} />
        </span>
        Safari-ийн доод хэсэгт байрлах «Хуваалцах» товчийг дарна
      </li>
      <li className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
          <SquarePlus size={16} />
        </span>
        «Нүүр дэлгэцэд нэмэх» (Add to Home Screen)-ийг сонгоно
      </li>
      <li className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
          <Smartphone size={16} />
        </span>
        Нүүр дэлгэцээс апп-аа нээгээд мэдэгдлийг асаана
      </li>
    </ol>
  );
}

/**
 * "Мэдэгдэл авах уу?" карт. Хуудас нээгдмэгц зөвшөөрөл асуухгүй —
 * зөвхөн анхны өргөдөл/зар илгээсний дараа эсвэл `force` үед харагдана.
 */
export function PushPrompt({ force = false }: { force?: boolean }) {
  const [mode, setMode] = useState<'hidden' | 'ask' | 'ios'>('hidden');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const wanted = force || store(ASK_KEY) === '1';
    if (!wanted || store(DISMISS_KEY) === '1') return;
    if (isIOS() && !isStandalone()) return setMode('ios');
    if (!pushSupported() || Notification.permission !== 'default') return;
    setMode('ask');
  }, [force]);

  const close = () => {
    store(DISMISS_KEY, '1');
    store(ASK_KEY, '0');
    setMode('hidden');
  };

  if (mode === 'hidden') return null;
  return (
    <div className="card-green relative p-5">
      <button onClick={close} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-muted" aria-label="Хаах">
        <X size={18} />
      </button>
      <div className="flex items-center gap-3 pr-8">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
          <Bell size={20} />
        </span>
        <div>
          <p className="font-bold">{mode === 'ios' ? 'Апп болгон суулгах' : 'Мэдэгдэл авах уу?'}</p>
          <p className="text-sm text-green-soft">
            {mode === 'ios' ? 'iPhone дээр push мэдэгдэл авахын тулд нүүр дэлгэцэд нэмнэ үү.' : 'Ярилцлагын урилга, хариуг шууд утсандаа аваарай.'}
          </p>
        </div>
      </div>
      {mode === 'ios' ? (
        <div className="mt-4">
          <IOSInstallSteps />
        </div>
      ) : (
        <>
          <button
            className="btn-primary mt-4 w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await enablePush();
              setBusy(false);
              if (r === 'granted') close();
              else if (r === 'denied') {
                setMsg('Та зөвшөөрөөгүй байна. Browser-ийн тохиргооноос асааж болно.');
                store(ASK_KEY, '0');
              } else setMsg('Мэдэгдэл асаахад алдаа гарлаа.');
            }}
          >
            Мэдэгдэл асаах
          </button>
          {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
        </>
      )}
    </div>
  );
}

/** Нэвтрээгүй хэрэглэгчид "Апп суулгах" санал (Android/desktop: native prompt, iOS: заавар). */
export function InstallBanner() {
  const { canInstall, install, ios, standalone } = useInstall();
  const [open, setOpen] = useState(false);
  if (standalone || (!canInstall && !ios)) return null;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-bg text-accent">
          <Download size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Апп болгон суулгах</p>
          <p className="text-sm text-muted">Нүүр дэлгэцэд нэмээд push мэдэгдэл аваарай</p>
        </div>
        <button className="btn-primary px-4" onClick={() => (ios ? setOpen((o) => !o) : install())}>
          Суулгах
        </button>
      </div>
      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <IOSInstallSteps />
        </div>
      )}
    </div>
  );
}

export function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    setIos(isIOS());
    setStandalone(isStandalone());
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const install = useCallback(async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  }, [evt]);
  return { canInstall: Boolean(evt), install, ios, standalone };
}

/** Профайл дээрх Push асаах/унтраах toggle. */
export function PushToggle() {
  const [on, setOn] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'unsupported' | 'ios'>('loading');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    (async () => {
      if (isIOS() && !isStandalone()) return setState('ios');
      if (!pushSupported()) return setState('unsupported');
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setOn(Boolean(sub) && Notification.permission === 'granted');
      setState('ready');
    })();
  }, []);

  if (state === 'ios') return <span className="text-sm text-muted">Эхлээд нүүр дэлгэцэд нэмнэ үү</span>;
  if (state === 'unsupported') return <span className="text-sm text-muted">Дэмжигдэхгүй</span>;
  return (
    <span className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted">{msg}</span>}
      <button
        role="switch"
        aria-checked={on}
        aria-label="Push мэдэгдэл"
        disabled={state === 'loading'}
        onClick={async () => {
          setMsg('');
          if (on) {
            await disablePush();
            setOn(false);
          } else {
            const r = await enablePush();
            if (r === 'granted') setOn(true);
            else setMsg(r === 'denied' ? 'Зөвшөөрөөгүй' : 'Алдаа');
          }
        }}
        className={`relative h-8 w-14 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface-2 border border-line'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-text transition-all ${on ? 'left-7' : 'left-1'}`} />
      </button>
    </span>
  );
}

export function InstallRow() {
  const { canInstall, install, ios, standalone } = useInstall();
  const [open, setOpen] = useState(false);
  if (standalone) return null;
  return (
    <div>
      <button onClick={() => (ios || !canInstall ? setOpen((o) => !o) : install())} className="flex min-h-[52px] w-full items-center justify-between px-4 text-left">
        <span>Апп болгон суулгах</span>
        <Download size={18} className="text-muted" />
      </button>
      {open && (
        <div className="px-4 pb-4">
          {ios ? <IOSInstallSteps /> : <p className="text-sm text-muted">Browser-ийн цэснээс «Install app» / «Нүүр дэлгэцэд нэмэх»-ийг сонгоно уу.</p>}
        </div>
      )}
    </div>
  );
}
