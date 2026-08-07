import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'

/**
 * Journal append-only.
 *
 * Toutes les metriques du passeport en seront derivees, jamais stockees comme
 * valeur modifiable. C'est ce qui rend le passeport non falsifiable — y compris
 * par nous. L'immuabilite n'est pas une convention : elle est imposee par un
 * declencheur qui refuse UPDATE et DELETE (voir la migration correspondante).
 */
export const evenement = pgTable(
  'evenement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(),
    entrepriseId: uuid('entreprise_id'),
    sujetType: text('sujet_type').notNull(),
    sujetId: uuid('sujet_id').notNull(),
    acteurType: text('acteur_type', { enum: ['entreprise', 'demandeur', 'systeme'] }).notNull(),
    acteurId: text('acteur_id'),
    payload: jsonb('payload').notNull().default({}),
    horodateLe: timestamp('horodate_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('evenement_entreprise_idx').on(t.entrepriseId, t.horodateLe),
    index('evenement_sujet_idx').on(t.sujetType, t.sujetId),
  ],
)
