'use strict';

const { z } = require('zod');
const { TASK_STATUSES, PRIORITIES, PROJECT_STATUSES } = require('../constants');

// ---------- building blocks ----------
const id = z.coerce.number({ invalid_type_error: 'Invalid id' }).int().positive();

const text = (max, label) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254, 'Email is too long');

// bcrypt only uses the first 72 bytes, so longer passwords are refused instead of silently cut.
const password = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password must be at most 72 bytes');

const emptyToNull = (v) => (v === '' ? null : v);

const dateString = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date format YYYY-MM-DD')
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
    }, 'Enter a valid date')
    .nullable()
);

const nullableId = z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable());

const atLeastOneField = (obj) => Object.keys(obj).length > 0;

// ---------- params ----------
const projectIdParams = z.object({ projectId: id });
const taskIdParams = z.object({ taskId: id });
const projectMemberParams = z.object({ projectId: id, userId: id });
const taskCommentParams = z.object({ taskId: id, commentId: id });
const notificationParams = z.object({ id });

// ---------- auth ----------
const register = z.object({ name: text(100, 'Name'), email, password });
const login = z.object({
  email,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});
const forgotPassword = z.object({ email });
const resetPassword = z.object({ token: z.string().min(10, 'Invalid reset link'), password });

// ---------- users ----------
const updateProfile = z
  .object({
    name: text(100, 'Name').optional(),
    phone: z.preprocess(
      emptyToNull,
      z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number')
        .nullable()
    ).optional(),
  })
  .refine(atLeastOneField, 'Nothing to update');

const changePassword = z.object({
  currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required'),
  newPassword: password,
});

const deleteAccount = z.object({
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

// ---------- projects ----------
const description = z.string().trim().max(2000, 'Description must be at most 2000 characters');

const projectListQuery = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

const projectCreate = z.object({
  title: text(150, 'Title'),
  description: description.optional().default(''),
  status: z.enum(PROJECT_STATUSES).optional(),
  endDate: dateString.optional(),
});

const projectUpdate = z
  .object({
    title: text(150, 'Title').optional(),
    description: description.optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    endDate: dateString.optional(),
    membersCanCreateTasks: z.boolean().optional(),
  })
  .refine(atLeastOneField, 'Nothing to update');

const addMember = z.object({ email });

// ---------- tasks ----------
const taskListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  assignee: z
    .string()
    .regex(/^(me|none|\d+)$/, 'Assignee filter must be "me", "none" or a user id')
    .optional(),
  mine: z.enum(['true', 'false']).optional(),
  due: z.enum(['today', 'week']).optional(),
  sort: z.enum(['board', 'priority', 'dueDate', 'name']).optional().default('board'),
});

const taskDescription = z.string().trim().max(5000, 'Description must be at most 5000 characters');

const taskCreate = z.object({
  title: text(200, 'Title'),
  description: taskDescription.optional().default(''),
  priority: z.enum(PRIORITIES).optional().default('medium'),
  dueDate: dateString.optional(),
  assigneeId: nullableId.optional(),
});

const taskUpdate = z
  .object({
    title: text(200, 'Title').optional(),
    description: taskDescription.optional(),
    priority: z.enum(PRIORITIES).optional(),
    dueDate: dateString.optional(),
    assigneeId: nullableId.optional(),
    blockedReason: z.preprocess(emptyToNull, z.string().trim().max(300).nullable()).optional(),
  })
  .refine(atLeastOneField, 'Nothing to update');

const taskStatusChange = z.object({
  status: z.enum(TASK_STATUSES, { errorMap: () => ({ message: 'Status must be todo, in_progress, done or blocked' }) }),
  blockedReason: z.preprocess(emptyToNull, z.string().trim().max(300).nullable()).optional(),
  position: z.number().int().min(0).optional(),
});

// ---------- comments ----------
const commentBody = z.object({
  text: z
    .string({ required_error: 'Comment text is required' })
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be at most 1000 characters'),
});

// ---------- notifications ----------
const notificationListQuery = z.object({
  unread: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

module.exports = {
  params: { projectIdParams, taskIdParams, projectMemberParams, taskCommentParams, notificationParams },
  auth: { register, login, forgotPassword, resetPassword },
  users: { updateProfile, changePassword, deleteAccount },
  projects: { projectListQuery, projectCreate, projectUpdate, addMember },
  tasks: { taskListQuery, taskCreate, taskUpdate, taskStatusChange },
  comments: { commentBody },
  notifications: { notificationListQuery },
};
