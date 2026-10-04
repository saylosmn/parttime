import { Types } from 'mongoose';
import { Job, User } from '@/models';
import { DISTRICTS, type PayUnit, type JobTag } from './config';
import { plain } from './services';

export type JobCard = {
  _id: string;
  title: string;
  payAmount: number;
  payUnit: PayUnit;
  district: string;
  schedule: string;
  tags: JobTag[];
  isUrgent: boolean;
  isFeatured: boolean;
  createdAt: string;
  location?: { lat: number; lng: number } | null;
  employer: { _id: string; name: string; verified: boolean; ratingAvg: number; ratingCount: number };
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchJobs(params: Record<string, string | undefined>, limit = 50): Promise<JobCard[]> {
  const now = new Date();
  const q: Record<string, unknown> = { status: 'active', expiresAt: { $gt: now } };
  if (params.q) {
    const rx = new RegExp(escapeRegex(params.q.slice(0, 60)), 'i');
    q.$or = [{ title: rx }, { description: rx }];
  }
  if (params.tag === 'weekend' || params.tag === 'evening' || params.tag === 'remote' || params.tag === 'no_experience') {
    q.tags = params.tag;
  }
  if (params.district && (DISTRICTS as readonly string[]).includes(params.district)) q.district = params.district;
  if (params.minPay && Number(params.minPay) > 0) q.payAmount = { $gte: Number(params.minPay) };

  const jobs = await Job.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('employerId', 'name companyName verified ratingAvg ratingCount')
    .lean();

  return jobs.map((j) => toCard(j, now));
}

export function toCard(j: any, now = new Date()): JobCard {
  const e = j.employerId ?? {};
  return plain({
    _id: j._id.toString(),
    title: j.title,
    payAmount: j.payAmount,
    payUnit: j.payUnit,
    district: j.district,
    schedule: j.schedule,
    tags: j.tags ?? [],
    isUrgent: Boolean(j.isUrgent),
    isFeatured: Boolean(j.isFeatured && (!j.featuredUntil || new Date(j.featuredUntil) > now)),
    location: j.location?.lat != null && j.location?.lng != null ? { lat: j.location.lat, lng: j.location.lng } : null,
    createdAt: j.createdAt,
    employer: {
      _id: e._id?.toString() ?? '',
      name: e.companyName || e.name || 'Ажил олгогч',
      verified: Boolean(e.verified),
      ratingAvg: e.ratingAvg ?? 0,
      ratingCount: e.ratingCount ?? 0,
    },
  });
}

export async function getJob(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  const job = await Job.findById(id).populate('employerId', 'name companyName verified ratingAvg ratingCount companyDistrict').lean();
  return job;
}

export async function hiredCount(employerId: string) {
  const { Application } = await import('@/models');
  return Application.countDocuments({ employerId, status: { $in: ['hired', 'completed'] } });
}

export async function getUser(id: string) {
  return User.findById(id).lean();
}
