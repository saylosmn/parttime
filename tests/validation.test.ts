import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applicationActionSchema,
  applySchema,
  employerProfileSchema,
  jobSchema,
  onboardingSchema,
  reviewSchema,
  studentProfileSchema,
} from '../lib/validators';

const id = '507f1f77bcf86cd799439011';
const student = {
  name: 'Бат', phone: '99112233', school: 'МУИС', course: 2,
  district: 'Баянзүрх', availability: ['weekend'],
};
const employer = {
  name: 'Сараа', phone: '+976 99112233', companyName: 'Талх & Кофе',
  companyDistrict: 'Сүхбаатар',
};
const job = {
  title: 'Баристагийн туслах',
  description: 'Амралтын өдрөөр зочдод үйлчилж, кофе бэлтгэхэд тусална.',
  payAmount: 65000, payUnit: 'day', district: 'Баянзүрх',
  schedule: 'Бя, Ня 09:00–15:00', tags: ['weekend', 'no_experience'],
};

function rejects(schema: { safeParse(input: unknown): { success: boolean } }, value: unknown) {
  assert.equal(schema.safeParse(value).success, false);
}

describe('job input requirements', () => {
  it('accepts a fully specified job and numeric form input', () => {
    assert.equal(jobSchema.parse(job).payAmount, 65000);
    assert.equal(jobSchema.parse({ ...job, payAmount: '65000' }).payAmount, 65000);
  });

  it('requires a positive concrete salary, schedule, and supported district', () => {
    for (const payAmount of [undefined, null, '', 0, -1000, Infinity, 'тохиролцоно']) {
      rejects(jobSchema, { ...job, payAmount });
    }
    for (const schedule of [undefined, '', '   ', 'Цагийг тохиролцоно', 'Negotiable']) {
      rejects(jobSchema, { ...job, schedule });
    }
    for (const district of [undefined, '', 'тохиролцоно', 'Дархан']) {
      rejects(jobSchema, { ...job, district });
    }
  });

  it('rejects structured salary values rather than coercing arrays into money', () => {
    rejects(jobSchema, { ...job, payAmount: ['65000'] });
  });

  it('enforces title and description limits and supported payment/tag values', () => {
    rejects(jobSchema, { ...job, title: 'x'.repeat(81) });
    rejects(jobSchema, { ...job, description: 'x'.repeat(3001) });
    rejects(jobSchema, { ...job, description: '   ' });
    rejects(jobSchema, { ...job, payUnit: 'negotiable' });
    rejects(jobSchema, { ...job, tags: ['admin_featured'] });
    rejects(jobSchema, { ...job, requirements: ['   '] });
  });

  it('strips ownership and moderation fields controlled by the server', () => {
    const parsed = jobSchema.parse({
      ...job, _id: id, employerId: id, status: 'active', isFeatured: true,
      featuredUntil: '2099-01-01', expiresAt: '2099-01-01', broadcastDone: true,
      $set: { status: 'active' },
    });
    for (const field of ['_id', 'employerId', 'status', 'isFeatured', 'featuredUntil', 'expiresAt', 'broadcastDone', '$set']) {
      assert.equal(Object.hasOwn(parsed, field), false, field);
    }
  });
});

describe('onboarding and profile input requirements', () => {
  it('accepts both intended roles and rejects self-registration as admin', () => {
    assert.equal(onboardingSchema.parse({ ...student, role: 'student' }).role, 'student');
    assert.equal(onboardingSchema.parse({ ...employer, role: 'employer' }).role, 'employer');
    rejects(onboardingSchema, { ...student, role: 'admin' });
    rejects(onboardingSchema, student);
  });

  it('requires valid contact information and student availability', () => {
    for (const phone of ['', '9911223', '991122334', '+1 99112233', 'abcdefgh']) {
      rejects(studentProfileSchema, { ...student, phone });
    }
    rejects(studentProfileSchema, { ...student, availability: [] });
    rejects(studentProfileSchema, { ...student, availability: ['whenever'] });
    rejects(studentProfileSchema, { ...student, school: ' ' });
    rejects(employerProfileSchema, { ...employer, companyName: ' ' });
  });

  it('accepts numeric course form input and rejects out-of-range courses', () => {
    assert.equal(studentProfileSchema.parse({ ...student, course: '3' }).course, 3);
    for (const course of [0, 7, 2.5, '', null, undefined]) {
      rejects(studentProfileSchema, { ...student, course });
    }
  });

  it('rejects a boolean as the student course', () => {
    rejects(studentProfileSchema, { ...student, course: true });
    rejects(onboardingSchema, { ...student, role: 'student', course: true });
  });

  it('strips privilege, account ownership, and rating changes from profiles', () => {
    const privileged = {
      _id: id, role: 'admin', email: 'admin@example.com', verified: true,
      banned: false, onboarded: true, ratingAvg: 5, ratingCount: 100,
      $set: { role: 'admin' },
    };
    for (const parsed of [
      studentProfileSchema.parse({ ...student, ...privileged }),
      employerProfileSchema.parse({ ...employer, ...privileged }),
    ]) {
      for (const field of Object.keys(privileged)) {
        assert.equal(Object.hasOwn(parsed, field), false, field);
      }
    }
  });
});

describe('application input requirements', () => {
  it('requires a real-shaped job id and limits the optional message', () => {
    assert.equal(applySchema.parse({ jobId: id, message: 'x'.repeat(500) }).message?.length, 500);
    rejects(applySchema, { jobId: 'not-an-id' });
    rejects(applySchema, { jobId: { $ne: null } });
    rejects(applySchema, { jobId: id, message: 'x'.repeat(501) });
  });

  it('does not accept a caller-selected applicant, employer, or initial status', () => {
    assert.deepEqual(applySchema.parse({
      jobId: id, studentId: id, employerId: id, status: 'completed', completedAt: '2026-01-01',
    }), { jobId: id });
  });

  it('requires a parseable interview date and a meaningful reschedule note', () => {
    assert.ok(applicationActionSchema.parse({ action: 'invite', interviewAt: '2099-01-01T10:00:00+08:00' }));
    rejects(applicationActionSchema, { action: 'invite' });
    rejects(applicationActionSchema, { action: 'invite', interviewAt: 'not-a-date' });
    rejects(applicationActionSchema, { action: 'reschedule', note: ' ' });
    rejects(applicationActionSchema, { action: 'reschedule', note: 'x'.repeat(201) });
    rejects(applicationActionSchema, { action: 'force_complete' });
    assert.deepEqual(applicationActionSchema.parse({ action: 'hire', status: 'completed', studentId: id }), { action: 'hire' });
  });
});

describe('review input requirements', () => {
  it('accepts integer ratings from one to five and a 300-character comment', () => {
    for (const stars of [1, 2, 3, 4, 5]) {
      assert.equal(reviewSchema.parse({ applicationId: id, stars, comment: 'x'.repeat(300) }).stars, stars);
    }
    for (const stars of [0, 6, 3.5, NaN, Infinity, '5', true]) {
      rejects(reviewSchema, { applicationId: id, stars });
    }
    rejects(reviewSchema, { applicationId: id, stars: 5, comment: 'x'.repeat(301) });
    rejects(reviewSchema, { applicationId: 'invalid', stars: 5 });
  });

  it('strips review identity, recipient, direction, and publication fields', () => {
    const parsed = reviewSchema.parse({
      applicationId: id, stars: 5, fromUserId: id, toUserId: id,
      direction: 'employer_to_student', visible: true, createdAt: '2020-01-01',
    });
    assert.deepEqual(parsed, { applicationId: id, stars: 5, tags: [] });
  });
});
