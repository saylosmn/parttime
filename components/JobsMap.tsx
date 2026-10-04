'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LocateFixed, MapPinOff } from 'lucide-react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { JobRow } from './JobCard';
import type { JobCard } from '@/lib/queries';

const UB: [number, number] = [47.9185, 106.917];

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(1)} км`);

export function JobsMap({ jobs, missing }: { jobs: JobCard[]; missing: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locErr, setLocErr] = useState('');
  const [active, setActive] = useState<string | null>(null);

  // Leaflet нь window шаарддаг тул client дээр л ачаална
  useEffect(() => {
    let cancelled = false;
    const markerMap = markers.current;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(UB, 12);
      L.control.zoom({ position: 'bottomright' }).addTo(m);
      // OpenStreetMap (түлхүүр шаардахгүй); globals.css-д хар өнгөтэй болгосон
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      for (const j of jobs) {
        if (!j.location) continue;
        const price = `${Math.round(j.payAmount / 1000)}к₮`;
        const icon = L.divIcon({
          className: '',
          html: `<div class="tsag-pin${j.isUrgent ? ' urgent' : ''}">${price}</div>`,
          iconSize: [52, 28],
          iconAnchor: [26, 28],
        });
        const mk = L.marker([j.location.lat, j.location.lng], { icon, title: j.title }).addTo(m);
        mk.on('click', () => {
          setActive(j._id);
          document.getElementById(`map-job-${j._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        markerMap.set(j._id, mk);
      }
      if (jobs.length > 1) {
        const pts = jobs.filter((j) => j.location).map((j) => [j.location!.lat, j.location!.lng] as [number, number]);
        m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14 });
      }
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markerMap.clear();
    };
  }, [jobs]);

  const sorted = useMemo(() => {
    if (!me) return jobs.map((j) => ({ j, km: null as number | null }));
    return jobs
      .map((j) => ({ j, km: distanceKm(me, j.location!) }))
      .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
  }, [jobs, me]);

  async function locate() {
    setLocErr('');
    if (!('geolocation' in navigator)) return setLocErr('Таны төхөөрөмж байршил тодорхойлохыг дэмжихгүй байна');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(p);
        const L = (await import('leaflet')).default;
        if (!map.current) return;
        L.circleMarker([p.lat, p.lng], { radius: 8, color: '#06120A', weight: 3, fillColor: '#34D17A', fillOpacity: 1 }).addTo(map.current);
        map.current.setView([p.lat, p.lng], 14);
      },
      () => setLocErr('Байршил авах зөвшөөрөл өгөөгүй байна. Browser-ийн тохиргооноос зөвшөөрнө үү.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-card border border-line">
        <div ref={el} className="h-[55dvh] min-h-[320px] w-full bg-sunken" aria-label="Ажлын байрны газрын зураг" />
        <button onClick={locate} className="btn-primary absolute left-3 top-3 z-[500] px-3 shadow-none">
          <LocateFixed size={16} /> Надад ойр
        </button>
      </div>
      {locErr && <p className="text-sm text-danger">{locErr}</p>}

      {jobs.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <MapPinOff size={22} className="text-muted" />
          <p className="font-semibold">Газрын зураг дээр байршил оруулсан зар алга</p>
          <Link href="/" className="text-sm font-semibold text-accent">
            Бүх зарыг жагсаалтаар үзэх
          </Link>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="font-bold">{me ? 'Ойроос нь эрэмбэлсэн' : 'Газрын зураг дээрх зарууд'}</h2>
          {sorted.map(({ j, km }) => (
            <div
              key={j._id}
              id={`map-job-${j._id}`}
              className={active === j._id ? 'rounded-card ring-2 ring-accent' : ''}
              onMouseEnter={() => {
                const mk = markers.current.get(j._id);
                if (mk && map.current) map.current.panTo(mk.getLatLng());
              }}
            >
              {km != null && <p className="mb-1 text-xs font-semibold text-accent">{fmtKm(km)} зайтай</p>}
              <JobRow job={j} />
            </div>
          ))}
        </section>
      )}
      {missing > 0 && (
        <p className="text-center text-xs text-muted">
          Байршил оруулаагүй {missing} зар газрын зураг дээр харагдахгүй. <Link href="/" className="text-accent">Жагсаалтаар үзэх</Link>
        </p>
      )}
    </div>
  );
}
