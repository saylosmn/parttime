export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Цаг';
export const APP_TAGLINE = 'Оюутны part-time ажил';

export const DISTRICTS = [
  'Баянзүрх', 'Сүхбаатар', 'Чингэлтэй', 'Хан-Уул', 'Баянгол',
  'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай',
] as const;

export const PAY_UNITS = { hour: 'цаг', day: 'өдөр', task: 'ажил', month: 'сар' } as const;
export type PayUnit = keyof typeof PAY_UNITS;
export const PAY_PER = { hour: 'цагт', day: 'өдөрт', task: 'ажилд', month: 'сард' } as const;

export const TAGS = {
  weekend: 'Амралтын өдөр',
  evening: 'Орой',
  remote: 'Зайнаас',
  no_experience: 'Туршлага хэрэггүй',
} as const;
export type JobTag = keyof typeof TAGS;

export const AVAILABILITY = {
  weekday_day: 'Ажлын өдөр, өдөр',
  weekday_evening: 'Ажлын өдөр, орой',
  weekend: 'Амралтын өдөр',
} as const;
export type Availability = keyof typeof AVAILABILITY;

export const APP_STATUS = {
  sent: 'Илгээсэн',
  viewed: 'Үзсэн',
  invited: 'Урьсан',
  rejected: 'Татгалзсан',
  hired: 'Ажилд орсон',
  completed: 'Дууссан',
} as const;
export type AppStatus = keyof typeof APP_STATUS;

export const JOB_STATUS = {
  pending: 'Хүлээгдэж буй',
  active: 'Идэвхтэй',
  closed: 'Хаагдсан',
  rejected: 'Татгалзсан',
} as const;

export const REVIEW_TAGS = {
  student_to_employer: ['Цалингаа цагт нь өгсөн', 'Найрсаг', 'Зар үнэн байсан', 'Хэт ачаалалтай'],
  employer_to_student: ['Цагтаа ирсэн', 'Хичээнгүй', 'Дахин ажиллуулна', 'Ирээгүй'],
} as const;

/** Онцлох зарын төлбөр хүлээн авах данс (Төлбөр хуудсанд харагдана). */
export const BANK = {
  bankName: 'Mbank',
  iban: '020039008000499100',
  account: '8000499100',
  holder: 'Sanjid',
};

/** Онцлох зарын үнэ: 7 хоног = 10,000₮ */
export const FEATURE_PRICE = { amount: 10_000, days: 7 };

export const LIMITS = {
  applicationsPerDay: 20,
  jobsPerDay: 10,
  urgentBroadcastMax: 200,
  jobLifetimeDays: 30,
  reviewRevealDays: 7,
  minRatingsForAvg: 3,
  lowRatingThreshold: 3.0,
};

export function formatPay(amount: number, unit: PayUnit) {
  return `${amount.toLocaleString('en-US')}₮/${PAY_UNITS[unit]}`;
}

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
export function formatDateTime(d: Date | string) {
  const date = new Date(d);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const wdIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return `${get('month')}/${get('day')} ${WEEKDAYS[wdIdx]} ${get('hour')}:${get('minute')}`;
}

export function timeAgo(d: Date | string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'саяхан';
  if (s < 3600) return `${Math.floor(s / 60)} мин өмнө`;
  if (s < 86400) return `${Math.floor(s / 3600)} цагийн өмнө`;
  return `${Math.floor(s / 86400)} өдрийн өмнө`;
}
