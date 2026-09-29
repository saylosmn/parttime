import { Zap } from 'lucide-react';
import { pageUser } from '@/lib/guards';
import { Job } from '@/models';

export const metadata = { title: 'Төлбөр' };
export const dynamic = 'force-dynamic';

// Онлайн төлбөр (QPay/Byl) одоохондоо байхгүй. Дансаар шилжүүлсний дараа админ гараар идэвхжүүлнэ.
export default async function BillingPage() {
  const me = await pageUser(['employer']);
  const jobs = await Job.find({ employerId: me.id, status: 'active' }, 'title isFeatured featuredUntil').lean();
  const bank = process.env.BANK_ACCOUNT_INFO || 'Хаан банк · 5000 000 000 · Цаг ХХК';
  const ref = `CAG-${me.id.slice(-4).toUpperCase()}`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="h-display text-2xl">Онцлох зар</h1>
      <div className="card-green p-5">
        <p className="flex items-center gap-2 font-bold">
          <Zap size={18} className="text-urgent" /> 10,000₮ / 7 хоног
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-green-soft">
          <li>Жагсаалтын хамгийн дээр харагдана</li>
          <li>Тухайн дүүргийн тохирох оюутнууд руу push мэдэгдэл очно</li>
        </ul>
      </div>
      <div className="card space-y-3 p-5 text-sm">
        <p className="font-bold">Төлбөр төлөх</p>
        <p className="text-soft">1. Дараах дансанд шилжүүлнэ:</p>
        <p className="rounded-btn bg-sunken p-3 font-semibold">{bank}</p>
        <p className="text-soft">2. Гүйлгээний утга дээр энэ кодыг болон зарын нэрийг бичнэ:</p>
        <p className="h-display rounded-btn bg-sunken p-3 text-lg text-accent">{ref}</p>
        <p className="text-muted">Админ төлбөрийг шалгаад ажлын 1 өдөрт багтаан идэвхжүүлнэ.</p>
      </div>
      {jobs.length > 0 && (
        <div className="card divide-y divide-line">
          {jobs.map((j) => (
            <div key={j._id.toString()} className="flex min-h-[52px] items-center justify-between px-4 text-sm">
              <span className="font-semibold">{j.title}</span>
              <span className={j.isFeatured ? 'text-accent' : 'text-muted'}>
                {j.isFeatured && j.featuredUntil ? `Онцлох · ${new Date(j.featuredUntil).toLocaleDateString('mn-MN')} хүртэл` : 'Энгийн'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
