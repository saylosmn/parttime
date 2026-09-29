import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { mapEmbedUrl, mapOpenUrl } from '@/lib/maps';

type Props = { district: string; address?: string; mapUrl?: string; lat?: number; lng?: number };

/** Ажлын байршлыг Google газрын зураг дээр харуулна (API key шаардахгүй embed). */
export function JobMap({ district, address, mapUrl, lat, lng }: Props) {
  const hasPoint = lat != null && lng != null;
  const query = [address, district, 'Улаанбаатар'].filter(Boolean).join(', ');
  const embed = mapEmbedUrl(hasPoint ? { lat, lng } : { query });
  const open = mapOpenUrl({ mapUrl, lat, lng, query });
  const directions = hasPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;

  return (
    <section className="space-y-2.5">
      <h2 className="font-bold">Байршил</h2>
      <div className="overflow-hidden rounded-card border border-line bg-sunken">
        <iframe
          title={`Байршил: ${query}`}
          src={embed}
          className="block h-56 w-full border-0 [filter:invert(0.9)_hue-rotate(180deg)_saturate(0.8)]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="flex items-start gap-3 p-4">
          <MapPin size={18} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">{address || district}</p>
            <p className="text-muted">{address ? `${district}, Улаанбаатар` : 'Улаанбаатар'}</p>
            {!hasPoint && !mapUrl && <p className="mt-1 text-xs text-muted">Ойролцоо байршил (хаягаар хайсан)</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <a href={open} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            <ExternalLink size={16} /> Google Maps
          </a>
          <a href={directions} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <Navigation size={16} /> Чиглэл авах
          </a>
        </div>
      </div>
    </section>
  );
}
