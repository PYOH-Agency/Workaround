import { pgTable, uuid, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { quote, quoteLine } from './quote'
import { invoice } from './invoice'

/**
 * Une situation de travaux : ce que l'artisan DECLARE avoir avance.
 *
 * **Aucun montant n'est stocke ici.** Les euros se recalculent depuis les
 * lignes du devis et les pourcentages — comme le reste a facturer de M2, la
 * visibilite de M3 et les metriques de M5. La situation est la trace d'une
 * declaration, pas la source d'un montant : c'est pourquoi elle peut echouer a
 * s'ecrire sans qu'aucune facture ne devienne fausse.
 *
 * `quote_id` designe la RACINE de la chaine de versions, comme les factures.
 */
export const situation = pgTable(
  'situation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quote.id),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /** Rang dans le chantier : « situation n° 3 ». */
    number: integer('number').notNull(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoice.id),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('situation_quote_idx').on(t.quoteId, t.number)],
)

/**
 * L'avancement declare d'une ligne, **en cumule**.
 *
 * Une ligne appartient a une version precise du devis. Apres un avenant, les
 * lignes sont neuves : le report des pourcentages ne les retrouve pas et
 * affiche 0. Cela ne coute pas un euro — le montant facture ne depend que du
 * cumul declare et de ce qui a deja ete facture. Un report faux coute une
 * ressaisie, jamais une facture fausse.
 */
export const situationLine = pgTable(
  'situation_line',
  {
    situationId: uuid('situation_id')
      .notNull()
      .references(() => situation.id, { onDelete: 'cascade' }),
    quoteLineId: uuid('quote_line_id')
      .notNull()
      .references(() => quoteLine.id, { onDelete: 'cascade' }),
    progressPercent: integer('progress_percent').notNull(),
  },
  (t) => [primaryKey({ name: 'situation_line_pk', columns: [t.situationId, t.quoteLineId] })],
)

export const situationRelations = relations(situation, ({ one, many }) => ({
  invoice: one(invoice, { fields: [situation.invoiceId], references: [invoice.id] }),
  lines: many(situationLine),
}))

export const situationLineRelations = relations(situationLine, ({ one }) => ({
  situation: one(situation, { fields: [situationLine.situationId], references: [situation.id] }),
}))
