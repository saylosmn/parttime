/**
 * Туршилтын өгөгдөл: 3 ажил олгогч, 5 оюутан, 10 зар (+ цөөн өргөдөл).
 * Ажиллуулах: `npm run seed` (.env.local-оос MONGODB_URI уншина).
 * `--reset` өгвөл seed-ээр үүссэн өгөгдлийг устгаад дахин үүсгэнэ.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import mongoose from 'mongoose';
import { Application, Job, Notification, Review, User } from '../models';

const SEED_DOMAIN = '@seed.tsag.mn';
const DAY = 86400_000;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI тохируулаагүй байна (.env.local)');
  await mongoose.connect(uri);
  await Promise.all([User.syncIndexes(), Job.syncIndexes(), Application.syncIndexes(), Notification.syncIndexes(), Review.syncIndexes()]);

  const existing = await User.find({ email: { $regex: `${SEED_DOMAIN.replace('.', '\\.')}$` } }, '_id').lean();
  if (existing.length && !process.argv.includes('--reset')) {
    console.log('Seed өгөгдөл аль хэдийн байна. Дахин үүсгэх бол: npm run seed -- --reset');
    return;
  }
  if (existing.length) {
    const ids = existing.map((u) => u._id);
    const jobs = await Job.find({ employerId: { $in: ids } }, '_id').lean();
    await Promise.all([
      Application.deleteMany({ $or: [{ studentId: { $in: ids } }, { employerId: { $in: ids } }] }),
      Notification.deleteMany({ userId: { $in: ids } }),
      Review.deleteMany({ $or: [{ fromUserId: { $in: ids } }, { toUserId: { $in: ids } }] }),
      Job.deleteMany({ _id: { $in: jobs.map((j) => j._id) } }),
      User.deleteMany({ _id: { $in: ids } }),
    ]);
    console.log('Хуучин seed өгөгдлийг устгалаа');
  }

  const employers = await User.insertMany([
    { email: `talh${SEED_DOMAIN}`, name: 'Сараа', companyName: 'Талх & Кофе', companyDistrict: 'Сүхбаатар', phone: '99112233', role: 'employer', onboarded: true, verified: true, ratingAvg: 4.8, ratingCount: 12 },
    { email: `event${SEED_DOMAIN}`, name: 'Тэмүүжин', companyName: 'Эвент агентлаг', companyDistrict: 'Хан-Уул', phone: '88112233', role: 'employer', onboarded: true, verified: true, ratingAvg: 4.6, ratingCount: 5 },
    { email: `nomin${SEED_DOMAIN}`, name: 'Болд', companyName: 'Номин Супермаркет', companyDistrict: 'Баянзүрх', phone: '95112233', role: 'employer', onboarded: true, verified: false, ratingAvg: 0, ratingCount: 0 },
  ]);
  const [talh, event, nomin] = employers;

  const students = await User.insertMany([
    { email: `bat${SEED_DOMAIN}`, name: 'Бат-Эрдэнэ', school: 'ШУТИС', course: 2, district: 'Баянзүрх', availability: ['weekend'], phone: '99114455', role: 'student', onboarded: true, ratingAvg: 4.9, ratingCount: 6, bio: 'Кофе шопод 3 сар ажилласан.' },
    { email: `nomin.s${SEED_DOMAIN}`, name: 'Номин', school: 'МУИС', course: 3, district: 'Сүхбаатар', availability: ['weekday_evening', 'weekend'], phone: '88114455', role: 'student', onboarded: true, ratingAvg: 5.0, ratingCount: 3 },
    { email: `temuulen${SEED_DOMAIN}`, name: 'Тэмүүлэн', school: 'СЭЗИС', course: 1, district: 'Хан-Уул', availability: ['weekend'], phone: '95114455', role: 'student', onboarded: true },
    { email: `oyun${SEED_DOMAIN}`, name: 'Оюунжаргал', school: 'АШУҮИС', course: 2, district: 'Чингэлтэй', availability: ['weekday_day', 'weekend'], phone: '99554455', role: 'student', onboarded: true, ratingAvg: 4.7, ratingCount: 4 },
    { email: `anar${SEED_DOMAIN}`, name: 'Анар', school: 'МУБИС', course: 4, district: 'Баянгол', availability: ['weekday_evening'], phone: '80114455', role: 'student', onboarded: true },
  ]);

  // Local DEV_LOGIN-д зориулсан админ (ADMIN_EMAILS-д admin@seed.tsag.mn нэмсэн үед л админ эрхтэй)
  await User.create({ email: `admin${SEED_DOMAIN}`, name: 'Админ', role: 'admin', onboarded: true });

  const exp = (d = 30) => new Date(Date.now() + d * DAY);
  const jobs = await Job.insertMany([
    { employerId: talh._id, title: 'Бармены туслах', payAmount: 8000, payUnit: 'hour', district: 'Сүхбаатар', address: '1-р хороо, Их тойруу 12', schedule: 'Бя, Ня 09:00–15:00', tags: ['weekend', 'no_experience'], requirements: ['18+ нас', 'Хамгийн багадаа 2 сар', 'Найрсаг харилцаа'], description: 'Кофе бэлтгэхэд туслах, захиалга авах, ширээ цэвэрлэх. Туршлага шаардлагагүй, эхний өдөр сургана.', status: 'active', isFeatured: true, featuredUntil: exp(7), expiresAt: exp() },
    { employerId: event._id, title: 'Эвентийн туслах ажилтан', payAmount: 60000, payUnit: 'day', district: 'Хан-Уул', schedule: 'Бямба 10:00–18:00', tags: ['weekend'], requirements: ['Биеийн хүчний ажил хийж чадах'], description: 'Хурлын танхимын тохижилт, зочдыг угтах, бүртгэл хөтлөх. Үдийн хоол өгнө.', status: 'active', isUrgent: true, expiresAt: exp(10) },
    { employerId: nomin._id, title: 'Кассчин', payAmount: 7500, payUnit: 'hour', district: 'Баянзүрх', schedule: 'Да–Ба 18:00–22:00', tags: ['evening'], requirements: ['Тооцоонд нарийн'], description: 'Касс дээр худалдан авагчдад үйлчлэх, бараа байршуулах. Оройн ээлж.', status: 'active', expiresAt: exp() },
    { employerId: talh._id, title: 'Хүргэлтийн ажилтан', payAmount: 3500, payUnit: 'task', district: 'Сүхбаатар', schedule: 'Өдөр бүр 11:00–14:00', tags: ['no_experience'], requirements: ['Унадаг дугуйтай бол давуу тал'], description: 'Ойр орчмын оффисууд руу үдийн хоол, кофе хүргэх. Нэг хүргэлт тутамд цалин.', status: 'active', expiresAt: exp() },
    { employerId: event._id, title: 'Туслах багш (англи хэл)', payAmount: 15000, payUnit: 'hour', district: 'Чингэлтэй', schedule: 'Мя, Пү 17:00–19:00', tags: ['evening'], requirements: ['IELTS 6.5+', 'Хүүхэдтэй ажиллах дуртай'], description: 'Бага ангийн хүүхдүүдэд англи хэлний хичээлд туслах, гэрийн даалгавар шалгах.', status: 'active', expiresAt: exp() },
    { employerId: nomin._id, title: 'Бараа байршуулагч', payAmount: 50000, payUnit: 'day', district: 'Баянзүрх', schedule: 'Ня 08:00–16:00', tags: ['weekend', 'no_experience'], requirements: ['18+ нас'], description: 'Агуулахаас бараа татаж тавиур дээр байршуулах, үнийн шошго солих.', status: 'active', expiresAt: exp(1.5) },
    { employerId: event._id, title: 'Сошиал медиа контент бэлтгэгч', payAmount: 400000, payUnit: 'month', district: 'Хан-Уул', schedule: '7 хоногт 10 цаг, уян хатан', tags: ['remote'], requirements: ['Canva ашиглаж чаддаг', 'Портфолио'], description: 'Эвентийн зураг, видеог засварлаж Instagram, Facebook-т постлох. Зайнаас ажиллана.', status: 'active', expiresAt: exp() },
    { employerId: talh._id, title: 'Цэвэрлэгээ (орой)', payAmount: 9000, payUnit: 'hour', district: 'Сүхбаатар', schedule: 'Да, Лх, Ба 21:00–23:00', tags: ['evening'], requirements: [], description: 'Кофе шоп хаагдсаны дараа шал, гал тогооны хэсгийг цэвэрлэх.', status: 'pending', expiresAt: exp() },
    { employerId: nomin._id, title: 'Промоутер', payAmount: 45000, payUnit: 'day', district: 'Баянгол', schedule: 'Бя, Ня 11:00–19:00', tags: ['weekend'], requirements: ['Ярианы чадвар сайн'], description: 'Дэлгүүрт шинэ бүтээгдэхүүний амталгаа хийж, худалдан авагчдад танилцуулах.', status: 'active', expiresAt: exp() },
    { employerId: event._id, title: 'Гэрэл зурагчны туслах', payAmount: 30000, payUnit: 'task', district: 'Хан-Уул', schedule: 'Бямба 14:00–20:00', tags: ['weekend'], requirements: ['Өөрийн камертай бол давуу тал'], description: 'Хуримын зураг авалтад гэрэл барих, тоног төхөөрөмж зөөх.', status: 'pending', expiresAt: exp() },
  ]);

  const [barista, eventJob, cashier] = jobs;
  const [bat, nominS, temuulen, oyun] = students;
  await Application.insertMany([
    { jobId: barista._id, studentId: bat._id, employerId: talh._id, status: 'invited', interviewAt: new Date(Date.now() + 2 * DAY), message: 'Кофе шопод 3 сар ажилласан. Бямба, ням бүтэн өдөр боломжтой.' },
    { jobId: barista._id, studentId: nominS._id, employerId: talh._id, status: 'sent' },
    { jobId: barista._id, studentId: temuulen._id, employerId: talh._id, status: 'sent' },
    { jobId: barista._id, studentId: oyun._id, employerId: talh._id, status: 'viewed' },
    { jobId: eventJob._id, studentId: bat._id, employerId: event._id, status: 'completed', completedAt: new Date() },
    { jobId: cashier._id, studentId: bat._id, employerId: nomin._id, status: 'rejected' },
  ]);

  console.log(`✓ ${employers.length} ажил олгогч, ${students.length} оюутан, ${jobs.length} зар үүслээ`);
  console.log('  Local-д DEV_LOGIN=true үед /login хуудаснаас эдгээр хэрэглэгчээр нэвтэрч болно.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
