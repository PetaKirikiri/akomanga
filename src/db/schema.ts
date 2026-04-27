/**
 * Drizzle schema — portal tables align with Pūrākau Supabase (shared project).
 * Migrations: `supabase/migrations/*.sql` then `npm run db:generate` if introspecting; or apply SQL via Supabase CLI.
 */
import {
  bigserial,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

/** Minimal slice — full definition lives in Pūrākau. */
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const appUsers = pgTable('app_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  role: text('role').notNull().default('user'),
  clientId: integer('client_id'),
  authUserId: text('auth_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  clientId: integer('client_id'),
  appUserId: integer('app_user_id').references(() => appUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').notNull(),
  courseId: integer('course_id').references(() => courses.id, { onDelete: 'set null' }),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const classEnrollments = pgTable(
  'class_enrollments',
  {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    classId: integer('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.studentId, t.classId)],
);

/** Per-lesson vocabulary (live Pūrākau DB). Composite FK to course_words exists in Postgres. */
export const courseLessonWords = pgTable('course_lesson_words', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  courseId: integer('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  wordText: text('word_text').notNull(),
  posTypeId: integer('pos_type_id').notNull(),
  lessonNumber: smallint('lesson_number').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const appMeta = pgTable('akomanga_app_meta', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
