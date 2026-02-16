import { pgTable, uuid, text, bigint, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const diary = pgTable('diary', {
  id: uuid('id').primaryKey().defaultRandom(),
  fecha: text('fecha'),
  situacion: text('situacion'),
  emociones: text('emociones'),
  pensamientos_automaticos: text('pensamientos_automaticos'),
  insight: text('insight'),
  created_at: bigint('created_at', { mode: 'number' }),
});

export const evidences = pgTable('evidences', {
  id: uuid('id').primaryKey().defaultRandom(),
  task_name: text('task_name').notNull(),
  photo_url: text('photo_url').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const diet = pgTable('diet', {
  id: integer('id').primaryKey().default(1),
  plan: jsonb('plan'),
});

export type DiaryRow = InferSelectModel<typeof diary>;
export type DiaryInsert = InferInsertModel<typeof diary>;
export type EvidenceRow = InferSelectModel<typeof evidences>;
export type EvidenceInsert = InferInsertModel<typeof evidences>;
export type DietRow = InferSelectModel<typeof diet>;
export type DietInsert = InferInsertModel<typeof diet>;

/** Column names for the diary table, used by dbService for REST payloads */
export const DIARY_COLUMNS = Object.keys(diary).filter(
  (k) => !k.startsWith('_') && !k.startsWith('$')
) as (keyof DiaryRow)[];
