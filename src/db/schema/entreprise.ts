import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const entreprise = pgTable('entreprise', {
  id: uuid('id').primaryKey().defaultRandom(),
  siret: text('siret').notNull().unique(),
  raisonSociale: text('raison_sociale').notNull(),
  formeJuridique: text('forme_juridique'),
  adresseLigne1: text('adresse_ligne1'),
  codePostal: text('code_postal'),
  ville: text('ville'),
  dateCreationEntreprise: timestamp('date_creation_entreprise', { withTimezone: true }),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

export const membre = pgTable('membre', {
  id: uuid('id').primaryKey().defaultRandom(),
  entrepriseId: uuid('entreprise_id')
    .notNull()
    .references(() => entreprise.id),
  // Identifiant de l'utilisateur dans auth.users de Supabase.
  utilisateurId: uuid('utilisateur_id').notNull().unique(),
  email: text('email').notNull(),
  nom: text('nom'),
  role: text('role', { enum: ['proprietaire', 'collaborateur'] })
    .notNull()
    .default('proprietaire'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Le logement est PARTAGE entre entreprises : deux artisans intervenant a la
 * meme adresse pointent sur la meme ligne. C'est ce qui rendra possible la vue
 * consolidee du demandeur. L'unicite est portee par l'empreinte calculee dans
 * src/domain/adresse.ts.
 */
export const logement = pgTable(
  'logement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    empreinte: text('empreinte').notNull().unique(),
    adresseLigne1: text('adresse_ligne1').notNull(),
    complement: text('complement'),
    codePostal: text('code_postal').notNull(),
    ville: text('ville').notNull(),
    anneeConstruction: integer('annee_construction'),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('logement_code_postal_idx').on(t.codePostal)],
)

export const entrepriseRelations = relations(entreprise, ({ many }) => ({
  membres: many(membre),
}))

export const membreRelations = relations(membre, ({ one }) => ({
  entreprise: one(entreprise, { fields: [membre.entrepriseId], references: [entreprise.id] }),
}))
