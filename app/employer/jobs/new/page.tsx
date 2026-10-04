import { Types } from 'mongoose';
import { pageUser } from '@/lib/guards';
import { Job, User } from '@/models';
import { JobForm, type JobValues } from '@/components/forms/JobForm';
import type { JobTag, PayUnit } from '@/lib/config';

export const metadata = { title: 'Шинэ зар' };
export const dynamic = 'force-dynamic';

/**
 * Шинэ зар. `?from=<id>` өгвөл өмнөх зарыг хуулж бөглөнө.
 * Үгүй бол компанийн дүүрэг, хаяг, газрын зургийг профайлаас автоматаар бөглөнө.
 */
export default async function NewJobPage(props: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await props.searchParams;
  const me = await pageUser(['employer']);
  const user = await User.findById(me.id, 'companyDistrict companyAddress companyMapUrl').lean();

  let initial: Partial<JobValues> = {
    district: user?.companyDistrict ?? '',
    address: user?.companyAddress ?? '',
    mapUrl: user?.companyMapUrl ?? '',
  };
  let copiedFrom: string | null = null;
  if (from && Types.ObjectId.isValid(from)) {
    const src = await Job.findOne({ _id: from, employerId: me.id }).lean();
    if (src) {
      copiedFrom = src.title;
      initial = {
        title: src.title,
        description: src.description,
        requirements: src.requirements,
        payAmount: src.payAmount,
        payUnit: src.payUnit as PayUnit,
        district: src.district,
        address: src.address ?? '',
        mapUrl: src.mapUrl ?? '',
        schedule: src.schedule,
        tags: src.tags as JobTag[],
        isUrgent: false,
      };
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="h-display text-2xl">Шинэ зар нэмэх</h1>
      {copiedFrom && <p className="card-green px-4 py-3 text-sm text-green-soft">«{copiedFrom}» зараас хуулсан. Шаардлагатай бол засаад илгээнэ үү.</p>}
      <JobForm initial={initial} />
    </div>
  );
}
