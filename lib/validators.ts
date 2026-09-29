import { z } from 'zod';
import { DISTRICTS } from './config';

// Тусгай мессежгүй алдаанд монгол хэлээр хариулна
z.config({
  customError: (iss) => {
    if (iss.code === 'invalid_type') return iss.input === undefined ? 'Заавал бөглөх талбар дутуу байна' : 'Буруу утга';
    if (iss.code === 'too_big') return 'Хэт урт байна';
    if (iss.code === 'too_small') return 'Хэт богино байна';
    return undefined;
  },
});

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Буруу ID');
const phone = z
  .string()
  .trim()
  .regex(/^(\+976)?\s?\d{4}\s?\d{4}$/, 'Утасны дугаар буруу байна (8 оронтой)');
const district = z.enum(DISTRICTS, { message: 'Дүүрэг сонгоно уу' });

export const onboardingSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('student'),
    name: z.string().trim().min(2, 'Нэрээ оруулна уу').max(60),
    phone,
    school: z.string().trim().min(2, 'Сургуулиа оруулна уу').max(80),
    course: z.coerce.number().int().min(1).max(6),
    district,
    availability: z.array(z.enum(['weekday_day', 'weekday_evening', 'weekend'])).min(1, 'Чөлөөт цагаа сонгоно уу'),
    bio: z.string().trim().max(300).optional(),
  }),
  z.object({
    role: z.literal('employer'),
    name: z.string().trim().min(2, 'Нэрээ оруулна уу').max(60),
    phone,
    companyName: z.string().trim().min(2, 'Байгууллагын нэр оруулна уу').max(80),
    companyDistrict: district,
  }),
]);

export const studentProfileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone,
  school: z.string().trim().min(2).max(80),
  course: z.coerce.number().int().min(1).max(6),
  district,
  availability: z.array(z.enum(['weekday_day', 'weekday_evening', 'weekend'])).min(1, 'Чөлөөт цагаа сонгоно уу'),
  bio: z.string().trim().max(300).optional().default(''),
});

export const employerProfileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone,
  companyName: z.string().trim().min(2).max(80),
  companyDistrict: district,
});

const NEGOTIABLE = /тохиролц|тохирно|negotiable/i;

export const jobSchema = z.object({
  title: z.string().trim().min(3, 'Гарчиг хэт богино').max(80),
  description: z.string().trim().min(20, 'Хийх ажлаа дор хаяж 20 тэмдэгтээр тайлбарлана уу').max(3000),
  requirements: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  payAmount: z.coerce.number({ message: 'Цалин заавал' }).int().min(1000, 'Цалингийн дүн заавал (≥1,000₮)').max(20_000_000),
  payUnit: z.enum(['hour', 'day', 'task', 'month']),
  district,
  address: z.string().trim().max(200).optional(),
  schedule: z
    .string()
    .trim()
    .min(3, 'Хуваарь заавал')
    .max(80)
    .refine((s) => !NEGOTIABLE.test(s), '"Тохиролцоно" гэж бичихгүй, тодорхой хуваарь оруулна уу'),
  tags: z.array(z.enum(['weekend', 'evening', 'remote', 'no_experience'])).default([]),
  isUrgent: z.boolean().default(false),
});

export const applySchema = z.object({
  jobId: objectId,
  message: z.string().trim().max(500).optional(),
});

export const applicationActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('invite'), interviewAt: z.coerce.date() }),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('hire') }),
  z.object({ action: z.literal('complete') }),
  z.object({ action: z.literal('accept_invite') }),
  z.object({ action: z.literal('reschedule'), note: z.string().trim().min(2).max(200) }),
]);

export const reviewSchema = z.object({
  applicationId: objectId,
  stars: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(40)).max(4).default([]),
  comment: z.string().trim().max(300, '300 тэмдэгтээс хэтрэхгүй').optional(),
});

export const pushSubSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const reportSchema = z.object({
  jobId: objectId,
  reason: z.string().trim().min(5, 'Шалтгаанаа бичнэ үү').max(500),
});

export const adminJobSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().min(3, 'Шалтгаан заавал').max(300) }),
  z.object({ action: z.literal('feature'), days: z.coerce.number().int().min(1).max(60) }),
  z.object({ action: z.literal('unfeature') }),
  z.object({ action: z.literal('close') }),
]);
