import { randomInt } from 'node:crypto';
import { Payment } from '@/models';
import { FEATURE_PRICE } from './config';

/**
 * Тухайн зарын нээлттэй төлбөрийг буцаана, байхгүй бол санамсаргүй 4 оронтой
 * гүйлгээний утгатай шинээр үүсгэнэ. (Админд мэдэгдэхгүй — "шилжүүлсэн" дарахад л мэдэгдэнэ.)
 */
export async function getOrCreateOpenPayment(employerId: string, jobId: string) {
  const existing = await Payment.findOne({ jobId, employerId, open: true }).lean();
  if (existing) return existing;
  for (let i = 0; i < 10; i++) {
    const code = String(randomInt(1000, 10000));
    try {
      const p = await Payment.create({ employerId, jobId, code, amount: FEATURE_PRICE.amount, days: FEATURE_PRICE.days });
      return p.toObject();
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
      // Зэрэг хүсэлтээс болж тухайн зарт аль хэдийн үүссэн бол түүнийг буцаана
      const again = await Payment.findOne({ jobId, employerId, open: true }).lean();
      if (again) return again;
    }
  }
  throw new Error('Гүйлгээний утга үүсгэж чадсангүй');
}
