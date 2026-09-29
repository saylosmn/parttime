// PWA icon-уудыг SVG-ээс үүсгэнэ: `npm run icons`
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

// Цагны icon (lucide "clock"-той ижил хэлбэр)
const clock = (stroke) => `
  <circle cx="12" cy="12" r="10" fill="none" stroke="${stroke}" stroke-width="2.5"/>
  <path d="M12 6v6l4 2" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

function svg({ size, pad, radius, bg = '#34D17A', fg = '#06120A', canvas = null }) {
  const inner = size - pad * 2;
  const scale = inner / 24;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${canvas ? `<rect width="${size}" height="${size}" fill="${canvas}"/>` : ''}
    <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
    <g transform="translate(${pad} ${pad}) scale(${scale})">${clock(fg)}</g>
  </svg>`);
}

const jobs = [
  ['icon-192.png', svg({ size: 192, pad: 44, radius: 44 })],
  ['icon-512.png', svg({ size: 512, pad: 118, radius: 116 })],
  // Maskable: safe zone (80%) дотор багтаана, радиусгүй
  ['maskable-512.png', svg({ size: 512, pad: 150, radius: 0 })],
  ['apple-touch-icon.png', svg({ size: 180, pad: 42, radius: 0 })],
  // Android status bar badge: зөвхөн цагаан дүрс, тунгалаг дэвсгэр
  ['badge-72.png', svg({ size: 72, pad: 8, radius: 0, bg: 'transparent', fg: '#FFFFFF' })],
];

for (const [name, buf] of jobs) {
  await sharp(buf).png().toFile(`public/icons/${name}`);
  console.log('✓', name);
}
await sharp(svg({ size: 32, pad: 6, radius: 8 })).png().toFile('app/icon.png');
console.log('✓ app/icon.png');

// Android (TWA) апп-ын icon-ууд
const RES = 'android/app/src/main/res';
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(densities)) {
  mkdirSync(`${RES}/mipmap-${d}`, { recursive: true });
  const s = Math.round(48 * k);
  await sharp(svg({ size: s, pad: Math.round(s * 0.23), radius: Math.round(s * 0.22) })).png().toFile(`${RES}/mipmap-${d}/ic_launcher.png`);
  mkdirSync(`${RES}/drawable-${d}`, { recursive: true });
  const n = Math.round(24 * k);
  await sharp(svg({ size: n, pad: Math.round(n * 0.08), radius: 0, bg: 'transparent', fg: '#FFFFFF' })).png().toFile(`${RES}/drawable-${d}/ic_notification.png`);
}
mkdirSync(`${RES}/drawable`, { recursive: true });
await sharp(svg({ size: 288, pad: 66, radius: 64 })).png().toFile(`${RES}/drawable/splash.png`);
console.log('✓ android icons');
