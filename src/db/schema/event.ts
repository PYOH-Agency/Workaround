import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

/**
 * Journal append-only.
 *
 * Toutes les metriques du passeport en seront derivees, jamais stockees comme
 * valeur modifiable. C'est ce qui rend le passeport non falsifiable — y compris
 * par nous. L'immuabilite n'est pas une convention : elle est imposee par un
 * declencheur qui refuse UPDATE et DELETE (voir la migration 9001).
 */
export const event = pgTable(
  'event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(),
    companyId: uuid('company_id'),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    actorType: text('actor_type', { enum: ['company', 'customer', 'system'] }).notNull(),
    actorId: text('actor_id'),
    payload: jsonb('payload').notNull().default({}),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('event_company_idx').on(t.companyId, t.occurredAt),
    index('event_subject_idx').on(t.subjectType, t.subjectId),
  ],
)
