'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL = 8_000;

/**
 * Refresh дарахгүйгээр хуудсыг шинэчилнэ:
 *  - Push ирэхэд service worker-ийн дохиогоор тэр даруй
 *  - Хуудас харагдаж байх үед 8 секунд тутам /api/live-ийг шалгаж, өөрчлөгдсөн бол
 * router.refresh() нь server өгөгдлийг л шинэчилдэг тул форм, нээлттэй цонхны төлөв хадгалагдана.
 */
export function LiveRefresh() {
  const router = useRouter();
  const last = useRef<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;

    const refresh = () => {
      router.refresh();
      window.dispatchEvent(new Event('notifications:changed'));
    };

    const check = async () => {
      // Суурь утгыг хуудас нуугдмал байсан ч заавал авна — эс бөгөөс дараагийн өөрчлөлтийг алгасна
      if (busy.current || (last.current !== null && document.visibilityState !== 'visible')) return;
      busy.current = true;
      try {
        const r = await fetch('/api/live', { cache: 'no-store' });
        if (r.ok) {
          const { v } = (await r.json()) as { v: string };
          if (last.current !== null && v !== last.current) refresh();
          last.current = v;
        }
      } catch {
        /* сүлжээгүй үед дараагийн удаа */
      } finally {
        busy.current = false;
      }
    };

    const loop = async () => {
      await check();
      if (alive) timer = setTimeout(loop, INTERVAL);
    };
    loop();

    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);

    // Service worker push хүлээн авмагц шууд шинэчилнэ
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'live') {
        last.current = null;
        refresh();
        check();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [router]);

  return null;
}
