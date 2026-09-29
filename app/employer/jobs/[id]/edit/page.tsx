import { notFound } from 'next/navigation';
import { Types } from 'mongoose';
import { pageUser } from '@/lib/guards';
import { Job } from '@/models';
import { JobForm } from '@/components/forms/JobForm';
import type { JobTag, PayUnit } from '@/lib/config';

export const metadata = { title: 'Зар засах' };
export const dynamic = 'force-dynamic';

export default async function EditJobPage({ params }: { params: { id: string } }) {
  const me = await pageUser(['employer']);
  if (!Types.ObjectId.isValid(params.id)) notFound();
  const job = await Job.findById(params.id).lean();
  if (!job || (job.employerId.toString() !== me.id && me.role !== 'admin')) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="h-display text-2xl">Зар засах</h1>
      <JobForm
        id={job._id.toString()}
        initial={{
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          payAmount: job.payAmount,
          payUnit: job.payUnit as PayUnit,
          district: job.district,
          address: job.address ?? '',
          schedule: job.schedule,
          tags: job.tags as JobTag[],
          isUrgent: job.isUrgent,
        }}
      />
    </div>
  );
}
