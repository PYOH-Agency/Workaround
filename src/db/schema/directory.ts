import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { activity } from './verification'

/**
 * Les besoins courants, dans les mots du demandeur.
 *
 * Le referentiel d'activites parle la langue des assureurs — « Menuiseries
 * exterieures ». Le demandeur pense « changer mes fenetres ». Lui demander de
 * traduire, c'est lui demander de connaitre la nomenclature.
 *
 * **Un besoin ne pointe que vers UNE activite.** « Refaire une salle de bain »
 * toucherait quatre corps d'etat ; renvoyer un plombier en laissant croire
 * qu'il fait le tout serait la promesse floue qu'on reproche au secteur. Le
 * multi-corps d'etat demande un sequencage : c'est P6.
 */
export const need = pgTable('need', {
  slug: text('slug').primaryKey(),
  label: text('label').notNull(),
  activityCode: text('activity_code')
    .notNull()
    .references(() => activity.code),
})

/**
 * Plafond anti-abus du formulaire de contact.
 *
 * Volontairement SEPAREE du journal d'evenements, qui est immuable : une
 * empreinte d'adresse IP est une donnee personnelle, et elle doit pouvoir
 * disparaitre. Purgee a 24 h par le travail de fond quotidien.
 */
export const contactThrottle = pgTable(
  'contact_throttle',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Empreinte, jamais l'adresse. */
    ipHash: text('ip_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('contact_throttle_idx').on(t.ipHash, t.createdAt)],
)
