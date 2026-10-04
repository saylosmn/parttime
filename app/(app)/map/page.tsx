import { dbConnect } from '@/lib/db';
import { searchJobs } from '@/lib/queries';
import { JobsMap } from '@/components/JobsMap';

export const metadata = { title: 'Газрын зураг' };
export const dynamic = 'force-dynamic';

/** Бүх идэвхтэй зарыг газрын зураг дээр харуулна. "Надад ойр" — байршлаар эрэмбэлнэ. */
export default async function MapPage() {
  await dbConnect();
  const jobs = await searchJobs({}, 300);
  const withLoc = jobs.filter((j) => j.location);
  const without = jobs.length - withLoc.length;
  return (
    <div className="space-y-4">
      <h1 className="h-display text-2xl">Газрын зураг</h1>
      <JobsMap jobs={withLoc} missing={without} />
    </div>
  );
}
