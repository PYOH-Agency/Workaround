import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  primaryKey,
  unique,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { project } from './project'
import { quote } from './quote'

/**
 * Compteur de sequence, une ligne par entreprise et par annee.
 *
 * La numerotation des factures doit etre **continue et sans trou** : le rang
 * s'obtient en incrementant cette ligne dans la meme transaction que
 * l'insertion de la facture. La reprise sur collision employee pour les devis
 * laisserait un trou en cas d'echec, ce qui est inacceptable pour une facture.
 */
export const invoiceCounter = pgTable(
  'invoice_counter',
  {
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    year: integer('year').notNull(),
    lastSequence: integer('last_sequence').notNull().default(0),
  },
  (t) => [primaryKey({ name: 'invoice_counter_pk', columns: [t.companyId, t.year] })],
)

export const invoice = pgTable(
  'invoice',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id),
    // Une facture decoule toujours d'un devis signe en M2. Nullable pour
    // laisser la porte ouverte a une facture directe plus tard.
    quoteId: uuid('quote_id').references(() => quote.id),
    number: text('number').notNull(),
    type: text('type', { enum: ['deposit', 'progress', 'balance', 'credit_note'] }).notNull(),
    // Un avoir corrige une facture identifiee.
    correctsInvoiceId: uuid('corrects_invoice_id').references((): AnyPgColumn => invoice.id),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    totalExclTax: integer('total_excl_tax').notNull(),
    totalTax: integer('total_tax').notNull(),
    totalInclTax: integer('total_incl_tax').notNull(),
    // Figes a l'emission : une facture est immuable, ses mentions aussi. Un
    // artisan qui change son taux de penalites demain ne doit pas modifier
    // retroactivement une facture deja remise a son client.
    latePaymentRate: text('late_payment_rate').notNull(),
    recoveryIndemnity: integer('recovery_indemnity').notNull(),
    /**
     * Le taux de retenue, **fige a l'emission** comme les autres mentions.
     *
     * Une facture est immuable : un artisan qui modifierait le taux de son
     * devis demain ne doit pas changer retroactivement un document deja remis
     * a son client.
     */
    retentionRate: integer('retention_rate').notNull().default(0),
    operationType: text('operation_type', { enum: ['services', 'goods', 'mixed'] }).notNull(),
    publicToken: text('public_token').notNull().unique(),
  },
  (t) => [
    unique('invoice_number_uq').on(t.companyId, t.number),
    index('invoice_project_idx').on(t.projectId),
    index('invoice_quote_idx').on(t.quoteId),
  ],
)

export const invoiceLine = pgTable('invoice_line', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoice.id),
  position: integer('position').notNull(),
  label: text('label').notNull(),
  unit: text('unit').notNull().default('u'),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unitPriceExclTax: integer('unit_price_excl_tax').notNull(),
  taxRate: integer('tax_rate').notNull(),
})

/**
 * Encaissements.
 *
 * Les artisans sont prestataires de services : la TVA est exigible a
 * l'encaissement, et le e-reporting des donnees de paiement l'exige. Ce n'est
 * pas un confort de gestion.
 */
export const payment = pgTable(
  'payment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoice.id),
    amount: integer('amount').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    method: text('method', { enum: ['transfer', 'check', 'cash', 'card', 'other'] }).notNull(),
    reference: text('reference'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('payment_invoice_idx').on(t.invoiceId)],
)

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
  company: one(company, { fields: [invoice.companyId], references: [company.id] }),
  project: one(project, { fields: [invoice.projectId], references: [project.id] }),
  quote: one(quote, { fields: [invoice.quoteId], references: [quote.id] }),
  lines: many(invoiceLine),
  payments: many(payment),
}))

export const invoiceLineRelations = relations(invoiceLine, ({ one }) => ({
  invoice: one(invoice, { fields: [invoiceLine.invoiceId], references: [invoice.id] }),
}))

export const paymentRelations = relations(payment, ({ one }) => ({
  invoice: one(invoice, { fields: [payment.invoiceId], references: [invoice.id] }),
}))
