/** Google Maps холбоосоос координат гаргаж авах туслахууд. */

// google.com, google.mn, google.co.jp гэх мэт — "google.com.evil.io" шиг домэйныг ТААРУУЛАХГҮЙ
const GOOGLE_HOST = /^(www\.|maps\.)?google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const SHORT_HOSTS = ['maps.app.goo.gl', 'goo.gl'];

function isGoogleHost(host: string) {
  return GOOGLE_HOST.test(host) || SHORT_HOSTS.includes(host) || host === 'consent.google.com';
}

export function isGoogleMapsUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    if (!isGoogleHost(host)) return false;
    if (host === 'goo.gl') return u.pathname.startsWith('/maps');
    if (host === 'maps.app.goo.gl') return true;
    return host.startsWith('maps.') || u.pathname.startsWith('/maps');
  } catch {
    return false;
  }
}

function valid(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** URL текстээс lat,lng-ийг олно (@lat,lng / !3dlat!4dlng / q=lat,lng / ll=lat,lng). */
export function parseLatLng(raw: string): { lat: number; lng: number } | null {
  const s = decodeURIComponent(raw);
  const patterns = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|ll|query|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (valid(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/**
 * Богино холбоосыг (maps.app.goo.gl) дагаж жинхэнэ URL-ийг авна.
 * Зөвхөн Google-ийн host руу redirect-ийг дагана (SSRF-ээс сэргийлнэ).
 */
export async function resolveMapLocation(raw: string) {
  const direct = parseLatLng(raw);
  if (direct) return direct;
  let url = raw;
  for (let i = 0; i < 5; i++) {
    // Redirect бүрийг Google-ийн host мөн эсэхийг дахин шалгана
    let host: string;
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:') return null;
      host = u.hostname.toLowerCase();
    } catch {
      return null;
    }
    if (!isGoogleHost(host)) return null;
    try {
      const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(4000) });
      const next = res.headers.get('location');
      if (!next) return null;
      url = new URL(next, url).href;
      const found = parseLatLng(url);
      if (found) return found;
    } catch {
      return null;
    }
  }
  return null;
}

/** iframe-д ашиглах API key шаардахгүй embed URL. */
export function mapEmbedUrl(opts: { lat?: number; lng?: number; query?: string }) {
  const q = opts.lat != null && opts.lng != null ? `${opts.lat},${opts.lng}` : opts.query ?? '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&hl=mn&output=embed`;
}

export function mapOpenUrl(opts: { mapUrl?: string; lat?: number; lng?: number; query?: string }) {
  if (opts.mapUrl) return opts.mapUrl;
  const q = opts.lat != null && opts.lng != null ? `${opts.lat},${opts.lng}` : opts.query ?? '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
