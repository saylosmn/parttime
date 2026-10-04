'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const FALLBACK_INTERVAL = 8_000; // Stream ажиллахгүй үеийн нөөц шалгалт
const STREAM_OK_INTERVAL = 30_000; // Stream ажиллаж байх үед зөвхөн баталгаажуулах шалгалт

/**
 * Refresh дарахгүйгээр хуудсыг ШУУД шинэчилнэ:
 *  1. /api/live/stream (Server-Sent Events + MongoDB Change Stream) — DB өөрчлөгдмөгц дохио ирнэ
 *  2. Push ирэхэд service worker-ийн дохио
 *  3. Нөөц: stream тасарсан үед /api/live-ийг 8 секунд тутам шалгана
 * router.refresh() нь server өгөгдлийг л шинэчилдэг тул форм, нээлттэй цонхны төлөв хадгалагдана.
 */
export function LiveRefresh() {
  const router = useRouter();
  const last = useRef<string | null>(null);
  const busy = useRef(false);
  const streamUp = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    let es: EventSource | null = null;
    let refreshQueued: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      // Богино хугацаанд олон дохио ирвэл нэг удаа шинэчилнэ
      if (refreshQueued) return;
      refreshQueued = setTimeout(() => {
        refreshQueued = null;
        router.refresh();
        window.dispatchEvent(new Event('notifications:changed'));
      }, 100);
    };

    const check = async () => {
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
      if (alive) timer = setTimeout(loop, streamUp.current ? STREAM_OK_INTERVAL : FALLBACK_INTERVAL);
    };
    loop();

    const openStream = () => {
      if (!('EventSource' in window) || es || document.visibilityState !== 'visible') return;
      es = new EventSource('/api/live/stream');
      es.addEventListener('ready', () => {
        // Холбогдох хооронд алдагдсан өөрчлөлтийг нөхөж шалгана
        if (!streamUp.current) check();
        streamUp.current = true;
      });
      es.addEventListener('change', () => {
        refresh();
        check(); // хувилбарын тэмдгийг шинэчилнэ
      });
      es.onerror = () => {
        // EventSource өөрөө дахин холбогдоно; энэ хооронд нөөц шалгалт ажиллана
        streamUp.current = false;
      };
    };
    const closeStream = () => {
      es?.close();
      es = null;
      streamUp.current = false;
    };
    openStream();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        openStream();
        check();
      } else {
        // Нуугдмал tab-д холболт барихгүй (батерей, серверийн ачаалал)
        closeStream();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);

    // Service worker push хүлээн авмагц шууд шинэчилнэ
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'live') {
        refresh();
        check();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    return () => {
      alive = false;
      clearTimeout(timer);
      if (refreshQueued) clearTimeout(refreshQueued);
      closeStream();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [router]);

  return null;
}
