import type { PayUnit } from './config';

/**
 * Хуурамч/залилангийн шинжтэй зарыг илрүүлэх энгийн дүрмүүд.
 * Зарыг блоклохгүй — зөвхөн админд анхааруулга (flagReasons) өгнө.
 */

// Нэгж тус бүрийн "хэт өндөр" цалингийн босго
const PAY_CEILING: Record<PayUnit, number> = { hour: 50_000, day: 400_000, task: 500_000, month: 5_000_000 };

const SUSPICIOUS: { re: RegExp; reason: string }[] = [
  { re: /урьдчилгаа|барьцаа|хураамж|бүртгэлийн төлбөр|эхлээд\s+төл|мөнгө\s+шилжүүл/i, reason: 'Ажил горилогчоос мөнгө нэхэж байж болзошгүй' },
  { re: /крипто|crypto|bitcoin|usdt|forex|форекс|хөрөнгө оруул/i, reason: 'Крипто/хөрөнгө оруулалтын санал' },
  { re: /гэрээсээ\s+(хялбар|амархан)|хялбар\s+мөнгө|өдөрт\s+\d{3,}\s*(000|мянга)/i, reason: '"Хялбар мөнгө" маягийн амлалт' },
  { re: /паспорт|иргэний үнэмлэх.*(илгээ|зураг)|картын\s+(дугаар|мэдээлэл)|нууц\s+үг/i, reason: 'Хувийн мэдээлэл, бичиг баримт нэхэж байна' },
  { re: /t\.me\/|telegram|вайбер|viber|whatsapp|wa\.me/i, reason: 'Гадны мессенжер рүү урьж байна' },
  { re: /\b\d{4}[\s-]?\d{4}\b/, reason: 'Тайлбарт утасны дугаар бичсэн (апп доторх урилгыг тойрох)' },
  { re: /https?:\/\/(?!(www\.)?google\.[a-z.]+\/maps|maps\.app\.goo\.gl)/i, reason: 'Гадны холбоос агуулсан' },
];

export function moderateJob(job: { title: string; description: string; requirements?: string[]; payAmount: number; payUnit: PayUnit }) {
  const reasons: string[] = [];
  const text = [job.title, job.description, ...(job.requirements ?? [])].join('\n');
  for (const s of SUSPICIOUS) if (s.re.test(text)) reasons.push(s.reason);
  if (job.payAmount > PAY_CEILING[job.payUnit]) reasons.push(`Цалин хэт өндөр (${job.payAmount.toLocaleString('en-US')}₮)`);
  if (/(.)\1{6,}/.test(text) || (text.match(/[!]{3,}/g)?.length ?? 0) > 0) reasons.push('Спам маягийн бичвэр');
  return { flagged: reasons.length > 0, flagReasons: reasons };
}
