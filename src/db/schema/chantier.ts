import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { entreprise, logement } from './entreprise'

/**
 * Le client appartient a l'entreprise et n'est jamais partage — contrairement
 * au logement.
 *
 * `type` et `siret` sont collectes des M1 alors qu'ils ne servent qu'en M2 :
 * la nature du client determine l'obligation applicable (e-invoicing pour un
 * professionnel, e-reporting pour un particulier), et une facture B2B exige le
 * SIRET du client. Les ajouter plus tard supposerait de rappeler tous les
 * clients deja saisis.
 */
export const client = pgTable('client', {
  id: uuid('id').primaryKey().defaultRandom(),
  entrepriseId: uuid('entreprise_id')
    .notNull()
    .references(() => entreprise.id),
  nom: text('nom').notNull(),
  email: text('email').notNull(),
  // Obligatoire a l'envoi d'un devis : porte l'identification du signataire par SMS.
  telephone: text('telephone'),
  type: text('type', { enum: ['particulier', 'professionnel'] })
    .notNull()
    .default('particulier'),
  siret: text('siret'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

export const chantier = pgTable('chantier', {
  id: uuid('id').primaryKey().defaultRandom(),
  entrepriseId: uuid('entreprise_id')
    .notNull()
    .references(() => entreprise.id),
  clientId: uuid('client_id')
    .notNull()
    .references(() => client.id),
  logementId: uuid('logement_id')
    .notNull()
    .references(() => logement.id),
  libelle: text('libelle').notNull(),
  statut: text('statut', { enum: ['brouillon', 'en_cours', 'termine', 'abandonne'] })
    .notNull()
    .default('brouillon'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

export const clientRelations = relations(client, ({ one }) => ({
  entreprise: one(entreprise, { fields: [client.entrepriseId], references: [entreprise.id] }),
}))

export const chantierRelations = relations(chantier, ({ one }) => ({
  entreprise: one(entreprise, { fields: [chantier.entrepriseId], references: [entreprise.id] }),
  client: one(client, { fields: [chantier.clientId], references: [client.id] }),
  logement: one(logement, { fields: [chantier.logementId], references: [logement.id] }),
}))
