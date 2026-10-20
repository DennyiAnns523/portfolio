import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

// Reusing `mongoose.models[name]` keeps hot reload from redefining a model.
function model<S extends Schema>(name: string, schema: S): Model<InferSchemaType<S>> {
  type Doc = InferSchemaType<S>;
  return (mongoose.models[name] as Model<Doc> | undefined) ?? mongoose.model<Doc>(name, schema);
}

export const MESSAGE_STATUSES = ['new', 'read', 'archived'] as const;
const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, maxlength: 254 },
    message: { type: String, required: true, maxlength: 4000 },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'new', required: true },
    ipHash: { type: String, required: true },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);
contactMessageSchema.index({ status: 1, createdAt: -1 });
export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessage = model('ContactMessage', contactMessageSchema);

export const IDEA_STATUSES = ['pending', 'approved', 'rejected'] as const;
const ideaSchema = new Schema(
  {
    text: { type: String, required: true, maxlength: 100 },
    status: { type: String, enum: IDEA_STATUSES, default: 'pending', required: true },
    ipHash: { type: String, required: true },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);
ideaSchema.index({ status: 1, createdAt: -1 });
export type IdeaDoc = InferSchemaType<typeof ideaSchema>;
export const Idea = model('Idea', ideaSchema);

// _id is the SHA-256 of the session token; the token itself only ever lives in the cookie.
const sessionSchema = new Schema({
  _id: { type: String, required: true },
  createdAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  ipHash: { type: String, required: true },
  userAgent: { type: String, maxlength: 300 },
});
export const Session = model('Session', sessionSchema);

const rateLimitSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export const RateLimit = model('RateLimit', rateLimitSchema);

export const VISIT_SOURCES = [
  'instagram',
  'linkedin',
  'x',
  'github',
  'facebook',
  'youtube',
  'whatsapp',
  'google',
  'direct',
  'other',
] as const;
export type VisitSource = (typeof VISIT_SOURCES)[number];
// One document per visitor per day. visitorHash rotates daily, so nobody can be followed
// across days, and nothing in it identifies a person.
const visitSchema = new Schema({
  day: { type: String, required: true }, // YYYY-MM-DD, UTC
  visitorHash: { type: String, required: true },
  source: { type: String, enum: VISIT_SOURCES, required: true },
  returning: { type: Boolean, default: false },
  views: { type: Number, default: 1 },
  // Kept for about 13 months.
  firstAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 400 },
});
visitSchema.index({ day: 1, visitorHash: 1 }, { unique: true });
export const Visit = model('Visit', visitSchema);

// Visitors who chose to say who they are. _id is a random id their browser generated; anonymous
// visitors never get a record here.
const namedVisitorSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, maxlength: 40 },
    source: { type: String, enum: VISIT_SOURCES, default: 'direct' },
    visits: { type: Number, default: 1 },
    lastSeenAt: { type: Date, required: true },
  },
  { timestamps: true },
);
namedVisitorSchema.index({ lastSeenAt: -1 });
export const NamedVisitor = model('NamedVisitor', namedVisitorSchema);

export const FEEDBACK_STATUSES = ['new', 'read'] as const;
const feedbackSchema = new Schema(
  {
    comment: { type: String, required: true, maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5 },
    // Snapshot of the visitor's chosen name at the time, if they had given one.
    name: { type: String, maxlength: 40 },
    status: { type: String, enum: FEEDBACK_STATUSES, default: 'new', required: true },
    ipHash: { type: String, required: true },
  },
  { timestamps: true },
);
feedbackSchema.index({ status: 1, createdAt: -1 });
export const Feedback = model('Feedback', feedbackSchema);

export const AUDIT_TYPES = [
  'login_success',
  'login_failed',
  'login_rate_limited',
  'logout',
  'logout_all',
  'spam_dropped',
] as const;
const auditEventSchema = new Schema({
  type: { type: String, enum: AUDIT_TYPES, required: true },
  ipHash: { type: String, required: true },
  detail: { type: String, maxlength: 200 },
  // Kept for 90 days.
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
});
export type AuditType = (typeof AUDIT_TYPES)[number];
export const AuditEvent = model('AuditEvent', auditEventSchema);
