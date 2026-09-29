import { resolveMapLocation } from './maps';

/** Google Maps холбоосоос координатыг гаргаж хадгална (олдохгүй бол зөвхөн холбоос). */
export async function mapFields(mapUrl?: string) {
  if (!mapUrl) return { mapUrl: undefined, location: undefined };
  const location = (await resolveMapLocation(mapUrl)) ?? undefined;
  return { mapUrl, location };
}
