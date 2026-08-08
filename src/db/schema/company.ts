import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const company = pgTable('company', {
  id: uuid('id').primaryKey().defaultRandom(),
  siret: text('siret').notNull().unique(),
  legalName: text('legal_name').notNull(),
  legalForm: text('legal_form'),
  addressLine1: text('address_line1'),
  postalCode: text('postal_code'),
  city: text('city'),
  foundedOn: timestamp('founded_on', { withTimezone: true }),

  // Mentions obligatoires sur un devis de travaux adresse a un particulier
  // (arrete du 24 janvier 2017, Code de la consommation). Nullables en base —
  // l'inscription reste a un seul champ —, mais exigees avant tout devis.
  legalFormLabel: text('legal_form_label'),
  registrationNumber: text('registration_number'),
  phone: text('phone'),
  email: text('email'),
  vatNumber: text('vat_number'),
  // En franchise en base, le devis porte « TVA non applicable, art. 293 B du
  // CGI » au lieu d'un numero.
  vatExempt: boolean('vat_exempt').notNull().default(false),
  quoteValidityDays: integer('quote_validity_days').default(90),
  paymentTerms: text('payment_terms'),

  // Mentions dues entre professionnels (art. L441-9 et D441-5 du Code de
  // commerce). L'indemnite de 40 EUR est fixee par la loi, seul le taux est
  // declare par l'entreprise.
  latePaymentRate: text('late_payment_rate').default('trois fois le taux d’intérêt légal'),
  // Commande l'exigibilite de la TVA : a l'encaissement pour une prestation de
  // services, ce qui declenche le e-reporting des donnees de paiement.
  operationType: text('operation_type', { enum: ['services', 'goods', 'mixed'] })
    .notNull()
    .default('services'),

  // Mentions d'assurance obligatoires sur tout devis et toute facture du
  // batiment (art. L243-2 du Code des assurances). Nullables en base — on
  // n'alourdit pas l'inscription —, mais exigees avant toute emission de devis.
  // Declaratives ici ; M3 les confrontera a l'attestation.
  insurerName: text('insurer_name'),
  insurerAddress: text('insurer_address'),
  policyNumber: text('policy_number'),
  coveredActivities: text('covered_activities'),
  coverageArea: text('coverage_area'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const member = pgTable('member', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id),
  // Identifiant de l'utilisateur dans auth.users de Supabase.
  userId: uuid('user_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role', { enum: ['owner', 'member'] })
    .notNull()
    .default('owner'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Le logement est PARTAGE entre entreprises : deux artisans intervenant a la
 * meme adresse pointent sur la meme ligne. C'est ce qui rendra possible la vue
 * consolidee du demandeur. L'unicite est portee par l'empreinte calculee dans
 * src/domain/address.ts.
 */
export const property = pgTable(
  'property',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fingerprint: text('fingerprint').notNull().unique(),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    postalCode: text('postal_code').notNull(),
    city: text('city').notNull(),
    builtYear: integer('built_year'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('property_postal_code_idx').on(t.postalCode)],
)

export const companyRelations = relations(company, ({ many }) => ({
  members: many(member),
}))

export const memberRelations = relations(member, ({ one }) => ({
  company: one(company, { fields: [member.companyId], references: [company.id] }),
}))
