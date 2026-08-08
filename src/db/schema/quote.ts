import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  unique,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { project } from './project'
import { company } from './company'

export const quote = pgTable(
  'quote',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    // Denormalise depuis le chantier : la numerotation est une sequence PAR
    // ENTREPRISE. Sans cette colonne, la contrainte d'unicite serait globale
    // et le deuxieme artisan inscrit ne pourrait jamais creer son D2026-0001.
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    number: text('number').notNull(),
    version: integer('version').notNull().default(1),
    /**
     * La version que celle-ci remplace. `null` sur le devis d'origine.
     *
     * Le chainage permet de remonter a la racine — a laquelle les factures
     * restent attachees — sans avoir a deviner par le numero.
     */
    supersedesQuoteId: uuid('supersedes_quote_id').references((): AnyPgColumn => quote.id),
    status: text('status', { enum: ['draft', 'sent', 'signed', 'refused', 'expired'] })
      .notNull()
      .default('draft'),
    // Engagement de delai en jours ouvres. Obligatoire a l'envoi : sans lui, la
    // metrique « respect du delai annonce » du passeport n'a rien a comparer.
    committedLeadTimeDays: integer('committed_lead_time_days'),
    // Duree de validite figee a la creation : elle doit figurer sur le devis et
    // ne peut pas bouger si l'entreprise change son reglage par la suite.
    validityDays: integer('validity_days').notNull().default(90),
    totalExclTax: integer('total_excl_tax').notNull().default(0),
    totalTax: integer('total_tax').notNull().default(0),
    totalInclTax: integer('total_incl_tax').notNull().default(0),
    publicToken: text('public_token').notNull().unique(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    /**
     * Fin du chantier. Portee par la RACINE de la chaine de versions, comme les
     * factures : un projet peut porter plusieurs devis, et n'aurait alors
     * qu'une seule date pour des chantiers distincts.
     */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /**
     * D'ou vient cette date. `invoiced` — l'emission du solde — est un acte
     * comptable ; `declared` est la parole de l'artisan. L'authentifie l'emporte
     * toujours sur le declare.
     */
    completionSource: text('completion_source', { enum: ['declared', 'invoiced'] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('quote_number_version_uq').on(t.companyId, t.number, t.version),
    index('quote_company_idx').on(t.companyId),
  ],
)

export const quoteLine = pgTable('quote_line', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quote.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  label: text('label').notNull(),
  unit: text('unit').notNull().default('u'),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitPriceExclTax: integer('unit_price_excl_tax').notNull(),
  taxRate: integer('tax_rate').notNull(),
})

/** Code a usage unique envoye par SMS. Le code n'est jamais stocke en clair. */
export const signatureCode = pgTable('signature_code', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quote.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  phone: text('phone').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Piste d'audit de la signature.
 *
 * En signature electronique simple, la presomption de fiabilite de l'article
 * 1367 al. 2 ne s'applique pas : la charge de la preuve pese sur celui qui s'en
 * prevaut. Cette table doit donc etablir separement les trois elements exiges :
 * l'integrite de l'acte, l'identification du signataire, et le lien entre les
 * deux.
 */
export const signature = pgTable('signature', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quote.id)
    .unique(),
  signerName: text('signer_name').notNull(),
  signerEmail: text('signer_email').notNull(),
  signerPhone: text('signer_phone').notNull(),
  // Identification : horodatage de la validation du code SMS.
  codeValidatedAt: timestamp('code_validated_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  // Integrite : empreinte du PDF exact soumis a la signature...
  documentHash: text('document_hash').notNull(),
  // ...et chemin de son archive. Regenerer le PDF depuis un gabarit modifie
  // produirait un document different et invaliderait l'empreinte en silence.
  archivedPdfPath: text('archived_pdf_path').notNull(),
  // Lien : l'empreinte scellee dans un jeton d'horodatage RFC 3161.
  timestampToken: text('timestamp_token'),
  signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
})

export const quoteRelations = relations(quote, ({ one, many }) => ({
  project: one(project, { fields: [quote.projectId], references: [project.id] }),
  lines: many(quoteLine),
  codes: many(signatureCode),
  signature: one(signature),
}))

export const quoteLineRelations = relations(quoteLine, ({ one }) => ({
  quote: one(quote, { fields: [quoteLine.quoteId], references: [quote.id] }),
}))

export const signatureCodeRelations = relations(signatureCode, ({ one }) => ({
  quote: one(quote, { fields: [signatureCode.quoteId], references: [quote.id] }),
}))

export const signatureRelations = relations(signature, ({ one }) => ({
  quote: one(quote, { fields: [signature.quoteId], references: [quote.id] }),
}))
