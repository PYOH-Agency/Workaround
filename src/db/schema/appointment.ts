import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { project } from './project'

/**
 * Un rendez-vous, pose sur un chantier.
 *
 * **Jamais dans le vide** : sans l'adresse, le client et son numero, ce serait
 * une ligne de calendrier de plus, et elle n'aurait aucune raison d'etre saisie
 * ici plutot que sur son telephone.
 *
 * On **annule**, on ne supprime pas, et on ne deplace pas : un rendez-vous pris
 * puis annule est un fait — le client a ete prevenu que quelqu'un viendrait.
 * Deplacer se fait en annulant et en reprenant, ce qui laisse les deux lisibles.
 */
export const appointment = pgTable(
  'appointment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /**
     * `visit` precede le devis et ouvre le delai de remise ; `work` suit la
     * signature et s'inscrit au fil de chantier.
     */
    kind: text('kind', { enum: ['visit', 'work'] }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: text('status', { enum: ['scheduled', 'cancelled'] })
      .notNull()
      .default('scheduled'),
    note: text('note'),
    /**
     * Horodatage de SAISIE, distinct de `starts_at`.
     *
     * C'est lui qui rend la date non antidatable utilement : un rendez-vous de
     * visite cree apres l'envoi du devis se verrait.
     */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (t) => [
    index('appointment_company_starts_idx').on(t.companyId, t.startsAt),
    index('appointment_project_idx').on(t.projectId),
  ],
)

export const appointmentRelations = relations(appointment, ({ one }) => ({
  project: one(project, { fields: [appointment.projectId], references: [project.id] }),
}))
