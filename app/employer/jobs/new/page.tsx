import { pageUser } from '@/lib/guards';
import { User } from '@/models';
import { JobForm } from '@/components/forms/JobForm';

export const metadata = { title: 'Шинэ зар' };

export default async function NewJobPage() {
  const me = await pageUser(['employer']);
  const user = await User.findById(me.id, 'companyDistrict').lean();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="h-display text-2xl">Шинэ зар нэмэх</h1>
      <JobForm initial={{ district: user?.companyDistrict ?? '' }} />
    </div>
  );
}
