import { Schema, model, models, type InferSchemaType, type Model, type Types } from 'mongoose';

type WithId<T> = T & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };
function mk<S extends Schema>(name: string, schema: S) {
  return (models[name] || model(name, schema)) as Model<InferSchemaType<S>>;
}

/* ---------- User ---------- */
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, default: '' },
    image: String,
    role: { type: String, enum: ['student', 'employer', 'admin', null], default: null },
    onboarded: { type: Boolean, default: false },
    phone: String,
    school: String,
    course: Number,
    district: String,
    availability: [{ type: String, enum: ['weekday_day', 'weekday_evening', 'weekend'] }],
    bio: String,
    companyName: String,
    companyDistrict: String,
    verified: { type: Boolean, default: false },
    banned: { type: Boolean, default: false },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
UserSchema.index({ role: 1, district: 1, availability: 1 });
export const User = mk('User', UserSchema);
export type UserT = WithId<InferSchemaType<typeof UserSchema>>;

/* ---------- Job ---------- */
const JobSchema = new Schema(
  {
    employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 80 },
    description: { type: String, required: true, maxlength: 3000 },
    requirements: { type: [String], default: [] },
    payAmount: { type: Number, required: true, min: 1 },
    payUnit: { type: String, enum: ['hour', 'day', 'task', 'month'], required: true },
    district: { type: String, required: true },
    address: String,
    location: { lat: Number, lng: Number },
    mapUrl: String, // Ажил олгогчийн оруулсан Google Maps холбоос
    schedule: { type: String, required: true },
    tags: [{ type: String, enum: ['weekend', 'evening', 'remote', 'no_experience'] }],
    status: { type: String, enum: ['pending', 'active', 'closed', 'rejected'], default: 'pending' },
    rejectReason: String,
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,
    isUrgent: { type: Boolean, default: false },
    broadcastDone: { type: Boolean, default: false },
    expiryWarned: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ status: 1, district: 1 });
JobSchema.index({ status: 1, expiresAt: 1 });
JobSchema.index({ updatedAt: -1 }); // /api/live
export const Job = mk('Job', JobSchema);
export type JobT = WithId<InferSchemaType<typeof JobSchema>>;

/* ---------- Application ---------- */
const ApplicationSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    message: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['sent', 'viewed', 'invited', 'rejected', 'hired', 'completed'],
      default: 'sent',
    },
    interviewAt: Date,
    interviewResponse: { type: String, enum: ['accepted', 'reschedule', null], default: null },
    rescheduleNote: String,
    completedAt: Date,
  },
  { timestamps: true },
);
ApplicationSchema.index({ jobId: 1, studentId: 1 }, { unique: true });
ApplicationSchema.index({ studentId: 1, createdAt: -1 });
ApplicationSchema.index({ studentId: 1, updatedAt: -1 }); // /api/live
ApplicationSchema.index({ employerId: 1, updatedAt: -1 });
export const Application = mk('Application', ApplicationSchema);
export type ApplicationT = WithId<InferSchemaType<typeof ApplicationSchema>>;

/* ---------- Notification ---------- */
const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '/' },
    meta: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
export const Notification = mk('Notification', NotificationSchema);
export type NotificationT = WithId<InferSchemaType<typeof NotificationSchema>>;

/* ---------- PushSubscription ---------- */
const PushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const PushSubscription = mk('PushSubscription', PushSubscriptionSchema);

/* ---------- Review ---------- */
const ReviewSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    direction: { type: String, enum: ['student_to_employer', 'employer_to_student'], required: true },
    stars: { type: Number, min: 1, max: 5, required: true },
    tags: { type: [String], default: [] },
    comment: { type: String, maxlength: 300 },
    visible: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
ReviewSchema.index({ applicationId: 1, direction: 1 }, { unique: true });
export const Review = mk('Review', ReviewSchema);
export type ReviewT = WithId<InferSchemaType<typeof ReviewSchema>>;

/* ---------- Report (гомдол) ---------- */
const ReportSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true, maxlength: 500 },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const Report = mk('Report', ReportSchema);
