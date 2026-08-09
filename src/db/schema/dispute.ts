import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { company } from './company'
import { quote } from './quote'

/**
 * La contestation d'une mesure du passeport, arbitree par le client.
 *
 * C'est **le client qui tranche**, parce qu'il a co-signe le devis : il est le
 * temoin qui authentifie la mesure, donc le temoin naturel du desaccord. Une
 * revue interne aurait ete moins chere ; elle aurait fait de nous le juge de
 * nos propres chiffres, sur un produit dont l'argument est que la mesure ne
 * repose pas sur notre parole.
 *
 * **Une seule contestation par chantier** — l'unicite est portee ici. Rejouer
 * la meme contestation jusqu'a obtenir une reponse favorable viderait
 * l'arbitrage de son sens.
 */
export const metricDispute = pgTable(
  'metric_dispute',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** La RACINE de la chaine de versions, comme les factures et la fin de chantier. */
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quote.id)
      .unique(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id),
    /** Motive, obligatoire : c'est ce que le client lit avant de repondre. */
    reason: text('reason').notNull(),
    /** Le lien du client, comme pour la signature de M1. Il n'a pas de compte. */
    publicToken: text('public_token').notNull().unique(),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * Quatorze jours. **Passe ce delai, la mesure initiale s'applique** — et
     * cela se deduit a la lecture, sans tache planifiee.
     */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /**
     * `null` tant que le client n'a pas repondu.
     *
     * `expired` n'y figure pas : ce n'est pas un verdict, c'est l'absence de
     * reponse passe une date que cette table porte deja. L'ecrire supposerait
     * une tache planifiee dont la panne laisserait un chantier exclu du calcul
     * sans plus aucune raison.
     */
    verdict: text('verdict', { enum: ['upheld', 'rejected'] }),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
  },
  (t) => [index('metric_dispute_company_idx').on(t.companyId)],
)

/**
 * La declaration complementaire — article 16.
 *
 * Le passeport est **derive et non editable** : l'artisan ne peut pas corriger
 * un fait exact. Mais un droit de rectification qui n'aboutit a rien n'est pas
 * un droit — il doit pouvoir attacher son contexte au chantier.
 *
 * **Elle ne change aucun chiffre.** Aucune metrique ne la lit ; c'est
 * volontaire, et c'est ce qui la distingue de la contestation.
 *
 * Une par chantier, reecrivable : c'est le texte de l'artisan sur lui-meme, pas
 * un fait constate — la regle d'immuabilite du journal ne s'y applique pas.
 */
export const metricStatement = pgTable('metric_statement', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quote.id)
    .unique(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => company.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const metricDisputeRelations = relations(metricDispute, ({ one }) => ({
  quote: one(quote, { fields: [metricDispute.quoteId], references: [quote.id] }),
}))

export const metricStatementRelations = relations(metricStatement, ({ one }) => ({
  quote: one(quote, { fields: [metricStatement.quoteId], references: [quote.id] }),
}))
