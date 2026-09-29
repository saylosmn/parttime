import { NextResponse } from 'next/server';

// Android (TWA) апп энэ домэйныг эзэмшдэгийг батална. Үгүй бол апп дээр URL мөр харагдана.
// ANDROID_CERT_SHA256: таслалаар тусгаарласан signing key-ийн SHA-256 fingerprint-ууд
// (Play App Signing ашиглавал Play Console дахь fingerprint-ийг нэмнэ).
export const dynamic = 'force-dynamic';

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const body = fingerprints.length
    ? [
        {
          relation: ['delegate_permission/common.handle_all_urls'],
          target: {
            namespace: 'android_app',
            package_name: process.env.ANDROID_PACKAGE_NAME || 'mn.tsag.app',
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
