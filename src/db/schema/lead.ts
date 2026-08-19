import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'

/**
 * L'evenement de recherche, sans personne dedans.
 *
 * Ni IP, ni session, ni agent : ce qu'on ne collecte pas ne fuit pas. Le cas
 * `covered` est journalise lui aussi, sans quoi l'entonnoir n'a pas de
 * denominateur et on ne peut pas dire quelle part des recherches tombe a vide.
 */
export const verificationLookup = pgTable(
  'verification_lookup',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siret: text('siret').notNull(),
    outcome: text('outcome', {
      enum: ['covered', 'uncovered_member', 'stranger'],
    }).notNull(),
    entry: text('entry', { enum: ['pro', 'demandeur'] }).notNull(),
    lookedUpAt: timestamp('looked_up_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_lookup_at_idx').on(t.lookedUpAt)],
)

/**
 * La demande d'attestation adressee a un artisan.
 *
 * **Aucun statut stocke** : l'etat se recalcule a la lecture, comme la
 * visibilite et les metriques du passeport. Les colonnes datees ne sont pas des
 * etats mais des faits — `registered_at`, `deposited_at` et `covered_at` figent
 * une attribution AVANT l'anonymisation, les deux `*_notified_at` rendent les
 * envois idempotents.
 *
 * `siret` est nullable : a 30 jours il est efface avec les contacts. Chez un
 * entrepreneur individuel — la forme dominante du metier — il designe une
 * personne physique.
 */
export const attestationRequest = pgTable(
  'attestation_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    siret: text('siret'),
    companyId: uuid('company_id'),
    requesterName: text('requester_name'),
    requesterEmail: text('requester_email'),
    artisanEmail: text('artisan_email'),
    channel: text('channel', { enum: ['sent', 'copied'] }).notNull(),
    notify: boolean('notify').notNull().default(false),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    registeredAt: timestamp('registered_at', { withTimezone: true }),
    depositedAt: timestamp('deposited_at', { withTimezone: true }),
    coveredAt: timestamp('covered_at', { withTimezone: true }),
    coveredNotifiedAt: timestamp('covered_notified_at', { withTimezone: true }),
    expiryNotifiedAt: timestamp('expiry_notified_at', { withTimezone: true }),
    anonymizedAt: timestamp('anonymized_at', { withTimezone: true }),
  },
  (t) => [
    index('attestation_request_siret_idx').on(t.siret, t.requestedAt),
    index('attestation_request_artisan_idx').on(t.artisanEmail, t.requestedAt),
    index('attestation_request_requester_idx').on(t.requesterEmail, t.requestedAt),
    index('attestation_request_open_idx').on(t.anonymizedAt, t.requestedAt),
  ],
)

/**
 * Les adresses qui ont demande a ne plus rien recevoir.
 *
 * Sans elle, l'interet legitime ne tient pas : on ecrit a des artisans qui ne
 * nous ont rien demande. Elle survit a l'anonymisation des demandes — c'est
 * tout son interet.
 */
export const mailOptout = pgTable('mail_optout', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
